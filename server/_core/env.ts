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
    tiktokConfigured: Boolean(ENV.tiktok.clientKey && ENV.tiktok.clientSecret && ENV.tiktok.redirectUri && tiktokRedirectValid),
    tiktok: { configured: Boolean(ENV.tiktok.clientKey && ENV.tiktok.clientSecret && ENV.tiktok.redirectUri && tiktokRedirectValid), redirectValid: tiktokRedirectValid, missing: tiktokMissing },
  };
}
