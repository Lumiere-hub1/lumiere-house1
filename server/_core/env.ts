function trim(value: string | undefined): string {
  return value?.trim() ?? "";
}

export const ENV = {
  appId: trim(process.env.VITE_APP_ID),
  cookieSecret: trim(process.env.JWT_SECRET),
  databaseUrl: trim(process.env.DATABASE_URL),
  oAuthServerUrl: trim(process.env.OAUTH_SERVER_URL),
  oAuthPortalUrl: trim(process.env.OAUTH_PORTAL_URL),
  ownerOpenId: trim(process.env.OWNER_OPEN_ID),
  webPreviewUrl: trim(process.env.EXPO_WEB_PREVIEW_URL),
  allowedOrigins: trim(process.env.ALLOWED_ORIGINS),
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: trim(process.env.BUILT_IN_FORGE_API_URL),
  forgeApiKey: trim(process.env.BUILT_IN_FORGE_API_KEY),
    nvidiaApiKey: trim(process.env.NVIDIA_API_KEY),
  llmProvider: trim(process.env.LLM_PROVIDER),
  // Transactional email (server/_core/email.ts). Resend's free tier.
  resendApiKey: trim(process.env.RESEND_API_KEY),
  emailFrom: trim(process.env.EMAIL_FROM),
  // Public origin used to build links inside emails. Falls back to the
  // request's own origin when unset, so local development needs no config.
  appBaseUrl: trim(process.env.APP_BASE_URL),
  // Telegram support bot (server/_core/telegram.ts).
  telegramBotToken: trim(process.env.TELEGRAM_BOT_TOKEN),
  telegramWebhookSecret: trim(process.env.TELEGRAM_WEBHOOK_SECRET),
  // Used by the Content Studio /SCRIPT command (server/_core/anthropic.ts) and
  // by the Telegram support bot. Separate from the NVIDIA/Forge provider above,
  // which drives content.generate.
  anthropicApiKey: trim(process.env.ANTHROPIC_API_KEY),
  // YouTube Data API v3 key for the /TRENDS command. A plain API key from
  // Google Cloud Console — an OAuth client id/secret will not work here.
  youtubeApiKey: trim(process.env.YOUTUBE_API_KEY),
  // Shown on the in-app support screen. Public contact details, not secrets.
  supportTelegramUsername: trim(process.env.EXPO_PUBLIC_SUPPORT_TELEGRAM),
  supportWhatsappNumber: trim(process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP),
  supportEmail: trim(process.env.EXPO_PUBLIC_SUPPORT_EMAIL),
  nvidiaModel: trim(process.env.NVIDIA_MODEL) || "nvidia/nemotron-3.5-lightning-30b-a3b",
  tiktok: {
    clientKey: trim(process.env.TIKTOK_CLIENT_KEY),
    clientSecret: trim(process.env.TIKTOK_CLIENT_SECRET),
    redirectUri: trim(process.env.TIKTOK_REDIRECT_URI),
    scopes: trim(process.env.TIKTOK_SCOPES),
  },
} as const;

export function getRuntimeDiagnostics() {
  let tiktokRedirectValid = false;
  try {
    const parsed = new URL(ENV.tiktok.redirectUri);
    tiktokRedirectValid = parsed.protocol === "https:" && Boolean(parsed.hostname);
  } catch {
    tiktokRedirectValid = false;
  }
  const tiktokMissing: string[] = [];
  if (!ENV.tiktok.clientKey) tiktokMissing.push("TIKTOK_CLIENT_KEY");
  if (!ENV.tiktok.clientSecret) tiktokMissing.push("TIKTOK_CLIENT_SECRET");
  if (!ENV.tiktok.redirectUri) tiktokMissing.push("TIKTOK_REDIRECT_URI");
  return {
    databaseConfigured: Boolean(ENV.databaseUrl),
    sessionSecretConfigured: Boolean(ENV.cookieSecret),
    oauthConfigured: Boolean(ENV.appId && ENV.oAuthServerUrl && ENV.oAuthPortalUrl),
    webPreviewConfigured: Boolean(ENV.webPreviewUrl),
    allowedOriginsConfigured: Boolean(ENV.allowedOrigins || ENV.webPreviewUrl),
    forgeConfigured: Boolean(ENV.forgeApiUrl && ENV.forgeApiKey),
    emailConfigured: Boolean(ENV.resendApiKey && ENV.emailFrom),
    telegramConfigured: Boolean(ENV.telegramBotToken && ENV.telegramWebhookSecret),
    anthropicConfigured: Boolean(ENV.anthropicApiKey),
    youtubeConfigured: Boolean(ENV.youtubeApiKey),
    tiktokConfigured: Boolean(ENV.tiktok.clientKey && ENV.tiktok.clientSecret && ENV.tiktok.redirectUri && tiktokRedirectValid),
    tiktok: { configured: Boolean(ENV.tiktok.clientKey && ENV.tiktok.clientSecret && ENV.tiktok.redirectUri && tiktokRedirectValid), redirectValid: tiktokRedirectValid, missing: tiktokMissing },
  };
}
