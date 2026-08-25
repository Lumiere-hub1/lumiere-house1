import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import type { Express, Request, Response } from "express";
import { consumeOAuthState, createOAuthState, getUserByOpenId, upsertUser, recordWebhookReceipt } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV, getRuntimeDiagnostics } from "./env";
import { sdk } from "./sdk";
import { enforceRateLimit } from "./rate-limit";
import { verifyTikTokWebhookSignature } from "./webhooks";
import { createHash } from "crypto";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function requestOrigin(req: Request): string {
  const forwardedProto = String(req.headers["x-forwarded-proto"] ?? req.protocol).split(",")[0].trim();
  return `${forwardedProto}://${req.get("host")}`;
}

export function isAllowedRedirectUri(req: Request, redirectUri: string): boolean {
  try {
    const parsed = new URL(redirectUri);
    if (/^manus[a-z0-9+.-]*:$/.test(parsed.protocol)) return parsed.pathname === "/oauth/callback";
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.origin === requestOrigin(req) && parsed.pathname === "/api/oauth/callback"
      : false;
  } catch {
    return false;
  }
}

function getFrontendRedirect(req: Request): string {
  if (ENV.webPreviewUrl) return ENV.webPreviewUrl.replace(/\/$/, "");
  const origin = requestOrigin(req);
  try {
    const url = new URL(origin);
    if (url.hostname.startsWith("3000-")) url.hostname = url.hostname.replace(/^3000-/, "8081-");
    return url.toString().replace(/\/$/, "");
  } catch {
    return origin;
  }
}

async function syncUser(userInfo: { openId?: string | null; name?: string | null; email?: string | null; loginMethod?: string | null; platform?: string | null }) {
  if (!userInfo.openId) throw new Error("openId missing from user info");
  const lastSignedIn = new Date();
  await upsertUser({ openId: userInfo.openId, name: userInfo.name || null, email: userInfo.email ?? null, loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null, lastSignedIn });
  return (await getUserByOpenId(userInfo.openId)) ?? { openId: userInfo.openId, name: userInfo.name, email: userInfo.email, loginMethod: userInfo.loginMethod ?? null, lastSignedIn };
}

function buildUserResponse(user: any) {
  return {
    id: user?.id ?? null,
    openId: user?.openId ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    loginMethod: user?.loginMethod ?? null,
    lastSignedIn: (user?.lastSignedIn ?? new Date()).toISOString(),
  };
}

