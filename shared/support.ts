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
 */
function publicEnv(value: string | undefined, fallback = ""): string {
  return (value ?? "").trim() || fallback;
}

export const SUPPORT_CHANNELS = {
  /** Bot username without the leading "@", e.g. "LumiereHouseSupportBot". */
  telegramUsername: publicEnv(process.env.EXPO_PUBLIC_SUPPORT_TELEGRAM),
  /** Any format; the link strips it to digits. Empty hides the option. */
  whatsappNumber: publicEnv(process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP),
  /** Always shown — this address is already the published contact. */
  email: publicEnv(process.env.EXPO_PUBLIC_SUPPORT_EMAIL, "info@glowbyroselure.com"),
} as const;
