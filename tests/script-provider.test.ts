import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The two credentials that reach Claude look nothing alike and are not
 * interchangeable — an "ABSK…" Bedrock key put in ANTHROPIC_API_KEY is rejected
 * by api.anthropic.com with a bare 401, which is exactly the failure this
 * project already lost time to. These cover the routing decision itself, since
 * getting it wrong is silent: the app stays up and simply never generates.
 *
 * ENV is captured at module load, so each case resets the module registry and
 * re-imports rather than mutating a live object.
 */
const KEYS = [
  "ANTHROPIC_API_KEY",
  "AWS_BEARER_TOKEN_BEDROCK",
  "BEDROCK_AWS_REGION",
  "AWS_REGION",
  "AWS_DEFAULT_REGION",
] as const;

let saved: Record<string, string | undefined> = {};

async function loadWith(env: Partial<Record<(typeof KEYS)[number], string>>) {
  for (const key of KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(env)) process.env[key] = value;
  vi.resetModules();
  return import("../server/_core/anthropic");
}

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  vi.resetModules();
});

describe("script provider resolution", () => {
  it("uses Bedrock when a Bedrock key is present", async () => {
    const mod = await loadWith({ AWS_BEARER_TOKEN_BEDROCK: "ABSKtest", BEDROCK_AWS_REGION: "us-east-1" });
    expect(mod.resolveScriptProvider()).toBe("bedrock");
    expect(mod.isAnthropicConfigured()).toBe(true);
  });

  it("uses Anthropic's own API when only an sk-ant key is present", async () => {
    const mod = await loadWith({ ANTHROPIC_API_KEY: "sk-ant-test" });
    expect(mod.resolveScriptProvider()).toBe("anthropic");
    expect(mod.isAnthropicConfigured()).toBe(true);
  });

  it("prefers Bedrock when both are set, so the AWS balance is the one spent", async () => {
    const mod = await loadWith({
      ANTHROPIC_API_KEY: "sk-ant-test",
      AWS_BEARER_TOKEN_BEDROCK: "ABSKtest",
      BEDROCK_AWS_REGION: "us-east-1",
    });
    expect(mod.resolveScriptProvider()).toBe("bedrock");
  });

  it("reports nothing configured when neither credential is set", async () => {
    const mod = await loadWith({});
    expect(mod.resolveScriptProvider()).toBe("none");
    expect(mod.isAnthropicConfigured()).toBe(false);
  });

  it("names BEDROCK_AWS_REGION when a Bedrock key has no region", async () => {
    const mod = await loadWith({ AWS_BEARER_TOKEN_BEDROCK: "ABSKtest" });
    // Bedrock has no default region, so this must fail loudly at the point of
    // use rather than resolving to an unreachable hostname mid-request.
    await expect(mod.generateScript({ topic: "lash aftercare", platform: "instagram" })).rejects.toThrow(/BEDROCK_AWS_REGION/);
  });

  it("falls back to AWS_REGION when BEDROCK_AWS_REGION is unset", async () => {
    await loadWith({ AWS_BEARER_TOKEN_BEDROCK: "ABSKtest", AWS_REGION: "eu-west-1" });
    // Read through diagnostics rather than by attempting a generation, which
    // would put a network round trip inside the test suite.
    const { getRuntimeDiagnostics } = await import("../server/_core/env");
    expect(getRuntimeDiagnostics().scriptProvider).toBe("bedrock");
  });

  it("distinguishes a Bedrock key with no region from a working one in diagnostics", async () => {
    await loadWith({ AWS_BEARER_TOKEN_BEDROCK: "ABSKtest" });
    const { getRuntimeDiagnostics } = await import("../server/_core/env");
    const diagnostics = getRuntimeDiagnostics();
    // Half-configured must not read as configured, or the diagnostics endpoint
    // reports a working script engine that fails on first use.
    expect(diagnostics.scriptProvider).toBe("bedrock-missing-region");
    expect(diagnostics.anthropicConfigured).toBe(false);
  });

  it("degrades to null instead of throwing when the support bot has no credential", async () => {
    const mod = await loadWith({});
    await expect(mod.generatePlainText({ system: "s", prompt: "p", maxTokens: 16 })).resolves.toBeNull();
  });
});
