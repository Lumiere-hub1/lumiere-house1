import type { Request, Response } from "express";
import { checkRateLimit } from "../db";

export function requestIdentifier(req: Request, subject?: string) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.ip || "unknown";
  return subject ? `${ip}:${subject.trim().toLowerCase()}` : ip;
}

export async function enforceRateLimit(
  req: Request,
  res: Response,
  input: { bucket: string; subject?: string; maxRequests: number; windowMs: number },
) {
  try {
    const result = await checkRateLimit({ ...input, identifier: requestIdentifier(req, input.subject) });
    res.setHeader("X-RateLimit-Limit", String(input.maxRequests));
    res.setHeader("X-RateLimit-Remaining", String(result.remaining));
    res.setHeader("X-RateLimit-Reset", result.resetAt.toISOString());
    if (!result.allowed) {
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return false;
    }
    return true;
  } catch (error) {
    const cause = error instanceof Error ? (error as { cause?: unknown }).cause : undefined;
    console.error(JSON.stringify({
      event: "rate_limit_error",
      bucket: input.bucket,
      error: error instanceof Error ? error.message : "unknown",
      causeMessage: cause instanceof Error ? cause.message : cause ? String(cause) : undefined,
      causeCode: cause && typeof cause === "object" && "code" in cause ? (cause as { code?: unknown }).code : undefined,
    }));
    res.status(503).json({ error: "Request protection is temporarily unavailable." });
    return false;
  }
}
