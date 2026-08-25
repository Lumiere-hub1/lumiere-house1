import { describe, expect, it } from "vitest";
import { isAllowedRedirectUri } from "../server/_core/oauth";

function request(host = "api.example.test") {
  return {
    protocol: "https",
    get: (key: string) => (key === "host" ? host : undefined),
    headers: {},
  } as any;
}

describe("OAuth redirect security", () => {
  it("allows only the request-origin callback path for web OAuth", () => {
    const req = request();
    expect(isAllowedRedirectUri(req, "https://api.example.test/api/oauth/callback")).toBe(true);
    expect(isAllowedRedirectUri(req, "https://attacker.example/api/oauth/callback")).toBe(false);
    expect(isAllowedRedirectUri(req, "https://api.example.test/redirect?to=https://attacker.example")).toBe(false);
  });

  it("allows the app deep-link callback but rejects other custom schemes", () => {
    const req = request();
    expect(isAllowedRedirectUri(req, "manus20240115103045:///oauth/callback")).toBe(true);
    expect(isAllowedRedirectUri(req, "javascript:///oauth/callback")).toBe(false);
  });
});
