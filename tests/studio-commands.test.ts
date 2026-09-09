import { describe, expect, it } from "vitest";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";
import { STUDIO_TOPIC_MAX, STUDIO_TOPIC_MIN, parseStudioCommand } from "../shared/studio-commands";

function createContext(user: TrpcContext["user"] = null): TrpcContext {
  return {
    user,
    req: { protocol: "https", hostname: "localhost", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("studio slash-command parsing", () => {
  it("parses a /SCRIPT command into its name and topic", () => {
    const result = parseStudioCommand("/SCRIPT overdue rebooking reminder for a lash client");
    expect(result).toEqual({ ok: true, name: "SCRIPT", topic: "overdue rebooking reminder for a lash client" });
  });

  it("accepts a lowercase command name", () => {
    const result = parseStudioCommand("/script overdue rebooking reminder");
    expect(result.ok && result.name).toBe("SCRIPT");
  });

  it("keeps slashes and punctuation inside the topic intact", () => {
    const result = parseStudioCommand("/SCRIPT lash fills — before/after, 50% fuller");
    expect(result.ok && result.topic).toBe("lash fills — before/after, 50% fuller");
  });

  it("rejects input that does not start with a slash", () => {
    const result = parseStudioCommand("SCRIPT something about lashes");
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toBe("missing_slash");
  });

  it("rejects an unknown command", () => {
    const result = parseStudioCommand("/NONSENSE do a thing");
    expect(!result.ok && result.reason).toBe("unknown_command");
  });

  it("rejects a command that is declared but has no generator yet", () => {
    const result = parseStudioCommand("/CAPTION a caption about lashes");
    expect(!result.ok && result.reason).toBe("unavailable_command");
    expect(!result.ok && result.message).toContain("not available yet");
  });

  it("rejects a topic that is too short to act on", () => {
    const result = parseStudioCommand("/SCRIPT hi");
    expect(!result.ok && result.reason).toBe("topic_too_short");
  });

  it("rejects a topic beyond the accepted length", () => {
    const result = parseStudioCommand(`/SCRIPT ${"a".repeat(STUDIO_TOPIC_MAX + 1)}`);
    expect(!result.ok && result.reason).toBe("topic_too_long");
  });

  it("accepts a topic exactly at the minimum length", () => {
    const result = parseStudioCommand(`/SCRIPT ${"a".repeat(STUDIO_TOPIC_MIN)}`);
    expect(result.ok).toBe(true);
  });

  it("treats a bare command with no topic as too short rather than unknown", () => {
    const result = parseStudioCommand("/SCRIPT");
    expect(!result.ok && result.reason).toBe("topic_too_short");
  });
});

describe("studio.runCommand access control", () => {
  it("refuses an unauthenticated caller before reaching the script engine", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(
      caller.studio.runCommand({ workspaceId: 1, command: "/SCRIPT overdue rebooking reminder", platform: "tiktok" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
