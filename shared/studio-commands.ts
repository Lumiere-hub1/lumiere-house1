/**
 * Content Studio slash-commands.
 *
 * This module is shared by the client (to render the command list and give
 * immediate feedback on a typo) and the server (to validate what it is asked to
 * run). It deliberately contains NO prompt text — the wording sent to the model
 * lives server-side only, in server/_core/anthropic.ts, so it is never shipped
 * in the web bundle where a user could read it.
 *
 * Adding a command later (/CAPTION, /HOOK, /VIDEO, /IMAGE) means flipping
 * `available` here and adding its generator on the server. Everything else —
 * parsing, validation, the UI list, the error copy — already handles it.
 */

export const STUDIO_COMMAND_NAMES = ["SCRIPT", "TRENDS", "CAPTION", "HOOK", "VIDEO", "IMAGE"] as const;

export type StudioCommandName = (typeof STUDIO_COMMAND_NAMES)[number];

export type StudioCommandSpec = {
  name: StudioCommandName;
  /** Shown in the UI's command list. */
  label: string;
  /** One line of help, shown next to the label. */
  hint: string;
  /** Placeholder example, shown when the command is selected. */
  example: string;
  /** False until the command's generator exists on the server. */
  available: boolean;
};

export const STUDIO_COMMANDS: Record<StudioCommandName, StudioCommandSpec> = {
  SCRIPT: {
    name: "SCRIPT",
    label: "/SCRIPT",
    hint: "Short-form video script with a hook, body, and call to action.",
    example: "/SCRIPT overdue rebooking reminder for a lash client",
    available: true,
  },
  TRENDS: {
    name: "TRENDS",
    label: "/TRENDS",
    hint: "What is getting views on YouTube for a topic, in the last 30 days.",
    example: "/TRENDS lash extension aftercare",
    available: true,
  },
  CAPTION: { name: "CAPTION", label: "/CAPTION", hint: "Post caption. Not available yet.", example: "/CAPTION …", available: false },
  HOOK: { name: "HOOK", label: "/HOOK", hint: "Opening hooks. Not available yet.", example: "/HOOK …", available: false },
  VIDEO: { name: "VIDEO", label: "/VIDEO", hint: "Video generation. Not available yet.", example: "/VIDEO …", available: false },
  IMAGE: { name: "IMAGE", label: "/IMAGE", hint: "Image generation. Not available yet.", example: "/IMAGE …", available: false },
};

export const AVAILABLE_STUDIO_COMMANDS: StudioCommandSpec[] = Object.values(STUDIO_COMMANDS).filter((command) => command.available);

/** Longest topic we accept, matching the server's zod bound. */
export const STUDIO_TOPIC_MAX = 2000;
/** Shortest topic that can produce something useful rather than a guess. */
export const STUDIO_TOPIC_MIN = 8;

export type StudioCommandRejection = { ok: false; reason: "empty" | "missing_slash" | "unknown_command" | "unavailable_command" | "topic_too_short" | "topic_too_long"; message: string; name?: StudioCommandName };

export type ParsedStudioCommand =
  | { ok: true; name: StudioCommandName; topic: string }
  | StudioCommandRejection;

/**
 * Narrows a parse result to its rejection branch.
 *
 * `if (!parsed.ok)` is enough under this repo's tsconfig, but Vercel compiles
 * server/ with its own non-strict config, and without strictNullChecks
 * TypeScript does not narrow a union on a boolean discriminant — the deploy
 * failed with TS2339 on `parsed.message` while `pnpm check` passed locally.
 * An explicit type predicate narrows the same way under either setting.
 */
export function isStudioCommandRejected(parsed: ParsedStudioCommand): parsed is StudioCommandRejection {
  return !parsed.ok;
}

/**
 * Parses raw input such as `/SCRIPT overdue rebooking reminder for a lash client`.
 *
 * Returns a discriminated result rather than throwing so the UI can show the
 * message inline as the user types, and the server can reuse the identical
 * rules instead of duplicating them.
 */
export function parseStudioCommand(raw: string): ParsedStudioCommand {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: "empty", message: "Type a command to begin." };
  if (!trimmed.startsWith("/")) {
    return { ok: false, reason: "missing_slash", message: `Commands start with a slash — try ${STUDIO_COMMANDS.SCRIPT.example}` };
  }

  const firstSpace = trimmed.search(/\s/);
  const rawName = (firstSpace === -1 ? trimmed.slice(1) : trimmed.slice(1, firstSpace)).toUpperCase();
  const topic = firstSpace === -1 ? "" : trimmed.slice(firstSpace + 1).trim();

  if (!(STUDIO_COMMAND_NAMES as readonly string[]).includes(rawName)) {
    const known = STUDIO_COMMAND_NAMES.map((name) => `/${name}`).join(", ");
    return { ok: false, reason: "unknown_command", message: `${rawName ? `/${rawName}` : "That"} is not a command. Available: ${known}` };
  }

  const name = rawName as StudioCommandName;
  const spec = STUDIO_COMMANDS[name];
  if (!spec.available) {
    return { ok: false, reason: "unavailable_command", name, message: `${spec.label} is not available yet.` };
  }
  if (topic.length < STUDIO_TOPIC_MIN) {
    return { ok: false, reason: "topic_too_short", name, message: `Add what it is about — for example: ${spec.example}` };
  }
  if (topic.length > STUDIO_TOPIC_MAX) {
    return { ok: false, reason: "topic_too_long", name, message: `Keep it under ${STUDIO_TOPIC_MAX} characters.` };
  }

  return { ok: true, name, topic };
}
