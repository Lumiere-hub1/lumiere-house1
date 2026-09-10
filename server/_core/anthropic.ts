/**
 * Anthropic client for Content Studio slash-commands.
 *
 * Deliberately separate from server/_core/llm.ts: that module is an
 * OpenAI-shaped client pointed at NVIDIA/Forge and drives the existing
 * content.generate flow. Keeping this isolated means a change here cannot
 * regress generation that already works.
 *
 * SECURITY: every prompt string in this file is server-only. Nothing here is
 * imported by app/ or components/, so none of it is emitted into the web
 * bundle. The router returns only the finished script fields — never the
 * system prompt, the user-facing envelope, or raw model metadata.
 */
import { AnthropicBedrockMantle } from "@anthropic-ai/bedrock-sdk";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { ENV } from "./env";

/**
 * Model is pinned rather than configurable so output stays consistent per
 * workspace. Bedrock namespaces the same model behind an `anthropic.` prefix;
 * everything else about the request is identical, which is why one code path
 * serves both providers.
 */
const SCRIPT_MODEL = "claude-opus-5";

/**
 * A short-form script never approaches this; the ceiling exists so a runaway
 * generation fails fast instead of hanging the request. Adaptive thinking is on
 * by default for this model and its tokens count against the same budget, so
 * this leaves ample headroom above the ~250 words the script itself needs.
 */
const SCRIPT_MAX_TOKENS = 16000;

const ScriptSchema = z.object({
  title: z.string().describe("A short internal label for this script, 3-8 words. Not spoken on camera."),
  hook: z.string().describe("The first line spoken on camera. One or two sentences that stop the scroll."),
  body: z.string().describe("The main spoken content, in the order it is said. Plain spoken sentences, no shot directions, no camera notes, no emojis."),
  callToAction: z.string().describe("The closing line that asks for the specific next step."),
  estimatedSeconds: z.number().int().min(10).max(120).describe("Realistic spoken length of hook + body + callToAction at a natural pace."),
});

export type GeneratedScript = z.infer<typeof ScriptSchema>;

/**
 * Written for owner-operators in beauty services who are filming themselves on
 * a phone between clients. The constraints exist because the generic
 * "social media script" register — hype, emojis, stage directions, invented
 * statistics — is unusable on camera and misrepresents the business.
 */
const SCRIPT_SYSTEM_PROMPT = [
  "You write short-form video scripts for independent beauty businesses: lash techs, hair stylists, estheticians, nail artists, salon and medspa owners.",
  "The person reading your script is filming themselves on a phone, usually alone, often between clients. Write words they can say out loud without rehearsing.",
  "",
  "Structure every script as hook, body, call to action.",
  "- The hook is the first sentence spoken. It names the viewer's situation, not the business's offer.",
  "- The body delivers one idea. Specific and concrete beats clever. Short sentences.",
  "- The call to action asks for one next step, phrased the way a person actually speaks.",
  "",
  "Hard rules:",
  "- Total spoken length 20-45 seconds. Count words, not characters.",
  "- Write only spoken words. No shot directions, no 'cut to', no camera or B-roll notes, no scene headings, no timestamps.",
  "- No emojis, no hashtags, no asterisks, no markdown, no ALL-CAPS words.",
  "- Never invent statistics, prices, results, review counts, or timeframes. If a number would strengthen the script and you were not given one, write the line so it works without a number.",
  "- Never promise revenue, bookings, or guaranteed outcomes.",
  "- Do not name a competitor or make a medical, dermatological, or health claim.",
  "- Write in second person to the viewer. Warm, direct, and plain. No hype and no exclamation marks.",
].join("\n");

/** Thrown when a generation cannot proceed; the router converts it to a tRPC error. */
export class AnthropicUnavailableError extends Error {}

/**
 * Which of the two ways of reaching Claude this deployment is configured for.
 *
 * - "bedrock"   — Amazon Bedrock, billed to an AWS account. Authenticates with
 *                 a Bedrock API key (the "ABSK…" string AWS issues) sent as a
 *                 bearer token against bedrock-mantle.<region>.api.aws.
 * - "anthropic" — Anthropic's own API, billed to an Anthropic account.
 *                 Authenticates with an "sk-ant-…" key.
 *
 * The two credentials are NOT interchangeable: an ABSK key in ANTHROPIC_API_KEY
 * is rejected by api.anthropic.com, and an sk-ant- key is rejected by Bedrock.
 * Bedrock wins when configured, because a deployment that has gone to the
 * trouble of setting AWS credentials means to spend the AWS balance.
 */
export type ScriptProvider = "bedrock" | "anthropic" | "none";

export function resolveScriptProvider(): ScriptProvider {
  if (ENV.bedrock.apiKey) return "bedrock";
  if (ENV.anthropicApiKey) return "anthropic";
  return "none";
}

/** Bedrock namespaces Anthropic's models; the first-party API does not. */
function modelFor(provider: ScriptProvider): string {
  return provider === "bedrock" ? `anthropic.${SCRIPT_MODEL}` : SCRIPT_MODEL;
}

