import type { Express, Request, Response } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { ENV } from "./env";
import { sdk } from "./sdk";
import { enforceRateLimit } from "./rate-limit";
import { getDb, getWorkspaceMembership } from "../db";
import { connectors } from "../../drizzle/schema";

const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_USERINFO_URL = "https://open.tiktokapis.com/v2/user/info/";
const STATE_TTL_MS = 10 * 60 * 1000;

function signState(payload: string): string {
  const sig = createHmac("sha256", ENV.cookieSecret || "insecure-fallback").update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
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
    if (!ENV.tiktok.clientKey || !ENV.tiktok.redirectUri) {
      res.status(503).json({ error: "TikTok Login Kit is not configured." });
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
        res.status(403).json({ error: "You do not have access to this workspace." });
        return;
      }
    } catch {
      res.status(401).json({ error: "Not authenticated." });
      return;
    }
    const state = signState(`${workspaceId}:${Date.now()}`);
    const url = new URL(TIKTOK_AUTH_URL);
    url.searchParams.set("client_key", ENV.tiktok.clientKey);
    url.searchParams.set("redirect_uri", ENV.tiktok.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", ENV.tiktok.scopes || "user.info.basic");
    url.searchParams.set("state", state);
    res.redirect(302, url.toString());
  });

  app.get("/api/oauth/tiktok/callback", async (req: Request, res: Response) => {
    if (!(await enforceRateLimit(req, res, { bucket: "oauth.tiktok.callback", maxRequests: 20, windowMs: 10 * 60 * 1000 }))) return;
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const stateRaw = typeof req.query.state === "string" ? req.query.state : undefined;
    if (!code || !stateRaw) {
      res.status(400).send("Missing code or state.");
      return;
    }
    const state = verifyState(stateRaw);
    if (!state) {
      res.status(400).send("Invalid or expired state.");
      return;
    }
    if (!ENV.tiktok.clientKey || !ENV.tiktok.clientSecret || !ENV.tiktok.redirectUri) {
      res.status(503).send("TikTok Login Kit is not configured.");
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
      const tokenJson = (await tokenResp.json()) as { access_token?: string; open_id?: string; error?: string };
      if (!tokenResp.ok || !tokenJson.access_token) {
        console.error("[TikTok OAuth] Token exchange failed", tokenJson);
        res.status(400).send("TikTok authorization failed.");
        return;
      }
      const userResp = await fetch(`${TIKTOK_USERINFO_URL}?fields=open_id,display_name,avatar_url`, {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      });
      const userJson = (await userResp.json()) as { data?: { user?: { open_id?: string; display_name?: string; avatar_url?: string } } };
      const info = userJson.data?.user ?? {};

      const db = await getDb();
      if (db) {
        const metadata = { openId: info.open_id ?? tokenJson.open_id ?? null, displayName: info.display_name ?? null, avatarUrl: info.avatar_url ?? null };
        await db
          .insert(connectors)
          .values({
            workspaceId: state.workspaceId,
            provider: "tiktok",
            status: "connected",
            scopes: [ENV.tiktok.scopes || "user.info.basic"],
            metadata,
            connectedAt: new Date(),
          })
          .onDuplicateKeyUpdate({
            set: { status: "connected", scopes: [ENV.tiktok.scopes || "user.info.basic"], metadata, connectedAt: new Date() },
          });
      }

      const redirectBase = ENV.webPreviewUrl ? ENV.webPreviewUrl.replace(/\/$/, "") : "";
      res.redirect(302, `${redirectBase}/(tabs)/connect?tiktok=connected`);
    } catch (error) {
      console.error("[TikTok OAuth] Callback failed", error);
      res.status(500).send("TikTok authorization failed unexpectedly.");
    }
  });
}
