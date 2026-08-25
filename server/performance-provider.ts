import { ENV, getRuntimeDiagnostics } from "./_core/env";

export type PerformanceProviderStatus = "ready" | "authorization_required" | "unsupported";

export type PerformanceImportRequest = {
  workspaceId: number;
  provider: string;
  idempotencyKey: string;
};

export type PerformanceProvider = {
  provider: "tiktok";
  status: PerformanceProviderStatus;
  reason: string;
};

export function getPerformanceProvider(provider: string): PerformanceProvider {
  if (provider !== "tiktok") return { provider: "tiktok", status: "unsupported", reason: `No approved performance provider adapter exists for ${provider}.` };
  const diagnostics = getRuntimeDiagnostics();
  if (!diagnostics.tiktokConfigured) {
    const missing = diagnostics.tiktok.missing.length ? ` Missing: ${diagnostics.tiktok.missing.join(", ")}.` : " Redirect configuration is malformed.";
    return { provider: "tiktok", status: "authorization_required", reason: `TikTok performance import is waiting for approved credentials and redirect configuration.${missing}` };
  }
  if (!ENV.tiktok.clientKey || !ENV.tiktok.clientSecret || !ENV.tiktok.redirectUri) {
    return { provider: "tiktok", status: "authorization_required", reason: "TikTok performance import is waiting for approved credentials and redirect configuration." };
  }
  return { provider: "tiktok", status: "ready", reason: "TikTok configuration is present; import execution remains authorization-gated." };
}
