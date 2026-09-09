import { describe, expect, it } from "vitest";
import { STUDIO_COMMANDS, parseStudioCommand } from "../shared/studio-commands";

describe("/TRENDS command", () => {
  it("is registered and available", () => {
    expect(STUDIO_COMMANDS.TRENDS.available).toBe(true);
  });

  it("parses a topic the same way /SCRIPT does", () => {
    const result = parseStudioCommand("/TRENDS lash extension aftercare");
    expect(result).toEqual({ ok: true, name: "TRENDS", topic: "lash extension aftercare" });
  });

  it("accepts lowercase", () => {
    const result = parseStudioCommand("/trends balayage for dark hair");
    expect(result.ok && result.name).toBe("TRENDS");
  });

  it("rejects a bare command with no topic", () => {
    expect(parseStudioCommand("/TRENDS")).toMatchObject({ ok: false, reason: "topic_too_short" });
  });
});

describe("YouTube error mapping", () => {
  /**
   * Google answers 403 for several unrelated situations. Collapsing them into
   * one message would send the operator hunting for the wrong problem: a spent
   * daily quota and a key that was never allowed to call the API need
   * completely different actions.
   */
  it("distinguishes the failures an operator must tell apart", async () => {
    const { describeGoogleError } = await import("../server/_core/youtube");
    const err = (reason: string) => JSON.stringify({ error: { errors: [{ reason }] } });

    expect(describeGoogleError(403, err("quotaExceeded"))).toMatch(/quota is used up/i);
    expect(describeGoogleError(403, err("accessNotConfigured"))).toMatch(/not enabled/i);
    expect(describeGoogleError(400, err("keyInvalid"))).toMatch(/YOUTUBE_API_KEY/);

    // The exact failure the supplied OAuth client credentials produced.
    expect(describeGoogleError(401, "{}")).toMatch(/plain API key, not an OAuth client id/i);

    // All four must be distinguishable, not one generic string.
    const messages = [
      describeGoogleError(403, err("quotaExceeded")),
      describeGoogleError(403, err("accessNotConfigured")),
      describeGoogleError(400, err("keyInvalid")),
      describeGoogleError(401, "{}"),
    ];
    expect(new Set(messages).size).toBe(4);
  });

  it("falls back to a safe message on an unrecognised error", () => {
    // Malformed bodies must not throw while building an error message.
    return import("../server/_core/youtube").then(({ describeGoogleError }) => {
      expect(describeGoogleError(500, "not json at all")).toMatch(/unavailable right now \(500\)/i);
    });
  });

  it("reports a missing key rather than pretending the topic failed", async () => {
    const previous = process.env.YOUTUBE_API_KEY;
    delete process.env.YOUTUBE_API_KEY;
    try {
      // Imported after clearing the env: env.ts snapshots process.env on load.
      const { fetchTrendingVideos } = await import(`../server/_core/youtube?nokey=${Date.now()}`);
      await expect(fetchTrendingVideos("anything")).rejects.toThrow(/not configured/i);
    } finally {
      if (previous !== undefined) process.env.YOUTUBE_API_KEY = previous;
    }
  });
});
