/**
 * Encryption for third-party OAuth tokens held at rest.
 *
 * A TikTok access token is a live credential: whoever holds it can act as the
 * user against TikTok's API until it expires. Storing one as plaintext in a
 * database column means any backup, any read replica, any accidental dump, and
 * any SQL-injection foothold hands out working credentials for every connected
 * account at once. Encrypting them means a database dump on its own is inert —
 * the attacker also needs JWT_SECRET, which lives in the environment.
 *
 * AES-256-GCM, from node:crypto. No new dependency, and GCM authenticates the
 * ciphertext, so a tampered row fails loudly at decrypt rather than yielding
 * a silently corrupted token.
 *
 * This is NOT a substitute for a managed KMS. It raises the cost of a database
 * compromise; it does not help if the environment itself leaks. That trade is
 * the right one at this size, and the seam is narrow enough to swap later.
 */
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

import { ENV } from "./env";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // 96 bits, the size GCM is specified for
const KEY_BYTES = 32;

/** Distinct from any other use of JWT_SECRET, so the two key usages never coincide. */
const HKDF_INFO = "lumiere:connector-credentials:v1";

export class SecretsUnavailableError extends Error {}

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = ENV.cookieSecret;
  if (!secret) {
    // Refusing is the point. Falling back to a constant would produce
    // ciphertext that looks encrypted and protects nothing.
    throw new SecretsUnavailableError("JWT_SECRET is not set, so connector credentials cannot be encrypted. Refusing to store a token in plaintext.");
  }
  // HKDF rather than using the secret directly: JWT_SECRET is an arbitrary
  // string of unknown length and entropy distribution, not a 32-byte key.
  cachedKey = Buffer.from(hkdfSync("sha256", Buffer.from(secret, "utf8"), Buffer.alloc(0), Buffer.from(HKDF_INFO, "utf8"), KEY_BYTES));
  return cachedKey;
}

/** Returns "v1.<iv>.<authTag>.<ciphertext>", all base64url. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), authTag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

/**
 * Returns null rather than throwing when a value cannot be read. A token that
 * was encrypted under a rotated JWT_SECRET is unrecoverable, and the correct
 * response is to treat the connection as needing reauthorization — not to fail
 * the whole request with a decryption error the user cannot act on.
 */
export function decryptSecret(stored: string): string | null {
  try {
    const parts = stored.split(".");
    if (parts.length !== 4 || parts[0] !== "v1") return null;
    const [, ivPart, tagPart, dataPart] = parts;
    const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivPart, "base64url"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(dataPart, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** Surfaced in diagnostics so a deployment that cannot store tokens is visible. */
export function isSecretStorageAvailable(): boolean {
  return Boolean(ENV.cookieSecret);
}
