import { describe, expect, it } from "vitest";
import { getPerformanceProvider } from "../server/performance-provider";

describe("performance provider boundary", () => {
  it("rejects unsupported providers without external calls", () => {
    const result = getPerformanceProvider("unknown-provider");
    expect(result.status).toBe("unsupported");
    expect(result.reason).toContain("No approved performance provider adapter");
  });

  it("reports TikTok authorization requirements truthfully", () => {
    const result = getPerformanceProvider("tiktok");
    expect(["authorization_required", "ready"]).toContain(result.status);
    expect(result.provider).toBe("tiktok");
    expect(result.reason).toBeTruthy();
  });
});
