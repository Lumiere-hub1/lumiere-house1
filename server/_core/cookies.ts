import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");

  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}

/**
 * Hosts whose registrable domain is one label deeper than the naive "last two
 * labels" rule, because the second-to-last label is itself a public suffix.
 *
 * A cookie may not set Domain to a public suffix: browsers reject such a
 * Set-Cookie outright, so the session silently fails to persist. Deriving the
 * domain as "last two labels" produced exactly that on Vercel —
 * "lumiere-house1.vercel.app" yielded ".vercel.app", which is on the Public
 * Suffix List, so the session cookie was dropped by the browser on every
 * signup and login. The app then saw no session and rendered the landing page,
 * which reads as being bounced back to the signup screen.
 *
 * This is not a complete Public Suffix List, and it does not need to be: the
 * default below is a host-only cookie, which is correct whenever the API and
 * the app share an origin — as they do here, since Express serves both.
 */
const PUBLIC_SUFFIXES = new Set([
  "vercel.app",
  "github.io",
  "pages.dev",
  "netlify.app",
  "herokuapp.com",
  "onrender.com",
  "fly.dev",
  "workers.dev",
  "web.app",
  "firebaseapp.com",
  "azurewebsites.net",
  "cloudfront.net",
  "ngrok.io",
  "ngrok-free.app",
  "trycloudflare.com",
]);

/**
 * The domain to scope the session cookie to, or undefined for a host-only
 * cookie (the safe default).
 *
 * A shared parent domain is only needed when the app and API are served from
 * different subdomains — the original Manus preview setup, where port 3000 and
 * port 8081 were separate hosts. That is opt-in via SESSION_COOKIE_DOMAIN
 * rather than guessed, because guessing wrong breaks authentication silently.
 */
function getCookieDomain(hostname?: string): string | undefined {
  const configured = process.env.SESSION_COOKIE_DOMAIN?.trim();
  if (configured) return configured;

  if (!hostname) return undefined;
  if (LOCAL_HOSTS.has(hostname) || isIpAddress(hostname)) return undefined;

  return undefined;
}

/** Exported for tests: is this hostname one whose registrable domain is a public suffix? */
export function isPublicSuffixDomain(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length < 2) return false;
  return PUBLIC_SUFFIXES.has(parts.slice(-2).join("."));
}

/**
 * How long a session cookie survives. Matches the 30 days that
 * db.createSession gives the session row it points at, so the cookie and the
 * server-side session expire together rather than one outliving the other.
 */
export const SESSION_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function getSessionCookieOptions(
  req: Request,
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure" | "maxAge"> {
  const secure = isSecureRequest(req);
  const crossOrigin = Boolean(process.env.SESSION_COOKIE_DOMAIN?.trim());

  return {
    domain: getCookieDomain(req.hostname),
    httpOnly: true,
    path: "/",
    // Without maxAge this is a SESSION cookie: the browser discards it when it
    // closes. The client also keeps a bearer token in AsyncStorage, which does
    // NOT expire, so every tRPC call kept working and the app kept showing the
    // user as signed in — while any plain navigation to an authenticated route
    // arrived with no credential at all. That is what "Not authenticated" on
    // Connect TikTok was: a browser restart, not a logged-out user. The
    // OAuth-login path in oauth.ts always set maxAge; these two did not.
    maxAge: SESSION_COOKIE_MAX_AGE_MS,
    // Lax, not None. The app and the API share an origin, so None buys nothing
    // and costs something: it marks the cookie as third-party-capable, which
    // browsers with third-party cookie restrictions treat far more harshly.
    // Lax is still sent on top-level GET navigations — including TikTok's
    // redirect back to our callback — which is exactly what this flow needs.
    // None is reserved for the genuinely cross-origin deployment, which is
    // opt-in through SESSION_COOKIE_DOMAIN and requires Secure to be accepted.
    sameSite: crossOrigin && secure ? "none" : "lax",
    secure,
  };
}
