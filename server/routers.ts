import { parse as parseCookie } from "cookie";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getPerformanceProvider } from "./performance-provider";
import { COOKIE_NAME } from "../shared/const.js";
import { invokeLLM } from "./_core/llm";
import { getSessionCookieOptions } from "./_core/cookies";
import { adminProcedure, protectedProcedure, publicProcedure, router, workspaceProcedure } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import * as db from "./db";
import { hashPassword, validatePassword, verifyPassword } from "./password";
import { parsePerformanceCsv } from "./validation";

const goalTypeSchema = z.enum(["customers", "bookings", "sales", "leads", "launch", "content", "retention", "other"]);
const platformSchema = z.enum(["tiktok", "instagram", "youtube", "facebook", "pinterest", "linkedin", "email", "website", "multi"]);
const contentTypeSchema = z.enum(["image", "video", "copy", "social_post", "advertisement", "campaign", "email", "content_plan", "storyboard", "product_creative"]);
const scoreKeys = ["hook", "retention", "clarity", "emotion", "brandFit", "naturalness", "visualQuality", "artifactRisk", "offer", "cta", "conversionPotential", "platformFit", "originality", "professionalism"] as const;

type UserLike = { id: number; openId: string; name: string | null; email: string | null; loginMethod: string | null; lastSignedIn: Date };

function publicUser(user: UserLike) {
  return {
    id: user.id,
    openId: user.openId,
    name: user.name,
    email: user.email,
    loginMethod: user.loginMethod,
    lastSignedIn: user.lastSignedIn,
  };
}

function getRequestToken(req: { headers: Record<string, string | string[] | undefined> }) {
  const auth = req.headers.authorization || req.headers.Authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) return auth.slice(7).trim();
  const cookies = parseCookie(typeof req.headers.cookie === "string" ? req.headers.cookie : "");
  return cookies[COOKIE_NAME];
}

async function enforceTrpcRateLimit(ctx: { req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } } }, bucket: string, subject: string, maxRequests: number, windowMs: number) {
  const forwarded = ctx.req.headers["x-forwarded-for"];
  const address = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : ctx.req.socket?.remoteAddress || "unknown";

  // Only the database call is guarded. A failure here means the limiter itself
  // is broken, which is an infrastructure fault, not a client error: without
  // this the raw Drizzle error — full INSERT statement, column names and bound
  // parameters — escaped tRPC and was rendered to the user as the failure
  // message. Mirrors the logging and fail-closed behaviour of
  // enforceRateLimit in server/_core/rate-limit.ts.
  let result;
  try {
    result = await db.checkRateLimit({ bucket, identifier: `${address}:${subject.trim().toLowerCase()}`, maxRequests, windowMs });
  } catch (error) {
    const cause = error instanceof Error ? (error as { cause?: unknown }).cause : undefined;
    console.error(JSON.stringify({
      event: "rate_limit_error",
      bucket,
      error: error instanceof Error ? error.message : "unknown",
      causeMessage: cause instanceof Error ? cause.message : cause ? String(cause) : undefined,
      causeCode: cause && typeof cause === "object" && "code" in cause ? (cause as { code?: unknown }).code : undefined,
    }));
    // Fail closed. Falling through would let the request past an unenforced
    // limiter, which is worse than refusing it.
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Request protection is temporarily unavailable. Please try again shortly." });
  }

  if (!result.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many requests. Please try again later." });
}

async function workspaceAccess(userId: number, workspaceId: number, roles?: Array<"owner" | "admin" | "member" | "viewer">) {
  const access = await db.getWorkspaceMembership(userId, workspaceId);
  if (!access) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this workspace." });
  if (roles && !roles.includes(access.membership.role)) throw new TRPCError({ code: "FORBIDDEN", message: "This action requires workspace administrator access." });
  return access;
}

function clampScore(value: unknown, fallback = 0) {
  const number = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.min(10, Math.round(number)));
}

function contentText(response: { choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> | null } }> }) {
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => part.text || "").join("\n");
  return "";
}

function qualityDecision(overallScore: number): "reject" | "improve" | "review" | "approval_candidate" {
  if (overallScore < 6.8) return "reject";
  if (overallScore < 7.5) return "improve";
  if (overallScore < 8.5) return "review";
  return "approval_candidate";
}

