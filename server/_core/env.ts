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
  //
  // Two mutually exclusive ways to reach the same models. Set ONE of them:
  //   ANTHROPIC_API_KEY        — Anthropic's own API. Key looks like "sk-ant-…".
  //   AWS_BEARER_TOKEN_BEDROCK — Amazon Bedrock. Key looks like "ABSK…".
  // Putting an ABSK key in ANTHROPIC_API_KEY does not work: api.anthropic.com
  // rejects it, and the failure reads as a plain 401 with no hint of why.
  anthropicApiKey: trim(process.env.ANTHROPIC_API_KEY),
  bedrock: {
    apiKey: trim(process.env.AWS_BEARER_TOKEN_BEDROCK),
    // BEDROCK_AWS_REGION is checked first on purpose. Vercel's Node runtime is
    // Lambda underneath and sets AWS_REGION to wherever the function happens to
    // run, which is not necessarily a region where Bedrock is enabled for the
    // account. An explicit variable keeps that ambient value from deciding.
    region: trim(process.env.BEDROCK_AWS_REGION) || trim(process.env.AWS_REGION) || trim(process.env.AWS_DEFAULT_REGION),
  },
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

/**
 * Reports a configured value in a form an invisible character cannot hide in.
 *
 * trim() removes ordinary whitespace, but not a zero-width space (U+200B) or a
 * BOM (U+FEFF). One of those pasted into an env var survives, gets
 * percent-encoded into the TikTok authorize URL, and is rejected with an error
 * naming client_key — while looking identical to the correct value everywhere
 * a human would check, raw JSON included. The length and the escaped form turn
 * that from a guessing game into something you can see.
 *
 * Escapes everything outside printable ASCII, space included, so a stray space
 * in the middle of a value shows up as   rather than as nothing.
 */
function describeConfiguredValue(value: string) {
  return {
    value,
    length: value.length,
    escaped: value.replace(/[^\x21-\x7E]/g, (char) => `\\u${(char.codePointAt(0) ?? 0).toString(16).padStart(4, "0")}`),
  };
}

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
    // Computed here rather than imported from anthropic.ts, which imports ENV.
    // Kept deliberately in step with resolveScriptProvider() in that module.
    anthropicConfigured: Boolean((ENV.bedrock.apiKey && ENV.bedrock.region) || ENV.anthropicApiKey),
    // Names the path in use, so a deployment that is answering from the wrong
    // account — or has a Bedrock key but no region — is visible from the
    // diagnostics endpoint instead of only from a failed generation.
    scriptProvider: ENV.bedrock.apiKey ? (ENV.bedrock.region ? "bedrock" : "bedrock-missing-region") : ENV.anthropicApiKey ? "anthropic" : "none",
    youtubeConfigured: Boolean(ENV.youtubeApiKey),
    tiktokConfigured: Boolean(ENV.tiktok.clientKey && ENV.tiktok.clientSecret && ENV.tiktok.redirectUri && tiktokRedirectValid),
    tiktok: {
      configured: Boolean(ENV.tiktok.clientKey && ENV.tiktok.clientSecret && ENV.tiktok.redirectUri && tiktokRedirectValid),
      redirectValid: tiktokRedirectValid,
      missing: tiktokMissing,
      // Reported so the deployed values can be compared against the TikTok
      // developer dashboard without guessing. All three are public by design:
      // every authorize URL the browser is sent to carries them in plain sight.
      //
      // TIKTOK_CLIENT_SECRET is deliberately absent and must stay absent — this
      // endpoint is unauthenticated. tests/diagnostics-tiktok.test.ts fails if
      // it ever appears here.
      clientKey: describeConfiguredValue(ENV.tiktok.clientKey),
      redirectUri: describeConfiguredValue(ENV.tiktok.redirectUri),
      // The value actually sent, fallback resolved, rather than the raw env var.
      scope: describeConfiguredValue(ENV.tiktok.scopes || "user.info.basic"),
    },
  };
}
