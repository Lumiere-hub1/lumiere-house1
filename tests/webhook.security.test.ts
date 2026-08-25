import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { verifyTikTokWebhookSignature } from "../server/_core/webhooks";

const secret = "test-client-secret";
const body = JSON.stringify({ event_id: "evt_123", event_type: "lead.created" });
const now = 1_700_000_000_000;

function signature(timestamp: number, payload = body) {
  return createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
}

describe("TikTok webhook verification", () => {
  it("accepts a fresh valid signature", () => {
    const timestamp = Math.floor(now / 1000);
    expect(verifyTikTokWebhookSignature(body, `t=${timestamp},s=${signature(timestamp)}`, secret, now).ok).toBe(true);
  });

  it("rejects invalid signatures and stale replays", () => {
    const timestamp = Math.floor(now / 1000);
    expect(verifyTikTokWebhookSignature(body, `t=${timestamp},s=${"0".repeat(64)}`, secret, now)).toMatchObject({ ok: false, reason: "invalid_signature" });
    const oldTimestamp = timestamp - 301;
    expect(verifyTikTokWebhookSignature(body, `t=${oldTimestamp},s=${signature(oldTimestamp)}`, secret, now)).toMatchObject({ ok: false, reason: "stale_signature" });
  });
});
