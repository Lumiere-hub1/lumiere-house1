import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { SESSION_COOKIE_MAX_AGE_MS, getSessionCookieOptions, isPublicSuffixDomain } from "../server/_core/cookies";

function req(hostname: string, protocol: "http" | "https" = "https"): Request {
  return { hostname, protocol, headers: {} } as unknown as Request;
}

describe("session cookie scoping", () => {
  it("never scopes the cookie to a public suffix", () => {
    // The regression this guards: ".vercel.app" is a public suffix, so a
    // Set-Cookie carrying it is rejected outright and the session silently
    // never persists.
    const options = getSessionCookieOptions(req("lumiere-house1.vercel.app"));
    expect(options.domain).toBeUndefined();
  });

  it("recognises the public suffixes that broke this", () => {
    expect(isPublicSuffixDomain("lumiere-house1.vercel.app")).toBe(true);
    expect(isPublicSuffixDomain("anything.pages.dev")).toBe(true);
    expect(isPublicSuffixDomain("app.mycompany.com")).toBe(false);
  });

  it("issues a host-only cookie for a normal domain", () => {
    expect(getSessionCookieOptions(req("app.lumiere.example")).domain).toBeUndefined();
  });

  it("issues a host-only cookie on localhost", () => {
    expect(getSessionCookieOptions(req("localhost", "http")).domain).toBeUndefined();
  });

  it("honours an explicitly configured cookie domain", () => {
    process.env.SESSION_COOKIE_DOMAIN = ".lumiere.example";
    try {
      expect(getSessionCookieOptions(req("app.lumiere.example")).domain).toBe(".lumiere.example");
    } finally {
      delete process.env.SESSION_COOKIE_DOMAIN;
    }
  });

  it("defaults to SameSite=Lax, because the app and API share an origin", () => {
    // Previously this was None whenever the request was secure, which confused
    // "is this HTTPS" with "is this cross-site". None marks the cookie as
    // third-party-capable and invites browsers with third-party cookie
    // restrictions to drop it, for no benefit on a same-origin deployment.
    // Lax is still sent on top-level GET navigations — TikTok's redirect back
    // to our callback among them — which is all this flow needs.
    const secure = getSessionCookieOptions(req("lumiere-house1.vercel.app", "https"));
    expect(secure.secure).toBe(true);
    expect(secure.sameSite).toBe("lax");

    const insecure = getSessionCookieOptions(req("localhost", "http"));
    expect(insecure.secure).toBe(false);
    expect(insecure.sameSite).toBe("lax");
  });

  it("uses SameSite=None only for an explicitly cross-origin deployment", () => {
    // And only alongside Secure, which browsers require for the pair.
    process.env.SESSION_COOKIE_DOMAIN = ".lumiere.example";
    try {
      expect(getSessionCookieOptions(req("app.lumiere.example", "https")).sameSite).toBe("none");
      // Never None without Secure — the browser would reject the cookie outright.
      expect(getSessionCookieOptions(req("localhost", "http")).sameSite).toBe("lax");
    } finally {
      delete process.env.SESSION_COOKIE_DOMAIN;
    }
  });

  it("sets a maxAge, so the cookie survives closing the browser", () => {
    // The bug this guards is nasty precisely because it looks like nothing is
    // wrong. Without maxAge the browser treats it as a session cookie and drops
    // it on close, while the bearer token in AsyncStorage lives on — so every
    // tRPC call keeps working and the app still shows the user signed in, but
    // any plain navigation to an authenticated route arrives with no credential
    // at all and is rejected as "Not authenticated".
    const options = getSessionCookieOptions(req("lumiere-house1.vercel.app", "https"));
    expect(options.maxAge).toBe(SESSION_COOKIE_MAX_AGE_MS);
    expect(options.maxAge).toBeGreaterThan(0);
  });

  it("expires the cookie no later than the session row it points at", () => {
    // db.createSession issues a 30-day session. A cookie outliving it would
    // send a credential the server has already forgotten.
    expect(SESSION_COOKIE_MAX_AGE_MS).toBeLessThanOrEqual(30 * 24 * 60 * 60 * 1000);
  });
});