async function exchangeAndCreateSession(code: string, state: string) {
  const oauthState = await consumeOAuthState(state, "manus");
  if (!oauthState) throw new Error("Invalid, expired, or already-consumed OAuth state");
  const tokenResponse = await sdk.exchangeCodeForToken(code, oauthState.redirectUri);
  const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
  const user = await syncUser(userInfo);
  const sessionToken = await sdk.createSessionToken(userInfo.openId!, { name: userInfo.name || "", expiresInMs: ONE_YEAR_MS });
  return { user, sessionToken };
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/start", async (req: Request, res: Response) => {
    if (!(await enforceRateLimit(req, res, { bucket: "oauth.start", maxRequests: 10, windowMs: 10 * 60 * 1000 }))) return;
    const redirectUri = getQueryParam(req, "redirect_uri");
    if (!redirectUri || !isAllowedRedirectUri(req, redirectUri)) {
      res.status(400).json({ error: "Invalid OAuth redirect URI" });
      return;
    }
    if (!ENV.oAuthPortalUrl || !ENV.appId) {
      res.status(503).json({ error: "OAuth is not configured" });
      return;
    }
    try {
      const { state } = await createOAuthState({ redirectUri });
      const loginUrl = new URL(`${ENV.oAuthPortalUrl.replace(/\/$/, "")}/app-auth`);
      loginUrl.searchParams.set("appId", ENV.appId);
      loginUrl.searchParams.set("redirectUri", redirectUri);
      loginUrl.searchParams.set("state", state);
      loginUrl.searchParams.set("type", "signIn");
      res.json({ loginUrl: loginUrl.toString() });
    } catch (error) {
      console.error("[OAuth] Start failed", error);
      res.status(503).json({ error: "OAuth state storage unavailable" });
    }
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    if (!(await enforceRateLimit(req, res, { bucket: "oauth.callback", maxRequests: 20, windowMs: 10 * 60 * 1000 }))) return;
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const { user, sessionToken } = await exchangeAndCreateSession(code, state);
      res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      res.redirect(302, getFrontendRedirect(req));
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(400).json({ error: "OAuth callback failed" });
    }
  });

  app.get("/api/oauth/mobile", async (req: Request, res: Response) => {
    if (!(await enforceRateLimit(req, res, { bucket: "oauth.mobile", maxRequests: 20, windowMs: 10 * 60 * 1000 }))) return;
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const { user, sessionToken } = await exchangeAndCreateSession(code, state);
      res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      res.json({ app_session_id: sessionToken, user: buildUserResponse(user) });
    } catch (error) {
      console.error("[OAuth] Mobile exchange failed", error);
      res.status(400).json({ error: "OAuth mobile exchange failed" });
    }
  });

  app.post("/api/webhooks/tiktok", async (req: Request, res: Response) => {
    if (!ENV.tiktok.clientSecret) {
      res.status(503).json({ error: "TikTok webhook verification is not configured." });
      return;
    }
    if (!(await enforceRateLimit(req, res, { bucket: "webhook.tiktok", maxRequests: 120, windowMs: 60 * 1000 }))) return;
    const rawBody = String((req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body ?? {}));
    const verification = verifyTikTokWebhookSignature(rawBody, req.header("TikTok-Signature") ?? undefined, ENV.tiktok.clientSecret);
    if (!verification.ok) {
      console.error(JSON.stringify({ event: "webhook_rejected", provider: "tiktok", requestId: res.getHeader("X-Request-Id"), reason: verification.reason }));
      res.status(401).json({ error: "Invalid webhook signature." });
      return;
    }
    const eventId = typeof req.body?.event_id === "string" ? req.body.event_id : typeof req.body?.id === "string" ? req.body.id : undefined;
    if (!eventId) {
      res.status(400).json({ error: "Webhook event id is required." });
      return;
    }
    const receipt = await recordWebhookReceipt({ provider: "tiktok", eventId, signatureHash: createHash("sha256").update(verification.signature).digest("hex"), expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), metadata: { eventType: typeof req.body?.event_type === "string" ? req.body.event_type : "unknown" } });
    if (receipt.duplicate) {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }
    res.status(200).json({ received: true });
  });

  app.get("/api/system/diagnostics", (_req: Request, res: Response) => {
    res.json({ diagnostics: getRuntimeDiagnostics() });
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    if (!(await enforceRateLimit(req, res, { bucket: "auth.logout", maxRequests: 30, windowMs: 10 * 60 * 1000 }))) return;
    const authHeader = req.headers.authorization;
    const token = typeof authHeader === "string" && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;
    if (token?.startsWith("lh_")) {
      const { revokeSession } = await import("../db");
      await revokeSession(token);
    }
    res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(req), maxAge: -1 });
    res.json({ success: true });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/me failed:", error);
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });

  app.post("/api/auth/session", async (req: Request, res: Response) => {
    if (!(await enforceRateLimit(req, res, { bucket: "auth.session", maxRequests: 20, windowMs: 10 * 60 * 1000 }))) return;
    try {
      const user = await sdk.authenticateRequest(req);
      const authHeader = req.headers.authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(400).json({ error: "Bearer token required" });
        return;
      }
      const token = authHeader.slice("Bearer ".length).trim();
      res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/session failed:", error);
      res.status(401).json({ error: "Invalid token" });
    }
  });
}
