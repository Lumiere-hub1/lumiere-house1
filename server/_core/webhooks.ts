import { createHmac, timingSafeEqual } from "crypto";

export type WebhookVerification =
  | { ok: true; timestamp: number; signature: string }
  | { ok: false; reason: "missing_signature" | "malformed_signature" | "stale_signature" | "invalid_signature" };

export function verifyTikTokWebhookSignature(
  rawBody: string,
  header: string | undefined,
  clientSecret: string,
  nowMs = Date.now(),
  maxAgeSeconds = 300,
): WebhookVerification {
  if (!header) return { ok: false, reason: "missing_signature" };
  const values = Object.fromEntries(header.split(",").map((part) => {
    const [key, ...rest] = part.trim().split("=");
    return [key, rest.join("=")];
  }));
  const timestamp = Number(values.t);
  const received = values.s;
  if (!Number.isInteger(timestamp) || !received || !/^[a-f0-9]{64}$/i.test(received)) return { ok: false, reason: "malformed_signature" };
  if (Math.abs(nowMs - timestamp * 1000) > maxAgeSeconds * 1000) return { ok: false, reason: "stale_signature" };
  const expected = createHmac("sha256", clientSecret).update(`${timestamp}.${rawBody}`).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");
  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) return { ok: false, reason: "invalid_signature" };
  return { ok: true, timestamp, signature: received.toLowerCase() };
}
