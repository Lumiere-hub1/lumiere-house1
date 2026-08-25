import { describe, expect, it } from "vitest";

import {
  createOpaqueToken,
  hashOpaqueToken,
  hashPassword,
  validatePassword,
  verifyPassword,
} from "../server/password";

describe("local account security primitives", () => {
  it("enforces the documented password policy", () => {
    expect(validatePassword("short")).toContain("8 characters");
    expect(validatePassword("lowercase1!")).toContain("uppercase");
    expect(validatePassword("UPPERCASE1!")).toContain("lowercase");
    expect(validatePassword("Password!")).toContain("number");
    expect(validatePassword("Password1")).toContain("special");
    expect(validatePassword("Lumiere!2026")).toBeNull();
  });

  it("hashes and verifies passwords without storing the cleartext", async () => {
    const password = "Lumiere!2026";
    const encoded = await hashPassword(password);

    expect(encoded).toMatch(/^scrypt\$[a-f0-9]+\$[a-f0-9]+$/);
    expect(encoded).not.toContain(password);
    expect(await verifyPassword(password, encoded)).toBe(true);
    expect(await verifyPassword("Wrong!2026", encoded)).toBe(false);
    expect(await verifyPassword(password, "not-a-valid-hash")).toBe(false);
  });

  it("creates opaque reset/session tokens and hashes them deterministically", () => {
    const token = createOpaqueToken();
    expect(token.length).toBeGreaterThan(30);
    expect(hashOpaqueToken(token)).toHaveLength(64);
    expect(hashOpaqueToken(token)).toBe(hashOpaqueToken(token));
    expect(hashOpaqueToken(token)).not.toBe(hashOpaqueToken(createOpaqueToken()));
  });
});
