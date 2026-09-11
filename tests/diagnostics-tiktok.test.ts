import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The diagnostics endpoint is unauthenticated, so what it reports about the
 * TikTok configuration is public. The client key, redirect URI and scope are
 * public by design — every authorize URL carries them — but the client secret
 * must never appear, and the reported values have to make an invisible
 * character findable rather than hiding it a second time.
 *
 * ENV is captured at module load, so each case re-imports with a fresh module
 * registry after setting the environment.
 */
async function loadDiagnostics(env: Record<string, string>) {
  for (const [key, value] of Object.entries(env)) process.env[key] = value;
  vi.resetModules();
  const { getRuntimeDiagnostics } = await import("../server/_core/env");
  return getRuntimeDiagnostics();
}

const KEYS = ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_REDIRECT_URI", "TIKTOK_SCOPES"];
const saved: Record<string, string | undefined> = {};

beforeEach(() => { for (const k of KEYS) saved[k] = process.env[k]; });
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k] as string;
  }
});

describe("TikTok diagnostics", () => {
  it("reports the configured client key, redirect URI and scope", async () => {
    const d = await loadDiagnostics({
      TIKTOK_CLIENT_KEY: "aw1234567890abcd",
      TIKTOK_CLIENT_SECRET: "secret-value-do-not-leak",
      TIKTOK_REDIRECT_URI: "https://lumiere-house1.vercel.app/api/oauth/tiktok/callback",
    });
    expect(d.tiktok.clientKey.value).toBe("aw1234567890abcd");
    expect(d.tiktok.clientKey.length).toBe(16);
    expect(d.tiktok.redirectUri.value).toBe("https://lumiere-house1.vercel.app/api/oauth/tiktok/callback");
    // Unset TIKTOK_SCOPES must report what is actually sent, not empty.
    expect(d.tiktok.scope.value).toBe("user.info.basic");
  });

  /** The whole reason this exists. */
  it("makes a zero-width space visible instead of hiding it again", async () => {
    const d = await loadDiagnostics({
      TIKTOK_CLIENT_KEY: "aw1234​567890",
      TIKTOK_CLIENT_SECRET: "s",
      TIKTOK_REDIRECT_URI: "https://example.com/cb",
    });
    expect(d.tiktok.clientKey.escaped).toBe("aw1234\\u200b567890");
    expect(d.tiktok.clientKey.length).toBe(13);
  });

  /**
   * A leading BOM is NOT one of the cases to worry about: ECMAScript counts
   * U+FEFF as whitespace, so trim() already removes it at either end. U+200B
   * is not whitespace and survives, as does a BOM in the middle. Pinned
   * because the difference decides what is worth hunting for.
   */
  it("trims a leading BOM but keeps an interior one visible, alongside an interior space", async () => {
    const d = await loadDiagnostics({
      TIKTOK_CLIENT_KEY: "﻿aw12 34﻿56",
      TIKTOK_CLIENT_SECRET: "s",
      TIKTOK_REDIRECT_URI: "https://example.com/cb",
    });
    expect(d.tiktok.clientKey.escaped).toBe("aw12\\u002034\\ufeff56");
  });

  it("leaves a clean value untouched, so the escaped form is only noise when it matters", async () => {
    const d = await loadDiagnostics({
      TIKTOK_CLIENT_KEY: "awplainkey123",
      TIKTOK_CLIENT_SECRET: "s",
      TIKTOK_REDIRECT_URI: "https://example.com/cb",
    });
    expect(d.tiktok.clientKey.escaped).toBe(d.tiktok.clientKey.value);
  });

  it("never exposes the client secret anywhere in the payload", async () => {
    const secret = "tiktok-client-secret-9f3a2b";
    const d = await loadDiagnostics({
      TIKTOK_CLIENT_KEY: "awkey",
      TIKTOK_CLIENT_SECRET: secret,
      TIKTOK_REDIRECT_URI: "https://example.com/cb",
    });
    expect(JSON.stringify(d)).not.toContain(secret);
    // Still reported as present, just never by value.
    expect(d.tiktok.missing).not.toContain("TIKTOK_CLIENT_SECRET");
  });
});