async function generateAndScore(input: { desiredOutcome: string; offer?: string; message?: string; cta?: string; platform: string; type: string; businessName?: string; industry?: string; targetCustomer?: string; brandVoice?: string; improveFrom?: string; weaknesses?: string[] }) {
  const response = await invokeLLM({
    model: "gpt-5-mini",
    maxCompletionTokens: 1600,
    messages: [
      {
        role: "system",
        content: `/// LUMIÈRE • ELEVATE • CREATE • CONVERT • GROW • OPTIMIZE ///\nYou are the Lumière House content and quality engine. Create natural, specific, platform-optimized marketing work for a small business. Never guarantee revenue. Return JSON only. Quality scores must be honest, explain weaknesses, and reflect the actual draft. The score dimensions are 0–10; higher artifactRisk means higher risk and should reduce the overall score.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "Create or improve a marketing draft and critique it before approval.",
          business: { name: input.businessName, industry: input.industry, targetCustomer: input.targetCustomer, brandVoice: input.brandVoice },
          request: { desiredOutcome: input.desiredOutcome, offer: input.offer, message: input.message, cta: input.cta, platform: input.platform, type: input.type },
          previousDraft: input.improveFrom,
          knownWeaknesses: input.weaknesses,
          requiredOutput: { headline: "string", body: "string", visualBrief: "string", platformAdaptation: "object", scores: "object with hook, retention, clarity, emotion, brandFit, naturalness, visualQuality, artifactRisk, offer, cta, conversionPotential, platformFit, originality, professionalism each 0-10", critique: "string", weaknesses: "array of strings" },
        }),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "lumiere_content_review",
        strict: true,
        schema: {
          type: "object",
          properties: {
            headline: { type: "string" },
            body: { type: "string" },
            visualBrief: { type: "string" },
            platformAdaptation: {
              type: "object",
              properties: {
                caption: { type: "string" },
                subject: { type: "string" },
                previewText: { type: "string" },
                script: { type: "string" },
                hashtags: { type: "array", items: { type: "string" } },
                notes: { type: "string" },
              },
              required: ["caption", "subject", "previewText", "script", "hashtags", "notes"],
              additionalProperties: false,
            },
            scores: {
              type: "object",
              properties: Object.fromEntries(scoreKeys.map((key) => [key, { type: "number" }])),
              required: [...scoreKeys],
              additionalProperties: false,
            },
            critique: { type: "string" },
            weaknesses: { type: "array", items: { type: "string" } },
          },
          required: ["headline", "body", "visualBrief", "platformAdaptation", "scores", "critique", "weaknesses"],
          additionalProperties: false,
        },
      },
    },
  });
  const raw = contentText(response);
  if (!raw) throw new Error("The content engine returned an empty response.");
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("The content engine returned an invalid structured response.");
  }
  const scores = Object.fromEntries(scoreKeys.map((key) => [key, clampScore(parsed.scores?.[key], key === "artifactRisk" ? 4 : 6)]));
  const total = scoreKeys.reduce((sum, key) => sum + (key === "artifactRisk" ? 10 - scores[key] : scores[key]), 0);
  const overallScore = Math.round((total / (scoreKeys.length * 10)) * 100) / 10;
  return {
    headline: String(parsed.headline || "Untitled draft").slice(0, 500),
    body: String(parsed.body || "").slice(0, 12000),
    visualBrief: String(parsed.visualBrief || "").slice(0, 4000),
    platformAdaptation: parsed.platformAdaptation && typeof parsed.platformAdaptation === "object" ? parsed.platformAdaptation : {},
    scores,
    overallScore,
    critique: String(parsed.critique || "Quality review completed.").slice(0, 5000),
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.map((value: unknown) => String(value)).slice(0, 8) : [],
    decision: qualityDecision(overallScore),
  };
}

export const appRouter = router({
  system: systemRouter,
  maintenance: router({
    cleanup: adminProcedure.mutation(() => db.cleanupExpiredTemporaryRecords()),
  }),
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user ? publicUser(opts.ctx.user) : null),
    signup: publicProcedure.input(z.object({ name: z.string().trim().min(2).max(120), email: z.string().email().max(320), password: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      await enforceTrpcRateLimit(ctx, "auth.signup", input.email, 5, 15 * 60 * 1000);
      const passwordError = validatePassword(input.password);
      if (passwordError) throw new TRPCError({ code: "BAD_REQUEST", message: passwordError });
      const existing = await db.getUserByEmail(input.email);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists." });
      try {
        const user = await db.createLocalUser({ name: input.name, email: input.email, passwordHash: await hashPassword(input.password) });
        const verification = await db.createEmailVerificationToken(user.id);
        const session = await db.createSession(user.id);
        ctx.res.cookie(COOKIE_NAME, session.token, getSessionCookieOptions(ctx.req));
        return { user: publicUser(user), sessionToken: session.token, emailVerified: Boolean(user.emailVerifiedAt), verification: { status: "not_sent", message: "Account created. Email verification delivery is not configured, so no verification email was sent.", developmentToken: process.env.NODE_ENV === "production" ? undefined : verification.token } };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Could not create account." });
      }
    }),
    login: publicProcedure.input(z.object({ email: z.string().email().max(320), password: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      await enforceTrpcRateLimit(ctx, "auth.login", input.email, 10, 10 * 60 * 1000);
      const user = await db.getUserByEmail(input.email);
      if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email or password is incorrect." });
      const session = await db.createSession(user.id);
      ctx.res.cookie(COOKIE_NAME, session.token, getSessionCookieOptions(ctx.req));
      return { user: publicUser(user), sessionToken: session.token, emailVerified: Boolean(user.emailVerifiedAt) };
    }),
    requestPasswordReset: publicProcedure.input(z.object({ email: z.string().email().max(320) })).mutation(async ({ ctx, input }) => {
      await enforceTrpcRateLimit(ctx, "auth.password_reset", input.email, 5, 15 * 60 * 1000);
      const user = await db.getUserByEmail(input.email);
      if (!user) return { requested: true, delivery: "not_configured", message: "If an account exists, a reset email would be sent. Email delivery is not configured, so no email was sent." };
      const reset = await db.createPasswordResetToken(user.id);
      const developmentToken = process.env.NODE_ENV === "production" ? undefined : reset.token;
      return { requested: true, delivery: "not_configured", message: developmentToken ? "Email delivery is not configured. A development-only reset token is available for local verification." : "If an account exists, a reset email would be sent. Email delivery is not configured, so no email was sent.", developmentToken };
    }),
    resetPassword: publicProcedure.input(z.object({ token: z.string().min(20), password: z.string().min(1) })).mutation(async ({ input }) => {
      const passwordError = validatePassword(input.password);
      if (passwordError) throw new TRPCError({ code: "BAD_REQUEST", message: passwordError });
      const found = await db.getValidPasswordResetToken(input.token);
      if (!found) throw new TRPCError({ code: "BAD_REQUEST", message: "This reset link is invalid or expired." });
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available." });
      await database.update((await import("../drizzle/schema")).users).set({ passwordHash: await hashPassword(input.password) }).where((await import("drizzle-orm")).eq((await import("../drizzle/schema")).users.id, found.user.id));
      await db.consumePasswordResetToken(found.token.id);
      return { reset: true };
    }),
    verifyEmail: publicProcedure.input(z.object({ token: z.string().min(20) })).mutation(async ({ input }) => {
      const found = await db.getValidEmailVerificationToken(input.token);
      if (!found) throw new TRPCError({ code: "BAD_REQUEST", message: "This verification link is invalid or expired." });
      const user = await db.verifyEmail(found.user.id, found.token.id);
      return { verified: true, user: user ? publicUser(user) : null };
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const token = getRequestToken(ctx.req);
      if (token?.startsWith("lh_")) await db.revokeSession(token);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  workspaces: router({
    list: protectedProcedure.query(({ ctx }) => db.getWorkspacesForUser(ctx.user.id)),
    create: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(255), industry: z.string().max(160).optional(), location: z.string().max(255).optional(), timezone: z.string().max(64).optional() })).mutation(({ ctx, input }) => db.createWorkspace({ userId: ctx.user.id, ...input })),
    onboarding: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive(), step: z.number().int().min(1).max(6) })).mutation(({ ctx, input }) => db.updateWorkspaceOnboarding(input.workspaceId, input.step, ctx.user.id)),
    dashboard: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId); return db.getDashboard(input.workspaceId); }),
    business: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId); return db.getBusiness(input.workspaceId); }),
    updateBusiness: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive(), name: z.string().trim().min(2).max(255).optional(), industry: z.string().max(160).optional(), location: z.string().max(255).optional(), productsServices: z.string().max(4000).optional(), targetCustomer: z.string().max(4000).optional(), website: z.string().url().max(500).optional() })).mutation(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId, ["owner", "admin"]); const { workspaceId, ...data } = input; return db.updateBusiness(workspaceId, data); }),
  }),
  goals: router({
    list: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId); return db.listGoals(input.workspaceId); }),
    create: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive(), title: z.string().trim().min(2).max(255), goalType: goalTypeSchema, period: z.string().trim().min(2).max(120), currentPerformance: z.number().int().min(0).optional(), target: z.number().int().positive(), targetAmountCents: z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId, ["owner", "admin", "member"]); const { workspaceId, ...data } = input; return db.createGoal(workspaceId, data); }),
    summary: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId); return db.getGoalSummary(input.workspaceId); }),
  }),
  content: router({
    list: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId); return db.listContent(input.workspaceId); }),
    detail: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive(), contentItemId: z.number().int().positive() })).query(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId); const detail = await db.getContentDetail(input.workspaceId, input.contentItemId); if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Content was not found in this workspace." }); return detail; }),
    generate: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive(), goalId: z.number().int().positive().optional(), type: contentTypeSchema, platform: platformSchema, desiredOutcome: z.string().trim().min(8).max(2000), offer: z.string().max(2000).optional(), message: z.string().max(2000).optional(), cta: z.string().max(255).optional() })).mutation(async ({ ctx, input }) => {
      await enforceTrpcRateLimit(ctx, "ai.generate", `user:${ctx.user.id}:workspace:${input.workspaceId}`, 10, 10 * 60 * 1000);
      await workspaceAccess(ctx.user.id, input.workspaceId, ["owner", "admin", "member"]);
      const draft = await db.createContentDraft({
        workspaceId: input.workspaceId,
        createdByUserId: ctx.user.id,
        goalId: input.goalId,
        type: input.type,
        platform: input.platform,
        desiredOutcome: input.desiredOutcome,
        offer: input.offer,
        message: input.message,
        cta: input.cta,
      });
      const job = await db.enqueueBackgroundJob({
        workspaceId: input.workspaceId,
        kind: "content.generate",
        createdByUserId: ctx.user.id,
        payload: { contentItemId: draft.id, type: input.type, platform: input.platform },
      });
      if (!job || !(await db.startBackgroundJob(job.id))) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not start the durable content job." });
      }
      try {
        const [business, brand] = await Promise.all([db.getBusiness(input.workspaceId), db.getDashboard(input.workspaceId).then((dashboard) => dashboard?.business ? db.getBusiness(input.workspaceId) : undefined)]);
        const generated = await generateAndScore({ ...input, businessName: business?.name, industry: business?.industry || undefined, targetCustomer: business?.targetCustomer || undefined, brandVoice: brand ? "Clear, warm, confident, and human." : undefined });
        const result = await db.updateContentRevision({ workspaceId: input.workspaceId, userId: ctx.user.id, contentItemId: draft.id, headline: generated.headline, body: generated.body, visualBrief: generated.visualBrief, platformAdaptation: generated.platformAdaptation, status: generated.decision === "approval_candidate" ? "approval_candidate" : generated.decision === "improve" ? "needs_improvement" : "draft" });
        const latestRevision = result?.revisions?.[0];
        if (latestRevision) {
          await db.createQualityReview({ workspaceId: input.workspaceId, contentItemId: draft.id, revisionId: latestRevision.id, scores: generated.scores, overallScore: generated.overallScore, critique: generated.critique, weaknesses: generated.weaknesses, decision: generated.decision });
        }
        await db.completeBackgroundJob(job.id);
        return db.getContentDetail(input.workspaceId, draft.id);
      } catch (error) {
        await db.failBackgroundJob(job.id, error instanceof Error ? error.message : "The content engine is unavailable.", new Date(Date.now() + Math.min(15 * 60 * 1000, 2 ** Math.max(0, job.attempts) * 1000)));
        await db.updateContentRevision({ workspaceId: input.workspaceId, userId: ctx.user.id, contentItemId: draft.id, headline: "Generation blocked", body: error instanceof Error ? error.message : "The content engine is unavailable.", status: "blocked" });
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "The content engine is unavailable. No content was approved or published." });
      }
    }),
    improve: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive(), contentItemId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await enforceTrpcRateLimit(ctx, "ai.improve", `user:${ctx.user.id}:workspace:${input.workspaceId}`, 10, 10 * 60 * 1000);
      await workspaceAccess(ctx.user.id, input.workspaceId, ["owner", "admin", "member"]);
      const detail = await db.getContentDetail(input.workspaceId, input.contentItemId);
      if (!detail || !detail.revisions[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Content draft was not found." });
      const previous = detail.revisions[0];
      const job = await db.enqueueBackgroundJob({ workspaceId: input.workspaceId, kind: "content.improve", createdByUserId: ctx.user.id, payload: { contentItemId: input.contentItemId } });
      if (!job || !(await db.startBackgroundJob(job.id))) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not start the durable content job." });
      try {
      const generated = await generateAndScore({ desiredOutcome: detail.item.desiredOutcome, offer: detail.item.offer || undefined, message: detail.item.message || undefined, cta: detail.item.cta || undefined, platform: detail.item.platform, type: detail.item.type, improveFrom: previous.body || undefined, weaknesses: detail.reviews[0]?.weaknesses as string[] | undefined });
      const result = await db.updateContentRevision({ workspaceId: input.workspaceId, userId: ctx.user.id, contentItemId: input.contentItemId, headline: generated.headline, body: generated.body, visualBrief: generated.visualBrief, platformAdaptation: generated.platformAdaptation, status: generated.decision === "approval_candidate" ? "approval_candidate" : generated.decision === "improve" ? "needs_improvement" : "draft" });
      const latestRevision = result?.revisions?.[0];
      if (latestRevision) await db.createQualityReview({ workspaceId: input.workspaceId, contentItemId: input.contentItemId, revisionId: latestRevision.id, scores: generated.scores, overallScore: generated.overallScore, critique: generated.critique, weaknesses: generated.weaknesses, decision: generated.decision });
      await db.completeBackgroundJob(job.id);
      return db.getContentDetail(input.workspaceId, input.contentItemId);
      } catch (error) {
        await db.failBackgroundJob(job.id, error instanceof Error ? error.message : "The content engine is unavailable.", new Date(Date.now() + Math.min(15 * 60 * 1000, 2 ** Math.max(0, job.attempts) * 1000)));
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "The content engine is unavailable." });
      }
    }),
    submitForApproval: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive(), contentItemId: z.number().int().positive(), why: z.string().trim().min(8).max(1000) })).mutation(async ({ ctx, input }) => {
      await workspaceAccess(ctx.user.id, input.workspaceId, ["owner", "admin", "member"]);
      const detail = await db.getContentDetail(input.workspaceId, input.contentItemId);
      if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Content draft was not found." });
      return db.createApproval({ workspaceId: input.workspaceId, contentItemId: input.contentItemId, requestedByUserId: ctx.user.id, actionType: "approve_content", what: detail.item.desiredOutcome, why: input.why, whereTo: detail.item.platform, expectedPurpose: "Move a quality-reviewed draft toward human-approved publishing.", risk: detail.item.type === "advertisement" ? "high" : "medium" });
    }),
  }),
  approvals: router({
    list: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId); return db.listApprovals(input.workspaceId); }),
    decide: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive(), approvalId: z.number().int().positive(), status: z.enum(["approved", "edited", "rejected", "scheduled", "paused"]) })).mutation(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId, ["owner", "admin"]); return db.decideApproval({ ...input, userId: ctx.user.id }); }),
  }),
  campaigns: router({
    list: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId); return db.listCampaigns(input.workspaceId); }),
    create: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive(), name: z.string().trim().min(2).max(255), objective: z.string().trim().max(4000).optional(), goalId: z.number().int().positive().optional(), offerId: z.number().int().positive().optional(), platforms: z.array(platformSchema).max(10).optional(), startAt: z.string().datetime().optional(), endAt: z.string().datetime().optional() })).mutation(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId, ["owner", "admin", "member"]); return db.createCampaign({ ...input, userId: ctx.user.id, startAt: input.startAt ? new Date(input.startAt) : undefined, endAt: input.endAt ? new Date(input.endAt) : undefined }); }),
  }),
  clients: router({
    list: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId); return db.listClients(input.workspaceId); }),
    create: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive(), name: z.string().trim().min(2).max(255), email: z.string().email().max(320).optional(), phone: z.string().max(64).optional(), segment: z.string().max(120).optional(), consentStatus: z.enum(["unknown", "granted", "revoked"]).optional(), notes: z.string().max(4000).optional() })).mutation(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId, ["owner", "admin", "member"]); const { workspaceId, ...data } = input; return db.createClient(workspaceId, data); }),
    update: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive(), clientId: z.number().int().positive(), name: z.string().trim().min(2).max(255).optional(), email: z.string().email().max(320).optional(), phone: z.string().max(64).optional(), segment: z.string().max(120).optional(), consentStatus: z.enum(["unknown", "granted", "revoked"]).optional(), notes: z.string().max(4000).optional() })).mutation(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId, ["owner", "admin", "member"]); const { workspaceId, clientId, ...data } = input; return db.updateClient(workspaceId, clientId, data); }),
  }),
  automations: router({
    list: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId); return db.listAutomations(input.workspaceId); }),
    create: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive(), name: z.string().trim().min(2).max(255), triggerType: z.string().trim().min(2).max(120), conditions: z.record(z.string(), z.unknown()).optional(), quietHours: z.record(z.string(), z.unknown()).optional(), actionLimits: z.record(z.string(), z.unknown()).optional(), requiresApproval: z.boolean().default(true) })).mutation(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId, ["owner", "admin"]); return db.createAutomation({ ...input, createdByUserId: ctx.user.id }); }),
    toggle: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive(), automationId: z.number().int().positive(), enabled: z.boolean() })).mutation(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId, ["owner", "admin"]); return db.toggleAutomation(input.workspaceId, input.automationId, input.enabled); }),
    run: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive(), automationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId, ["owner", "admin"]); return db.createAutomationRun({ workspaceId: input.workspaceId, automationId: input.automationId, status: "blocked", reason: "No authorized outbound connector is connected. Lumière did not send or publish anything." }); }),
  }),
  connectors: router({
    list: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId); return db.listConnectors(input.workspaceId); }),
    connect: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive(), provider: z.string().min(2).max(120) })).mutation(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId, ["owner", "admin"]); if (input.provider === "tiktok") { return { redirectUrl: `/api/oauth/tiktok/start?workspaceId=${input.workspaceId}` }; } const message = `Official OAuth for ${input.provider} is not configured in this environment. No connector was connected.`; await db.recordConnectorAttempt({ workspaceId: input.workspaceId, userId: ctx.user.id, provider: input.provider, outcome: "authorization_required", message }); throw new TRPCError({ code: "PRECONDITION_FAILED", message }); }),
    retry: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive(), provider: z.string().min(2).max(120) })).mutation(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId, ["owner", "admin"]); const message = `Authorization retry for ${input.provider} is waiting for the provider credentials and approved redirect URI. No connector was connected.`; await db.recordConnectorAttempt({ workspaceId: input.workspaceId, userId: ctx.user.id, provider: input.provider, outcome: "authorization_required", message }); throw new TRPCError({ code: "PRECONDITION_FAILED", message }); }),
  }),
  analytics: router({
    list: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId); return db.listAnalytics(input.workspaceId); }),
    record: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive(), eventType: z.string().trim().min(2).max(120), value: z.number().int().optional(), campaignId: z.number().int().positive().optional(), contentItemId: z.number().int().positive().optional(), metadata: z.record(z.string(), z.unknown()).optional() })).mutation(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId); return db.recordAnalytics({ ...input, userId: ctx.user.id }); }),
    learning: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId); return db.getLearning(input.workspaceId); }),
    breakdown: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId); return db.getResultsBreakdown(input.workspaceId); }),
    comparison: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive(), periodDays: z.number().int().min(7).max(90).default(30) })).query(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId); return db.getResultsComparison(input.workspaceId, input.periodDays); }),
  }),
  performance: router({
    listImports: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId); return db.listPerformanceImports(input.workspaceId); }),
    importCsv: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive(), source: z.string().trim().min(2).max(120), csv: z.string().trim().min(1).max(200000) })).mutation(async ({ ctx, input }) => {
      await workspaceAccess(ctx.user.id, input.workspaceId, ["owner", "admin", "member"]);
      const rows = parsePerformanceCsv(input.csv);
      if (!rows.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Add at least one CSV data row." });
      return db.createPerformanceImport({ workspaceId: input.workspaceId, userId: ctx.user.id, source: input.source, rows });
    }),
    importFromConnector: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive(), provider: z.string().trim().min(2).max(120), idempotencyKey: z.string().trim().min(8).max(255) })).mutation(async ({ ctx, input }) => {
      await enforceTrpcRateLimit(ctx, "performance.import", `user:${ctx.user.id}:workspace:${input.workspaceId}`, 20, 10 * 60 * 1000);
      await workspaceAccess(ctx.user.id, input.workspaceId, ["owner", "admin", "member"]);
      const connector = (await db.listConnectors(input.workspaceId)).find((item) => item.provider === input.provider);
      if (!connector || connector.status !== "connected") throw new TRPCError({ code: "PRECONDITION_FAILED", message: `No authorized ${input.provider} performance connector is connected. No external data was imported.` });
      const provider = getPerformanceProvider(input.provider);
      if (provider.status !== "ready") throw new TRPCError({ code: "PRECONDITION_FAILED", message: `${provider.reason} No external data was imported.` });
      const job = await db.enqueueBackgroundJob({ workspaceId: input.workspaceId, kind: "performance.import", idempotencyKey: `${input.provider}:${input.idempotencyKey}`, createdByUserId: ctx.user.id, payload: { provider: input.provider, source: input.provider, requestedAt: new Date().toISOString() } });
      return { queued: true, imported: false, job };
    }),
  }),
  schedules: router({
    list: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId); return db.listSchedules(input.workspaceId); }),
    create: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive(), name: z.string().trim().min(2).max(255), scheduleType: z.enum(["content", "performance_import", "automation_check"]), targetId: z.number().int().positive().optional(), runAt: z.string().datetime(), timezone: z.string().max(64).optional(), requiresApproval: z.boolean().default(true) })).mutation(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId, ["owner", "admin"]); const runAt = new Date(input.runAt); if (runAt.getTime() <= Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "Schedule time must be in the future." }); return db.createSchedule({ workspaceId: input.workspaceId, userId: ctx.user.id, name: input.name, scheduleType: input.scheduleType, targetId: input.targetId, runAt, timezone: input.timezone, requiresApproval: input.requiresApproval }); }),
    toggle: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive(), scheduleId: z.number().int().positive(), enabled: z.boolean() })).mutation(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId, ["owner", "admin"]); return db.toggleSchedule(input.workspaceId, input.scheduleId, input.enabled); }),
    runCheck: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive(), scheduleId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await enforceTrpcRateLimit(ctx, "schedule.run", `user:${ctx.user.id}:workspace:${input.workspaceId}`, 30, 10 * 60 * 1000); await workspaceAccess(ctx.user.id, input.workspaceId, ["owner", "admin"]); return db.runScheduleCheck(input.workspaceId, input.scheduleId); }),
  }),
  jobs: router({
    list: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId); return db.listBackgroundJobs(input.workspaceId); }),
    cancel: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive(), jobId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId, ["owner", "admin"]); return db.cancelBackgroundJob(input.workspaceId, input.jobId); }),
  }),
  billing: router({
    subscription: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive() })).query(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId); return db.getSubscription(input.workspaceId); }),
    usage: workspaceProcedure.input(z.object({ workspaceId: z.number().int().positive(), period: z.string().min(4).max(32) })).query(async ({ ctx, input }) => { await workspaceAccess(ctx.user.id, input.workspaceId); return db.getUsage(input.workspaceId, input.period); }),
  }),
});

export type AppRouter = typeof appRouter;
