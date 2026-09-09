import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The webhook URL is effectively public once it is registered with Telegram,
 * so the shared secret header is the only thing standing between the bot and
 * anyone who guesses the path. These cover that boundary, plus the acknowledge
 * behaviour that keeps Telegram from retrying and multiplying API spend.
 */

const ORIGINAL_ENV = { ...process.env };

async function buildApp() {
  // Imported after the env is set: server/_core/env.ts snapshots process.env
  // into a frozen object at module load.
  vi.resetModules();
  const { registerTelegramRoutes } = await import("../server/_core/telegram");
  const app = express();
  app.use(express.json());
  registerTelegramRoutes(app);
  return app;
}

/** Minimal request driver so the tests need no supertest dependency. */
async function post(app: express.Express, headers: Record<string, string>, body: unknown) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/telegram/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.text() };
  } finally {
    server.close();
  }
}

const update = { message: { chat: { id: 123 }, from: { id: 9, is_bot: false }, text: "how do I reset my password?" } };

describe("Telegram webhook authentication", () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = "test-bot-token";
    process.env.TELEGRAM_WEBHOOK_SECRET = "test-webhook-secret";
    // No Anthropic key: the handler must degrade to the fallback reply rather
    // than throw, and must never block the 200 acknowledgement.
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  it("rejects a request with no secret header", async () => {
    const app = await buildApp();
    const result = await post(app, {}, update);
    expect(result.status).toBe(403);
  });

  it("rejects a request whose secret does not match", async () => {
    const app = await buildApp();
    const result = await post(app, { "X-Telegram-Bot-Api-Secret-Token": "wrong-secret" }, update);
    expect(result.status).toBe(403);
  });

  it("rejects everything when the bot is not configured, even with a header", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    const app = await buildApp();
    const result = await post(app, { "X-Telegram-Bot-Api-Secret-Token": "test-webhook-secret" }, update);
    expect(result.status).toBe(403);
  });

  it("acknowledges a correctly signed update immediately", async () => {
    // Telegram retries any non-2xx, so a slow or failing handler would be
    // re-delivered and answered repeatedly. The 200 must not wait on the reply.
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const app = await buildApp();
    const result = await post(app, { "X-Telegram-Bot-Api-Secret-Token": "test-webhook-secret" }, update);
    expect(result.status).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ ok: true });
    fetchSpy.mockRestore();
  });
});
