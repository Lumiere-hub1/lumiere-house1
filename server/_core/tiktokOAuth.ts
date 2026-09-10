import type { Express, Request, Response } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { buildAppUrl } from "./app-url";
import { ENV } from "./env";
import { sdk } from "./sdk";
import { enforceRateLimit } from "./rate-limit";
import { SecretsUnavailableError } from "./secrets";
import { getWorkspaceMembership, saveConnectorConnection } from "../db";

const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_USERINFO_URL = "https://open.tiktokapis.com/v2/user/info/";
export const TIKTOK_REVOKE_URL = "https://open.tiktokapis.com/v2/oauth/revoke/";
const STATE_TTL_MS = 10 * 60 * 1000;

/**
 * Where the browser lands after TikTok sends it back.
 *
 * This used to be `/(tabs)/connect`, hardcoded and prefixed with
 * EXPO_WEB_PREVIEW_URL. Both halves were wrong: the Connect screen moved out
 * of the tab group and is now the top-level route /connect, and
 * EXPO_WEB_PREVIEW_URL is unset in production, so the prefix was empty. A
 * successful authorization landed the user on a 404 — the flow completed in
 * the database and looked broken to the person doing it.
 */
const CONNECT_SCREEN_PATH = "/connect";

function connectScreenUrl(req: Request, params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString();
  return buildAppUrl(req, `${CONNECT_SCREEN_PATH}?${query}`);
}

function signState(payload: string): string {
  const sig = createHmac("sha256", ENV.cookieSecret || "insecure-fallback").update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

/**
 * The URL that sends a browser to TikTok's authorization screen.
 *
 * Exported so connectors.connect can hand it straight to the client. That
 * matters: the client reaches tRPC with an Authorization header, but a
 * `window.location.href` navigation carries only cookies. Routing the button
 * through our own /api/oauth/tiktok/start meant the flow depended on the
 * session cookie surviving, and when it did not the user was bounced with
 * "Not authenticated" while being, by every other measure, logged in.
 *
 * Going straight to TikTok removes that hop and the dependency with it. The
 * state is still minted and signed here, on the server, by the same code the
 * callback verifies against.
 */
export function buildTikTokAuthorizeUrl(workspaceId: number): string {
  if (!ENV.tiktok.clientKey || !ENV.tiktok.redirectUri) {
    throw new Error("TikTok Login Kit is not configured.");
  }
  const url = new URL(TIKTOK_AUTH_URL);
  url.searchParams.set("client_key", ENV.tiktok.clientKey);
  url.searchParams.set("redirect_uri", ENV.tiktok.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", ENV.tiktok.scopes || "user.info.basic");
  url.searchParams.set("state", signState(`${workspaceId}:${Date.now()}`));
  return url.toString();
}

function verifyState(state: string): { workspaceId: number } | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const lastDot = decoded.lastIndexOf(".");
    if (lastDot === -1) return null;
    const payload = decoded.slice(0, lastDot);
    const sig = decoded.slice(lastDot + 1);
    const expected = createHmac("sha256", ENV.cookieSecret || "insecure-fallback").update(payload).digest("hex");
    const sigBuf = Buffer.from(sig, "utf8");
    const expBuf = Buffer.from(expected, "utf8");
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
    const [workspaceIdStr, tsStr] = payload.split(":");
    const workspaceId = Number(workspaceIdStr);
    const ts = Number(tsStr);
    if (!Number.isFinite(workspaceId) || !Number.isFinite(ts)) return null;
    if (Date.now() - ts > STATE_TTL_MS) return null;
    return { workspaceId };
  } catch {
    return null;
  }
}

