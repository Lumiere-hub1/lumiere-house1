/**
 * Builds an absolute, browser-reachable URL back into this app.
 *
 * Two callers need this and they must agree: the verification emails in
 * routers.ts, and the TikTok OAuth callback, which has to send the browser
 * somewhere real after TikTok redirects back. Deriving it from the request
 * means local development and preview deployments work with no configuration,
 * while APP_BASE_URL pins it when a deployment sits behind something that
 * rewrites Host.
 */
import { ENV } from "./env";

type UrlSource = {
  protocol?: string;
  get?: (name: string) => string | undefined;
  headers: Record<string, string | string[] | undefined>;
};

export function buildAppUrl(req: UrlSource, path: string): string {
  if (ENV.appBaseUrl) return `${ENV.appBaseUrl.replace(/\/$/, "")}${path}`;
  // Vercel terminates TLS at the edge, so the request the function sees is
  // plain http against an internal host. The x-forwarded-* pair is the only
  // record of what the browser actually asked for; without it every link in
  // an email and every OAuth return would point at http:// and an internal
  // hostname. Both headers can carry a comma-separated chain — the first
  // entry is the original client-facing value.
  const forwardedHost = req.headers["x-forwarded-host"];
  const host =
    (typeof forwardedHost === "string" ? forwardedHost.split(",")[0].trim() : undefined) ||
    req.get?.("host") ||
    (typeof req.headers.host === "string" ? req.headers.host : "");
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol =
    (typeof forwardedProto === "string" ? forwardedProto.split(",")[0].trim() : undefined) ||
    req.protocol ||
    "https";
  return `${protocol}://${host}${path}`;
}