/**
 * Both clients extend the same base and expose the same `messages` resource, so
 * the request-building code below is written once and does not branch.
 */
type ScriptClient = Anthropic | AnthropicBedrockMantle;

let cachedClient: ScriptClient | null = null;

function getClient(): ScriptClient {
  if (cachedClient) return cachedClient;

  const provider = resolveScriptProvider();
  if (provider === "bedrock") {
    if (!ENV.bedrock.region) {
      // Bedrock is regional and the SDK has no default, so a missing region
      // would otherwise surface as an unresolvable hostname mid-request.
      throw new AnthropicUnavailableError("The script engine has a Bedrock key but no region. Set BEDROCK_AWS_REGION on the server (for example us-east-1).");
    }
    cachedClient = new AnthropicBedrockMantle({ apiKey: ENV.bedrock.apiKey, awsRegion: ENV.bedrock.region });
    return cachedClient;
  }

  if (provider === "anthropic") {
    cachedClient = new Anthropic({ apiKey: ENV.anthropicApiKey });
    return cachedClient;
  }

  throw new AnthropicUnavailableError("The script engine is not configured. Set either AWS_BEARER_TOKEN_BEDROCK and BEDROCK_AWS_REGION (Amazon Bedrock) or ANTHROPIC_API_KEY (Anthropic's own API) on the server.");
}

/** Names the variable an operator should actually look at when auth fails. */
function credentialHint(provider: ScriptProvider): string {
  return provider === "bedrock" ? "AWS_BEARER_TOKEN_BEDROCK" : "ANTHROPIC_API_KEY";
}

export type ScriptRequest = {
  topic: string;
  platform: string;
  businessName?: string;
  industry?: string;
  targetCustomer?: string;
};

/**
 * Generates one short-form script. Returns only the parsed fields; the caller
 * never sees the prompt or the raw response.
 */
export async function generateScript(request: ScriptRequest): Promise<GeneratedScript> {
  const provider = resolveScriptProvider();
  const client = getClient();

  // Business context is optional — a workspace may not have completed setup.
  // Each line is omitted entirely rather than sent empty, so the model is never
  // asked to write around a blank field.
  const context = [
    request.businessName ? `Business name: ${request.businessName}` : null,
    request.industry ? `Industry: ${request.industry}` : null,
    request.targetCustomer ? `Who they serve: ${request.targetCustomer}` : null,
    `Platform: ${request.platform}`,
  ].filter(Boolean);

  let response;
  try {
    response = await client.messages.parse({
      model: modelFor(provider),
      max_tokens: SCRIPT_MAX_TOKENS,
      // Creative writing of this length does not repay deep reasoning; medium
      // keeps quality while holding token spend down on a per-client app.
      output_config: { effort: "medium", format: zodOutputFormat(ScriptSchema) },
      system: SCRIPT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `${context.join("\n")}\n\nWrite the script about: ${request.topic}`,
        },
      ],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new AnthropicUnavailableError(`The script engine rejected its API key. Check ${credentialHint(provider)} on the server.`);
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new AnthropicUnavailableError("The script engine is rate limited right now. Try again in a moment.");
    }
    if (error instanceof Anthropic.APIError) {
      throw new AnthropicUnavailableError(`The script engine returned an error (${error.status}). No script was saved.`);
    }
    throw new AnthropicUnavailableError("The script engine is unreachable. No script was saved.");
  }

  if (response.stop_reason === "refusal") {
    throw new AnthropicUnavailableError("The script engine declined this topic. Try rewording it.");
  }
  if (!response.parsed_output) {
    throw new AnthropicUnavailableError("The script engine returned an unreadable response. No script was saved.");
  }

  return response.parsed_output;
}

/**
 * One short plain-text answer, no structured output. Used by the Telegram
 * support bot, which previously hand-rolled a fetch to api.anthropic.com with
 * an x-api-key header — a shape that only ever works on the first-party path
 * and would have silently stopped answering the moment this deployment moved
 * to Bedrock. Routing it through the same client keeps one provider decision
 * in one place.
 *
 * Returns null rather than throwing: a support bot that cannot reach Claude
 * should fall back to its canned reply, not drop the message.
 */
export async function generatePlainText(options: { system: string; prompt: string; maxTokens: number }): Promise<string | null> {
  const provider = resolveScriptProvider();
  if (provider === "none") return null;

  try {
    const response = await getClient().messages.create({
      model: modelFor(provider),
      max_tokens: options.maxTokens,
      system: options.system,
      messages: [{ role: "user", content: options.prompt }],
    });
    const text = response.content
      .filter((block): block is Extract<typeof block, { type: "text" }> => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();
    return text || null;
  } catch (error) {
    console.error(JSON.stringify({
      event: "claude_plain_text_failed",
      provider,
      status: error instanceof Anthropic.APIError ? error.status : undefined,
      error: error instanceof Error ? error.message : "unknown",
    }));
    return null;
  }
}

/** Surfaced through the existing runtime diagnostics endpoint. */
export function isAnthropicConfigured(): boolean {
  return resolveScriptProvider() !== "none";
}
