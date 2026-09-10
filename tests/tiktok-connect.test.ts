import { describe, expect, it } from "vitest";
import { buildAppUrl } from "../server/_core/app-url";

/**
 * The bug these exist to prevent: before this change the OAuth callback sent
 * the browser to `/(tabs)/connect`, prefixed with EXPO_WEB_PREVIEW_URL. The
 * Connect screen had moved to the top-level route /connect, and the prefix was
 * empty in production — so a *successful* TikTok authorization finished in the
 * database and dumped the user on a 404. The flow worked and looked broken,
 * which is the worst possible outcome for a screen recording.
 */
describe("OAuth return URL", () => {
  it("is absolute, so Linking.openURL works on native and a 302 is valid", () => {
    const url = buildAppUrl({ protocol: "https", headers: { host: "lumiere-house1.vercel.app" } }, "/connect?tiktok=connected");
    expect(url).toBe("https://lumiere-house1.vercel.app/connect?tiktok=connected");
  });

  it("honours x-forwarded-proto and x-forwarded-host", () => {
    // Vercel terminates TLS at the edge; without these the URL would be http://
    // against an internal hostname, and TikTok rejects a redirect_uri mismatch.
    const url = buildAppUrl(
      { protocol: "http", headers: { host: "internal.local", "x-forwarded-host": "lumiere-house1.vercel.app", "x-forwarded-proto": "https" } },
      "/connect",
    );
    expect(url).toBe("https://lumiere-house1.vercel.app/connect");
  });

  it("takes the first entry when a proxy chain appends more", () => {
    const url = buildAppUrl(
      { protocol: "http", headers: { host: "internal.local", "x-forwarded-host": "lumiere-house1.vercel.app, inner.vercel.app", "x-forwarded-proto": "https,http" } },
      "/connect",
    );
    expect(url).toBe("https://lumiere-house1.vercel.app/connect");
  });

  it("targets /connect, not the tab-group path the screen no longer lives at", () => {
    const url = buildAppUrl({ protocol: "https", headers: { host: "example.com" } }, "/connect?tiktok=connected");
    expect(url).not.toContain("(tabs)");
    expect(new URL(url).pathname).toBe("/connect");
  });

  it("defaults to https when a proxy sets neither forwarded header", () => {
    const url = buildAppUrl({ headers: { host: "example.com" } }, "/connect");
    expect(url.startsWith("https://")).toBe(true);
  });
});

describe("OAuth failure reasons", () => {
  /**
   * The callback encodes why it failed so the Connect screen can say something
   * actionable. These are the values it emits; the screen maps every one of
   * them. A reason with no message would render the generic fallback, which is
   * the "authorization failed" dead end this replaced.
   */
  const emitted = ["declined", "expired", "not_configured", "exchange_failed", "no_access", "signed_out", "storage_unavailable", "unexpected"];

  it("round-trips through a query string unchanged", () => {
    for (const reason of emitted) {
      const url = buildAppUrl({ protocol: "https", headers: { host: "example.com" } }, `/connect?${new URLSearchParams({ tiktok: "error", reason }).toString()}`);
      expect(new URL(url).searchParams.get("reason")).toBe(reason);
      expect(new URL(url).searchParams.get("tiktok")).toBe("error");
    }
  });
});
