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

export function getSessionCookieOptions(
  req: Request,
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);

  return {
    domain: getCookieDomain(req.hostname),
    httpOnly: true,
    path: "/",
    // SameSite=None requires Secure; browsers reject the pair without it, which
    // would break local http development the same way the domain broke
    // production. Lax is the correct same-origin default anyway.
    sameSite: secure ? "none" : "lax",
    secure,
  };
}
