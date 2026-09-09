import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { getSessionCookieOptions, isPublicSuffixDomain } from "../server/_core/cookies";

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

  it("pairs SameSite=None only with Secure, and falls back to Lax on plain http", () => {
    // Browsers reject SameSite=None without Secure, which broke local http
    // development the same way the domain broke production.
    const secure = getSessionCookieOptions(req("lumiere-house1.vercel.app", "https"));
    expect(secure.secure).toBe(true);
    expect(secure.sameSite).toBe("none");

    const insecure = getSessionCookieOptions(req("localhost", "http"));
    expect(insecure.secure).toBe(false);
    expect(insecure.sameSite).toBe("lax");
  });
});
