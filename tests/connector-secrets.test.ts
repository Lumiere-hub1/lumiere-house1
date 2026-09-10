import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A TikTok access token is a live credential. These cover the properties that
 * make storing one acceptable: it does not survive as plaintext, a tampered
 * row is rejected rather than silently mis-decrypted, and a rotated JWT_SECRET
 * degrades to "reauthorize" instead of throwing somewhere unhelpful.
 */
const SECRET = "test-jwt-secret-value-long-enough";
let saved: string | undefined;

async function loadWith(secret: string | undefined) {
  if (secret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = secret;
  vi.resetModules();
  return import("../server/_core/secrets");
}

beforeEach(() => {
  saved = process.env.JWT_SECRET;
});

afterEach(() => {
  if (saved === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = saved;
  vi.resetModules();
});

describe("connector credential encryption", () => {
  it("round-trips a token", async () => {
    const { encryptSecret, decryptSecret } = await loadWith(SECRET);
    const token = "act.exampleAccessToken1234567890";
    expect(decryptSecret(encryptSecret(token))).toBe(token);
  });

  it("never leaves the plaintext recoverable from the stored string", async () => {
    const { encryptSecret } = await loadWith(SECRET);
    const token = "act.exampleAccessToken1234567890";
    const stored = encryptSecret(token);
    expect(stored).not.toContain(token);
    // Also not hiding in a trivial encoding.
    expect(Buffer.from(stored, "utf8").toString("base64")).not.toContain(Buffer.from(token, "utf8").toString("base64"));
  });

  it("produces different ciphertext each time, so equal tokens are not linkable", async () => {
    const { encryptSecret } = await loadWith(SECRET);
    expect(encryptSecret("same-token")).not.toBe(encryptSecret("same-token"));
  });

  it("rejects a tampered ciphertext rather than returning corrupted output", async () => {
    const { encryptSecret, decryptSecret } = await loadWith(SECRET);
    const stored = encryptSecret("act.exampleAccessToken");
    const parts = stored.split(".");
    // Flip a character in the ciphertext segment.
    parts[3] = parts[3].startsWith("A") ? `B${parts[3].slice(1)}` : `A${parts[3].slice(1)}`;
    expect(decryptSecret(parts.join("."))).toBeNull();
  });

  it("returns null when the key has rotated, so the caller reauthorizes", async () => {
    const first = await loadWith(SECRET);
    const stored = first.encryptSecret("act.exampleAccessToken");
    const second = await loadWith("a-completely-different-secret-value");
    expect(second.decryptSecret(stored)).toBeNull();
  });

  it("refuses to encrypt at all without JWT_SECRET rather than using a constant key", async () => {
    const { encryptSecret, isSecretStorageAvailable, SecretsUnavailableError } = await loadWith(undefined);
    expect(isSecretStorageAvailable()).toBe(false);
    expect(() => encryptSecret("act.token")).toThrow(SecretsUnavailableError);
  });

  it("rejects a malformed or unversioned stored value", async () => {
    const { decryptSecret } = await loadWith(SECRET);
    expect(decryptSecret("")).toBeNull();
    expect(decryptSecret("not-encrypted-at-all")).toBeNull();
    expect(decryptSecret("v2.a.b.c")).toBeNull();
  });
});