export function registerTikTokOAuthRoutes(app: Express) {
  app.get("/api/oauth/tiktok/start", async (req: Request, res: Response) => {
    if (!(await enforceRateLimit(req, res, { bucket: "oauth.tiktok.start", maxRequests: 10, windowMs: 10 * 60 * 1000 }))) return;
    // The browser navigates here directly, so these are full page loads. Every
    // failure redirects back into the app rather than rendering raw JSON at an
    // /api/ URL — except a missing workspaceId, which is a caller bug rather
    // than something a user can resolve on the Connect screen.
    if (!ENV.tiktok.clientKey || !ENV.tiktok.redirectUri) {
      res.redirect(302, connectScreenUrl(req, { tiktok: "error", reason: "not_configured" }));
      return;
    }
    const workspaceIdRaw = req.query.workspaceId;
    const workspaceId = typeof workspaceIdRaw === "string" ? Number(workspaceIdRaw) : NaN;
    if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
      res.status(400).json({ error: "workspaceId is required." });
      return;
    }
    try {
      const user = await sdk.authenticateRequest(req);
      const membership = await getWorkspaceMembership(user.id, workspaceId);
      if (!membership) {
        res.redirect(302, connectScreenUrl(req, { tiktok: "error", reason: "no_access" }));
        return;
      }
      // Connecting a social account on behalf of a workspace is an owner or
      // admin action, matching connectors.connect. Without this check the tRPC
      // guard would be bypassable by navigating to this URL directly.
      if (membership.membership.role !== "owner" && membership.membership.role !== "admin") {
        res.redirect(302, connectScreenUrl(req, { tiktok: "error", reason: "no_access" }));
        return;
      }
    } catch {
      res.redirect(302, connectScreenUrl(req, { tiktok: "error", reason: "signed_out" }));
      return;
    }
    res.redirect(302, buildTikTokAuthorizeUrl(workspaceId));
  });

  app.get("/api/oauth/tiktok/callback", async (req: Request, res: Response) => {
    if (!(await enforceRateLimit(req, res, { bucket: "oauth.tiktok.callback", maxRequests: 20, windowMs: 10 * 60 * 1000 }))) return;
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const stateRaw = typeof req.query.state === "string" ? req.query.state : undefined;

    // Declining on TikTok's authorization screen is a normal thing to do, and
    // it comes back here as ?error=access_denied with no code at all. Treated
    // as "missing code" it rendered bare text at an /api/ URL — a dead end
    // reached by tapping Cancel, with no way back into the app.
    const providerError = typeof req.query.error === "string" ? req.query.error : undefined;
    if (providerError) {
      console.error(JSON.stringify({ event: "tiktok_authorization_declined", error: providerError }));
      res.redirect(302, connectScreenUrl(req, { tiktok: "error", reason: providerError === "access_denied" ? "declined" : "exchange_failed" }));
      return;
    }

    if (!code || !stateRaw) {
      res.redirect(302, connectScreenUrl(req, { tiktok: "error", reason: "unexpected" }));
      return;
    }
    const state = verifyState(stateRaw);
    if (!state) {
      // Every failure below sends the browser back into the app with a reason
      // rather than rendering bare text at an /api/ URL. The person finishing
      // an authorization is in a browser, mid-flow — a white page reading
      // "Invalid or expired state." tells them nothing they can act on.
      res.redirect(302, connectScreenUrl(req, { tiktok: "error", reason: "expired" }));
      return;
    }
    if (!ENV.tiktok.clientKey || !ENV.tiktok.clientSecret || !ENV.tiktok.redirectUri) {
      res.redirect(302, connectScreenUrl(req, { tiktok: "error", reason: "not_configured" }));
      return;
    }
    try {
      const tokenResp = await fetch(TIKTOK_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
        body: new URLSearchParams({
          client_key: ENV.tiktok.clientKey,
          client_secret: ENV.tiktok.clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: ENV.tiktok.redirectUri,
        }),
      });
      const tokenJson = (await tokenResp.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        refresh_expires_in?: number;
        open_id?: string;
        scope?: string;
        error?: string;
        error_description?: string;
      };
      if (!tokenResp.ok || !tokenJson.access_token) {
        // Structured, and deliberately without the token or the code in it.
        console.error(JSON.stringify({ event: "tiktok_token_exchange_failed", status: tokenResp.status, error: tokenJson.error, description: tokenJson.error_description }));
        res.redirect(302, connectScreenUrl(req, { tiktok: "error", reason: "exchange_failed" }));
        return;
      }

      // Profile details are a nicety: they make the Connected state say who is
      // connected. A failure here must not lose a token we already hold, so it
      // degrades to an unnamed connection rather than failing the callback.
      let info: { open_id?: string; display_name?: string; avatar_url?: string } = {};
      try {
        const userResp = await fetch(`${TIKTOK_USERINFO_URL}?fields=open_id,display_name,avatar_url`, {
          headers: { Authorization: `Bearer ${tokenJson.access_token}` },
        });
        const userJson = (await userResp.json()) as { data?: { user?: typeof info } };
        info = userJson.data?.user ?? {};
      } catch (error) {
        console.error(JSON.stringify({ event: "tiktok_userinfo_failed", error: error instanceof Error ? error.message : "unknown" }));
      }

      const now = Date.now();
      await saveConnectorConnection({
        workspaceId: state.workspaceId,
        provider: "tiktok",
        displayName: info.display_name ?? null,
        avatarUrl: info.avatar_url ?? null,
        externalAccountId: info.open_id ?? tokenJson.open_id ?? null,
        // TikTok returns the scopes it actually granted, which can be narrower
        // than the ones asked for. Record what was granted, not what was
        // requested, or the app will later assume access it does not have.
        scopes: (tokenJson.scope ?? ENV.tiktok.scopes ?? "user.info.basic").split(",").map((scope) => scope.trim()).filter(Boolean),
        accessToken: tokenJson.access_token,
        refreshToken: tokenJson.refresh_token ?? null,
        accessTokenExpiresAt: tokenJson.expires_in ? new Date(now + tokenJson.expires_in * 1000) : null,
        refreshTokenExpiresAt: tokenJson.refresh_expires_in ? new Date(now + tokenJson.refresh_expires_in * 1000) : null,
      });

      res.redirect(302, connectScreenUrl(req, { tiktok: "connected" }));
    } catch (error) {
      console.error(JSON.stringify({ event: "tiktok_callback_failed", error: error instanceof Error ? error.message : "unknown" }));
      // A server with no JWT_SECRET cannot encrypt the token, so the
      // connection is refused rather than stored in the clear. It is worth its
      // own reason: the symptom is a completed TikTok login that mysteriously
      // does not stick, and "something went wrong" would send whoever hits it
      // looking in entirely the wrong place.
      const reason = error instanceof SecretsUnavailableError ? "storage_unavailable" : "unexpected";
      res.redirect(302, connectScreenUrl(req, { tiktok: "error", reason }));
    }
  });
}
