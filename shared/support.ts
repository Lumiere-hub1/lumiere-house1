/**
 * Public support contact details.
 *
 * These are EXPO_PUBLIC_ variables, which Expo inlines into the web bundle at
 * build time — they are readable by anyone who loads the app. That is correct
 * here: a support username, a WhatsApp number and a support address are meant
 * to be public. Never put a bot token or an API key in one of these.
 *
 * The Telegram BOT TOKEN is deliberately absent: it lives only in
 * TELEGRAM_BOT_TOKEN on the server (server/_core/telegram.ts) and must never
 * reach the client.
 *
 * Every value is normalised rather than trusted verbatim. Whoever fills these
 * in is copying from a browser address bar or a chat app, so "the Telegram
 * one" arrives as a t.me link about as often as a bare username. Accepting
 * both is a one-line concession here that avoids a silently broken link and a
 * wasted deploy cycle.
 */
function publicEnv(value: string | undefined, fallback = ""): string {
  return (value ?? "").trim() || fallback;
}

/**
 * Accepts "lumiere_housebot", "@lumiere_housebot",
 * "t.me/lumiere_housebot" or "https://t.me/lumiere_housebot" and always
 * yields the bare username, because the support screen builds its own
 * https://t.me/<username> link.
 */
export function normaliseTelegramUsername(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^(?:www\.)?(?:t(?:elegram)?\.me|telegram\.dog)\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "");
}

/**
 * Accepts "+1 742-666-0496", "17426660496" or a full wa.me link and yields
 * digits only, which is the only form wa.me accepts.
 *
 * The host is stripped before digits are extracted. Doing it the other way
 * round would be a trap the moment someone pastes a link whose domain
 * contains a digit.
 */
export function normaliseWhatsappNumber(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^(?:www\.)?(?:wa\.me|api\.whatsapp\.com\/send\?phone=)/i, "")
    .replace(/[^0-9]/g, "");
}

export const SUPPORT_CHANNELS = {
  /** Bare username, no leading "@" — see normaliseTelegramUsername. */
  telegramUsername: normaliseTelegramUsername(publicEnv(process.env.EXPO_PUBLIC_SUPPORT_TELEGRAM)),
  /** Digits only. Empty hides the option. */
  whatsappNumber: normaliseWhatsappNumber(publicEnv(process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP)),
  /** Always shown — this address is already the published contact. */
  email: publicEnv(process.env.EXPO_PUBLIC_SUPPORT_EMAIL, "info@glowbyroselure.com"),
} as const;
