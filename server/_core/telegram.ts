/**
 * Telegram support bot.
 *
 * The Telegram Bot API itself is free. Answering with Claude is billed per
 * request, so every path here is bounded: a short max_tokens, a per-chat rate
 * limit backed by the same bucket table the HTTP routes use, and a hard cap on
 * the length of question accepted. An unbounded support bot on a public
 * username is an open invitation to burn credits.
 *
 * Delivery is webhook-based rather than long polling. Long polling needs a
 * process that stays alive, which a serverless deployment does not give us.
 */
import type { Express, Request, Response } from "express";
import { generatePlainText } from "./anthropic";
import { ENV } from "./env";
import { checkRateLimit } from "../db";

const TELEGRAM_API = "https://api.telegram.org";

/** Telegram truncates beyond ~4096; stay well inside it. */
const MAX_REPLY_CHARS = 3500;

/** Longer than this is not a support question, it is a paste. */
const MAX_QUESTION_CHARS = 1000;

const SUPPORT_SYSTEM_PROMPT = [
  "You are the support assistant for Lumière House, a marketing tool for independent beauty businesses — lash techs, hair stylists, estheticians, nail artists, salon and medspa owners.",
  "",
  "Answer questions about using the product: accounts and sign-in, workspaces, the Content Studio, client records, scheduling, connecting platforms, and billing.",
  "",
  "Rules:",
  "- Be brief. Two or three short paragraphs at most, plain sentences, no markdown headings.",
  "- If you do not know, say so and tell them a human will follow up. Never invent a feature, a price, a policy, or a setting that you are not sure exists.",
  "- Never ask for a password, a payment card, or a verification code. If someone offers one, tell them not to share it.",
  "- You cannot look up their account, change their data, issue refunds, or reset anything. Say so plainly and hand off to a human when that is what they need.",
  "- Do not promise timescales for fixes or replies.",
].join("\n");

type TelegramUpdate = {
  message?: {
    message_id?: number;
    chat?: { id?: number };
    from?: { id?: number; is_bot?: boolean };
    text?: string;
  };
};

export function isTelegramConfigured(): boolean {
  return Boolean(ENV.telegramBotToken && ENV.telegramWebhookSecret);
}

async function sendMessage(chatId: number, text: string): Promise<void> {
  if (!ENV.telegramBotToken) return;
  try {
    await fetch(`${TELEGRAM_API}/bot${ENV.telegramBotToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(0, MAX_REPLY_CHARS), disable_web_page_preview: true }),
    });
  } catch (error) {
    console.error(JSON.stringify({ event: "telegram_send_failed", error: error instanceof Error ? error.message : "unknown" }));
  }
}

const HELP_TEXT = [
  "Lumière House support.",
  "",
  "Ask a question about using Lumière and I'll do my best to answer.",
  "",
  "I can't see your account, change your data, or issue refunds — for anything like that a human will pick it up.",
  "",
  "Never send a password, a payment card, or a verification code here.",
].join("\n");

/**
 * Answers with Claude. Returns null when unavailable, so the caller degrades
 * rather than lying.
 *
 * Delegates to server/_core/anthropic.ts rather than calling the API directly:
 * this used to POST to api.anthropic.com with an x-api-key header, which is
 * the first-party shape only and would have gone quiet — with no error the
 * user could see — as soon as the deployment moved to Amazon Bedrock.
 */
async function answerWithClaude(question: string): Promise<string | null> {
  // A support answer is short. This is the cost ceiling per message.
  return generatePlainText({ system: SUPPORT_SYSTEM_PROMPT, prompt: question, maxTokens: 600 });
}

const FALLBACK_REPLY = "I couldn't answer that one automatically. A human from the Lumière team will follow up — you can also reach us by email from the Support screen in the app.";

export function registerTelegramRoutes(app: Express) {
  app.post("/api/telegram/webhook", async (req: Request, res: Response) => {
    // Telegram echoes this header back from setWebhook. Without it, anyone who
    // learns the URL could feed the bot arbitrary updates. Compared before any
    // other work so an unauthenticated caller costs nothing.
    const provided = req.header("X-Telegram-Bot-Api-Secret-Token");
    if (!isTelegramConfigured() || !provided || provided !== ENV.telegramWebhookSecret) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // Always acknowledge. Telegram retries any non-2xx, and a retry storm on a
    // message we already handled would multiply the API spend.
    res.status(200).json({ ok: true });

    const update = req.body as TelegramUpdate;
    const chatId = update?.message?.chat?.id;
    const text = typeof update?.message?.text === "string" ? update.message.text.trim() : "";
    if (typeof chatId !== "number" || !text) return;
    if (update.message?.from?.is_bot) return;

    if (text.startsWith("/start") || text.startsWith("/help")) {
      await sendMessage(chatId, HELP_TEXT);
      return;
    }

    if (text.length > MAX_QUESTION_CHARS) {
      await sendMessage(chatId, `That's a bit long for me — could you shorten it to under ${MAX_QUESTION_CHARS} characters, or email us instead?`);
      return;
    }

    // Per-chat limit, keyed by chat id rather than IP: every update arrives
    // from Telegram's servers, so the IP is meaningless here.
    //
    // checkRateLimit directly rather than enforceRateLimit: the latter sets
    // headers and sends the HTTP response, and we have already replied 200 to
    // Telegram above. Touching the response now would throw
    // "Cannot set headers after they are sent".
    let allowed = true;
    try {
      const result = await checkRateLimit({
        bucket: "telegram.support",
        identifier: `chat:${chatId}`,
        maxRequests: 15,
        windowMs: 10 * 60 * 1000,
      });
      allowed = result.allowed;
    } catch (error) {
      // Fail closed: if the limiter is unavailable we do not spend API credits.
      console.error(JSON.stringify({ event: "telegram_rate_limit_error", error: error instanceof Error ? error.message : "unknown" }));
      await sendMessage(chatId, "Support is temporarily unavailable. Please try again shortly, or email us from the Support screen in the app.");
      return;
    }
    if (!allowed) {
      await sendMessage(chatId, "You've sent quite a few messages in a short time. Give it a few minutes and try again.");
      return;
    }

    const answer = await answerWithClaude(text);
    await sendMessage(chatId, answer ?? FALLBACK_REPLY);
  });
}
