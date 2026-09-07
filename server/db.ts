import { and, asc, desc, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  analyticsEvents,
  authSessions,
  approvals,
  auditLogs,
  automationRuns,
  automations,
  brands,
  businesses,
  campaigns,
  clients,
  connectors,
  contentItems,
  contentRevisions,
  emailVerificationTokens,
  goals,
  learning,
  offers,
  passwordResetTokens,
  performanceImports,
  performanceImportRows,
  qualityReviews,
  subscriptions,
  schedules,
  scheduleRuns,
  usage,
  oauthStates,
  backgroundJobs,
  rateLimitBuckets,
  webhookReceipts,
  users,
  workspaceMembers,
  workspaces,
  type InsertUser,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { createOpaqueToken, hashOpaqueToken } from "./password";
import { isWithinQuietHours } from "./validation";
import { comparePeriods, summarizeCampaignEvents } from "../shared/results";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      // mysql2's own URL parser does not understand "ssl-mode=REQUIRED" (a
      // MySQL-CLI/PlanetScale-style param), so hosts like Aiven that require
      // TLS need an explicit ssl option passed alongside the connection URI.
      const pool = mysql.createPool({ uri: ENV.databaseUrl, ssl: { rejectUnauthorized: false } });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

function requireDb() {
  if (!_db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  return _db;
}

export async function cleanupExpiredTemporaryRecords(now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  const [oauthResult, resetResult, verificationResult, rateLimitResult, webhookResult] = await Promise.all([
    db.delete(oauthStates).where(lt(oauthStates.expiresAt, now)),
    db.delete(passwordResetTokens).where(lt(passwordResetTokens.expiresAt, now)),
    db.delete(emailVerificationTokens).where(lt(emailVerificationTokens.expiresAt, now)),
    db.delete(rateLimitBuckets).where(lt(rateLimitBuckets.windowStart, new Date(now.getTime() - 24 * 60 * 60 * 1000))),
    db.delete(webhookReceipts).where(lt(webhookReceipts.expiresAt, now)),
  ]);
  const removed = {
    oauthStates: Number((oauthResult as any)?.[0]?.affectedRows ?? (oauthResult as any)?.affectedRows ?? 0),
    passwordResetTokens: Number((resetResult as any)?.[0]?.affectedRows ?? (resetResult as any)?.affectedRows ?? 0),
    emailVerificationTokens: Number((verificationResult as any)?.[0]?.affectedRows ?? (verificationResult as any)?.affectedRows ?? 0),
    rateLimitBuckets: Number((rateLimitResult as any)?.[0]?.affectedRows ?? (rateLimitResult as any)?.affectedRows ?? 0),
    webhookReceipts: Number((webhookResult as any)?.[0]?.affectedRows ?? (webhookResult as any)?.affectedRows ?? 0),
  };
  await db.insert(auditLogs).values({ action: "system.temporary_records.cleaned", metadata: removed });
  return removed;
}

export async function checkRateLimit(input: { bucket: string; identifier: string; maxRequests: number; windowMs: number; now?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  const now = input.now ?? new Date();
  const windowStartMs = Math.floor(now.getTime() / input.windowMs) * input.windowMs;
  const windowStart = new Date(windowStartMs);
  const bucketKey = `${input.bucket}:${hashOpaqueToken(input.identifier).slice(0, 32)}`;
  await db.insert(rateLimitBuckets).values({ bucketKey, windowStart, requestCount: 1 }).onDuplicateKeyUpdate({
    set: {
      windowStart: sql`IF(${rateLimitBuckets.windowStart} = ${windowStart}, ${rateLimitBuckets.windowStart}, ${windowStart})`,
      requestCount: sql`IF(${rateLimitBuckets.windowStart} = ${windowStart}, ${rateLimitBuckets.requestCount} + 1, 1)`,
    },
  });
  const row = await db.select().from(rateLimitBuckets).where(eq(rateLimitBuckets.bucketKey, bucketKey)).limit(1);
  const requestCount = row[0]?.requestCount ?? input.maxRequests + 1;
  return { allowed: requestCount <= input.maxRequests, requestCount, remaining: Math.max(0, input.maxRequests - requestCount), resetAt: new Date(windowStartMs + input.windowMs) };
}

export async function recordWebhookReceipt(input: { provider: string; eventId: string; signatureHash: string; metadata?: Record<string, unknown>; expiresAt: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  try {
    await db.insert(webhookReceipts).values({ provider: input.provider, eventId: input.eventId, signatureHash: input.signatureHash, metadata: input.metadata ?? null, expiresAt: input.expiresAt, status: "received" });
    return { accepted: true, duplicate: false };
  } catch (error) {
    if (String(error).toLowerCase().includes("duplicate") || String(error).toLowerCase().includes("unique")) return { accepted: false, duplicate: true };
    throw error;
  }
}

export async function createOAuthState(input: { redirectUri: string; provider?: string; expiresInMs?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  const state = createOpaqueToken();
  const expiresAt = new Date(Date.now() + (input.expiresInMs ?? 10 * 60 * 1000));
  await db.insert(oauthStates).values({
    stateHash: hashOpaqueToken(state),
    redirectUri: input.redirectUri,
    provider: input.provider ?? "manus",
    expiresAt,
  });
  return { state, expiresAt };
}

export async function consumeOAuthState(state: string, provider = "manus") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  const stateHash = hashOpaqueToken(state);
  const consumedAt = new Date();
  const updateResult = await db.update(oauthStates).set({ consumedAt }).where(and(
    eq(oauthStates.stateHash, stateHash),
    eq(oauthStates.provider, provider),
    isNull(oauthStates.consumedAt),
    gt(oauthStates.expiresAt, consumedAt),
  ));
  const affectedRows = Number((updateResult as any)?.[0]?.affectedRows ?? (updateResult as any)?.affectedRows ?? 0);
  if (affectedRows !== 1) return undefined;
  const consumed = await db.select().from(oauthStates).where(and(
    eq(oauthStates.stateHash, stateHash),
    eq(oauthStates.provider, provider),
    eq(oauthStates.consumedAt, consumedAt),
  )).limit(1);
  return consumed[0];
}

export async function enqueueBackgroundJob(input: { workspaceId: number; kind: string; idempotencyKey?: string; payload?: Record<string, unknown>; createdByUserId?: number; maxAttempts?: number; availableAt?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  if (input.idempotencyKey) {
    const existing = await db.select().from(backgroundJobs).where(and(eq(backgroundJobs.workspaceId, input.workspaceId), eq(backgroundJobs.kind, input.kind), eq(backgroundJobs.idempotencyKey, input.idempotencyKey))).limit(1);
    if (existing[0]) return existing[0];
  }
  const result = await db.insert(backgroundJobs).values({
    workspaceId: input.workspaceId,
    kind: input.kind,
    idempotencyKey: input.idempotencyKey ?? null,
    payload: input.payload ?? null,
    createdByUserId: input.createdByUserId ?? null,
    maxAttempts: input.maxAttempts ?? 3,
    availableAt: input.availableAt ?? new Date(),
    status: "queued",
  });
  const created = await db.select().from(backgroundJobs).where(eq(backgroundJobs.id, Number(result[0]?.insertId))).limit(1);
  return created[0];
}

export async function startBackgroundJob(jobId: number, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  await db.update(backgroundJobs).set({ status: "running", lockedAt: now, attempts: sql`${backgroundJobs.attempts} + 1` }).where(and(
    eq(backgroundJobs.id, jobId),
    eq(backgroundJobs.status, "queued"),
    sql`${backgroundJobs.attempts} < ${backgroundJobs.maxAttempts}`,
  ));
  const started = await db.select().from(backgroundJobs).where(and(eq(backgroundJobs.id, jobId), eq(backgroundJobs.status, "running"))).limit(1);
  return started[0];
}

export async function claimBackgroundJob(now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  const candidate = await db.select().from(backgroundJobs).where(and(
    eq(backgroundJobs.status, "queued"),
    sql`${backgroundJobs.availableAt} <= ${now}`,
    sql`${backgroundJobs.attempts} < ${backgroundJobs.maxAttempts}`,
  )).orderBy(asc(backgroundJobs.availableAt), asc(backgroundJobs.id)).limit(1);
  if (!candidate[0]) return undefined;
  await db.update(backgroundJobs).set({ status: "running", lockedAt: now, attempts: sql`${backgroundJobs.attempts} + 1` }).where(and(
    eq(backgroundJobs.id, candidate[0].id),
    eq(backgroundJobs.status, "queued"),
  ));
  const claimed = await db.select().from(backgroundJobs).where(and(eq(backgroundJobs.id, candidate[0].id), eq(backgroundJobs.status, "running"))).limit(1);
  return claimed[0];
}

export async function listBackgroundJobs(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(backgroundJobs).where(eq(backgroundJobs.workspaceId, workspaceId)).orderBy(desc(backgroundJobs.createdAt)).limit(100);
}

export async function cancelBackgroundJob(workspaceId: number, jobId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  await db.update(backgroundJobs).set({ status: "blocked", lockedAt: null, lastError: "Canceled by a workspace administrator." }).where(and(
    eq(backgroundJobs.id, jobId),
    eq(backgroundJobs.workspaceId, workspaceId),
    inArray(backgroundJobs.status, ["queued", "running"]),
  ));
  const updated = await db.select().from(backgroundJobs).where(and(eq(backgroundJobs.id, jobId), eq(backgroundJobs.workspaceId, workspaceId))).limit(1);
  return updated[0];
}

export async function completeBackgroundJob(jobId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  await db.update(backgroundJobs).set({ status: "completed", completedAt: new Date(), lockedAt: null }).where(eq(backgroundJobs.id, jobId));
  return db.select().from(backgroundJobs).where(eq(backgroundJobs.id, jobId)).limit(1);
}

export async function failBackgroundJob(jobId: number, error: string, retryAt?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  const job = await db.select().from(backgroundJobs).where(eq(backgroundJobs.id, jobId)).limit(1);
  if (!job[0]) return undefined;
  const retry = retryAt && job[0].attempts < job[0].maxAttempts;
  await db.update(backgroundJobs).set({
    status: retry ? "queued" : "failed",
    availableAt: retry ? retryAt : job[0].availableAt,
    lockedAt: null,
    lastError: error.slice(0, 4000),
  }).where(eq(backgroundJobs.id, jobId));
  const updated = await db.select().from(backgroundJobs).where(eq(backgroundJobs.id, jobId)).limit(1);
  return updated[0];
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod", "passwordHash"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value !== undefined) {
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.emailVerifiedAt !== undefined) {
    values.emailVerifiedAt = user.emailVerifiedAt;
    updateSet.emailVerifiedAt = user.emailVerifiedAt;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1);
  return result[0];
}

export async function createLocalUser(input: { name: string; email: string; passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  const openId = `local_${createOpaqueToken()}`;
  const normalizedEmail = input.email.trim().toLowerCase();
  const result = await db.insert(users).values({
    openId,
    name: input.name.trim(),
    email: normalizedEmail,
    passwordHash: input.passwordHash,
    loginMethod: "email",
    role: "user",
  });
  const id = Number(result[0]?.insertId);
  const user = await getUserById(id);
  if (!user) throw new Error("Account was created but could not be loaded.");
  return user;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function createSession(userId: number, expiresInDays = 30) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  const token = `lh_${createOpaqueToken()}`;
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  await db.insert(authSessions).values({
    userId,
    sessionHash: hashOpaqueToken(token),
    expiresAt,
  });
  return { token, expiresAt };
}

export async function getUserBySessionToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ user: users, session: authSessions })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(and(eq(authSessions.sessionHash, hashOpaqueToken(token)), isNull(authSessions.revokedAt), gt(authSessions.expiresAt, new Date())))
    .limit(1);
  return result[0]?.user;
}

export async function revokeSession(token: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(authSessions).set({ revokedAt: new Date() }).where(eq(authSessions.sessionHash, hashOpaqueToken(token)));
}

export async function createPasswordResetToken(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  const token = createOpaqueToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await db.insert(passwordResetTokens).values({ userId, tokenHash: hashOpaqueToken(token), expiresAt });
  return { token, expiresAt };
}

export async function getValidPasswordResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ token: passwordResetTokens, user: users })
    .from(passwordResetTokens)
    .innerJoin(users, eq(passwordResetTokens.userId, users.id))
    .where(and(eq(passwordResetTokens.tokenHash, hashOpaqueToken(token)), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date())))
    .limit(1);
  return result[0];
}

export async function consumePasswordResetToken(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, id));
}

export async function createEmailVerificationToken(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  const token = createOpaqueToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.insert(emailVerificationTokens).values({ userId, tokenHash: hashOpaqueToken(token), expiresAt });
  return { token, expiresAt };
}

export async function getValidEmailVerificationToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ token: emailVerificationTokens, user: users })
    .from(emailVerificationTokens)
    .innerJoin(users, eq(emailVerificationTokens.userId, users.id))
    .where(and(eq(emailVerificationTokens.tokenHash, hashOpaqueToken(token)), isNull(emailVerificationTokens.usedAt), gt(emailVerificationTokens.expiresAt, new Date())))
    .limit(1);
  return result[0];
}

export async function verifyEmail(userId: number, tokenId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
  await db.update(emailVerificationTokens).set({ usedAt: new Date() }).where(eq(emailVerificationTokens.id, tokenId));
  return getUserById(userId);
}

export async function getWorkspacesForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ workspace: workspaces, role: workspaceMembers.role })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(desc(workspaces.updatedAt));
}

export async function getWorkspaceMembership(userId: number, workspaceId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ membership: workspaceMembers, workspace: workspaces })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)))
    .limit(1);
  return result[0];
}

export async function createWorkspace(input: { userId: number; name: string; industry?: string; location?: string; timezone?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  const slug = `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "workspace"}-${createOpaqueToken().slice(0, 6)}`;
  const result = await db.insert(workspaces).values({
    name: input.name.trim(),
    slug,
    timezone: input.timezone || "UTC",
    createdByUserId: input.userId,
  });
  const workspaceId = Number(result[0]?.insertId);
  await db.insert(workspaceMembers).values({ workspaceId, userId: input.userId, role: "owner" });
  await db.insert(businesses).values({
    workspaceId,
    name: input.name.trim(),
    industry: input.industry?.trim() || null,
    location: input.location?.trim() || null,
  });
  await db.insert(brands).values({ workspaceId, voice: "Clear, warm, confident, and human." });
  await db.insert(subscriptions).values({ workspaceId, plan: "starter", status: "trialing" });
  for (const provider of ["tiktok", "instagram", "youtube", "facebook", "pinterest", "linkedin", "email", "calendar", "booking", "pos"]) {
    await db.insert(connectors).values({ workspaceId, provider, status: "authorization_required" });
  }
  const created = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  return created[0];
}

export async function updateWorkspaceOnboarding(workspaceId: number, step: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) throw new Error("Workspace access denied.");
  await db.update(workspaces).set({ onboardingStep: step }).where(eq(workspaces.id, workspaceId));
  return getWorkspaceMembership(userId, workspaceId);
}

export async function getBusiness(workspaceId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(businesses).where(eq(businesses.workspaceId, workspaceId)).limit(1);
  return result[0];
}

export async function updateBusiness(workspaceId: number, data: Partial<{ name: string; industry: string; location: string; productsServices: string; targetCustomer: string; website: string }>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  await db.update(businesses).set(data).where(eq(businesses.workspaceId, workspaceId));
  return getBusiness(workspaceId);
}

export async function listGoals(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(goals).where(eq(goals.workspaceId, workspaceId)).orderBy(desc(goals.updatedAt));
}

export async function createGoal(workspaceId: number, data: { title: string; goalType: "customers" | "bookings" | "sales" | "leads" | "launch" | "content" | "retention" | "other"; period: string; currentPerformance?: number; target: number; targetAmountCents?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  const result = await db.insert(goals).values({ workspaceId, ...data });
  const created = await db.select().from(goals).where(eq(goals.id, Number(result[0]?.insertId))).limit(1);
  return created[0];
}

export async function listContent(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contentItems).where(eq(contentItems.workspaceId, workspaceId)).orderBy(desc(contentItems.updatedAt));
}

export async function listCampaigns(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaigns).where(eq(campaigns.workspaceId, workspaceId)).orderBy(desc(campaigns.createdAt));
}

export async function createCampaign(input: { workspaceId: number; userId: number; name: string; objective?: string; goalId?: number; offerId?: number; platforms?: string[]; startAt?: Date; endAt?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  if (input.goalId) {
    const goal = await db.select({ id: goals.id }).from(goals).where(and(eq(goals.id, input.goalId), eq(goals.workspaceId, input.workspaceId))).limit(1);
    if (!goal[0]) throw new Error("Goal was not found in this workspace.");
  }
  if (input.offerId) {
    const offer = await db.select({ id: offers.id }).from(offers).where(and(eq(offers.id, input.offerId), eq(offers.workspaceId, input.workspaceId))).limit(1);
    if (!offer[0]) throw new Error("Offer was not found in this workspace.");
  }
  if (input.startAt && input.endAt && input.endAt.getTime() <= input.startAt.getTime()) throw new Error("Campaign end must be after campaign start.");
  const result = await db.insert(campaigns).values({ workspaceId: input.workspaceId, goalId: input.goalId, offerId: input.offerId, name: input.name, objective: input.objective, platforms: input.platforms ?? [], status: "draft", startAt: input.startAt, endAt: input.endAt });
  const id = Number(result[0]?.insertId);
  await db.insert(auditLogs).values({ workspaceId: input.workspaceId, userId: input.userId, action: "campaign.created", entityType: "campaign", entityId: id, metadata: { name: input.name, goalId: input.goalId ?? null, offerId: input.offerId ?? null } });
  return db.select().from(campaigns).where(and(eq(campaigns.id, id), eq(campaigns.workspaceId, input.workspaceId))).limit(1).then((rows) => rows[0]);
}

export async function createContentDraft(input: { workspaceId: number; createdByUserId: number; goalId?: number; type: "image" | "video" | "copy" | "social_post" | "advertisement" | "campaign" | "email" | "content_plan" | "storyboard" | "product_creative"; platform: "tiktok" | "instagram" | "youtube" | "facebook" | "pinterest" | "linkedin" | "email" | "website" | "multi"; desiredOutcome: string; offer?: string; message?: string; cta?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  const itemResult = await db.insert(contentItems).values({
    workspaceId: input.workspaceId,
    createdByUserId: input.createdByUserId,
    type: input.type,
    platform: input.platform,
    desiredOutcome: input.desiredOutcome,
    goalId: input.goalId,
    offer: input.offer,
    message: input.message,
    cta: input.cta,
  });
  const contentItemId = Number(itemResult[0]?.insertId);
  await db.insert(contentRevisions).values({ contentItemId, version: 1, headline: null, body: null, visualBrief: null, platformAdaptation: null, createdByUserId: input.createdByUserId, providerTask: "content_draft" });
  const created = await db.select().from(contentItems).where(eq(contentItems.id, contentItemId)).limit(1);
  return created[0];
}

export async function getContentDetail(workspaceId: number, contentItemId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const item = await db.select().from(contentItems).where(and(eq(contentItems.id, contentItemId), eq(contentItems.workspaceId, workspaceId))).limit(1);
  if (!item[0]) return undefined;
  const revisions = await db.select().from(contentRevisions).where(eq(contentRevisions.contentItemId, contentItemId)).orderBy(desc(contentRevisions.version));
  const reviews = await db.select().from(qualityReviews).where(eq(qualityReviews.contentItemId, contentItemId)).orderBy(desc(qualityReviews.createdAt));
  const approval = await db.select().from(approvals).where(and(eq(approvals.workspaceId, workspaceId), eq(approvals.contentItemId, contentItemId))).orderBy(desc(approvals.createdAt)).limit(1);
  return { item: item[0], revisions, reviews, approval: approval[0] };
}

export async function updateContentRevision(input: { workspaceId: number; userId: number; contentItemId: number; headline: string; body: string; visualBrief?: string; platformAdaptation?: Record<string, unknown>; status?: "draft" | "needs_improvement" | "approval_candidate" | "pending_approval" | "approved" | "rejected" | "blocked" }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  const item = await db.select().from(contentItems).where(and(eq(contentItems.id, input.contentItemId), eq(contentItems.workspaceId, input.workspaceId))).limit(1);
  if (!item[0]) throw new Error("Content item not found in this workspace.");
  const latest = await db.select({ version: contentRevisions.version }).from(contentRevisions).where(eq(contentRevisions.contentItemId, input.contentItemId)).orderBy(desc(contentRevisions.version)).limit(1);
  const version = (latest[0]?.version ?? 0) + 1;
  await db.insert(contentRevisions).values({ contentItemId: input.contentItemId, version, headline: input.headline, body: input.body, visualBrief: input.visualBrief || null, platformAdaptation: input.platformAdaptation || null, createdByUserId: input.userId, providerTask: "content_revision" });
  if (input.status) await db.update(contentItems).set({ status: input.status }).where(eq(contentItems.id, input.contentItemId));
  return getContentDetail(input.workspaceId, input.contentItemId);
}

export async function createQualityReview(input: { workspaceId: number; contentItemId: number; revisionId: number; scores: Record<string, number>; overallScore: number; critique: string; weaknesses: string[]; decision: "reject" | "improve" | "review" | "approval_candidate" }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  const item = await db.select().from(contentItems).where(and(eq(contentItems.id, input.contentItemId), eq(contentItems.workspaceId, input.workspaceId))).limit(1);
  if (!item[0]) throw new Error("Content item not found in this workspace.");
  await db.insert(qualityReviews).values({ contentItemId: input.contentItemId, revisionId: input.revisionId, ...input.scores, overallScore: input.overallScore, critique: input.critique, weaknesses: input.weaknesses, decision: input.decision });
  const nextStatus = input.decision === "approval_candidate" ? "approval_candidate" : input.decision === "improve" ? "needs_improvement" : input.decision === "review" ? "draft" : "rejected";
  await db.update(contentItems).set({ status: nextStatus }).where(eq(contentItems.id, input.contentItemId));
  return getContentDetail(input.workspaceId, input.contentItemId);
}

export async function listApprovals(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(approvals).where(eq(approvals.workspaceId, workspaceId)).orderBy(desc(approvals.createdAt));
}

export async function createApproval(input: { workspaceId: number; contentItemId: number; requestedByUserId: number; actionType: string; what: string; why: string; whereTo?: string; expectedPurpose?: string; risk: "low" | "medium" | "high" }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  const item = await db.select().from(contentItems).where(and(eq(contentItems.id, input.contentItemId), eq(contentItems.workspaceId, input.workspaceId))).limit(1);
  if (!item[0]) throw new Error("Content item not found in this workspace.");
  const result = await db.insert(approvals).values(input);
  await db.update(contentItems).set({ status: "pending_approval" }).where(eq(contentItems.id, input.contentItemId));
  const created = await db.select().from(approvals).where(eq(approvals.id, Number(result[0]?.insertId))).limit(1);
  return created[0];
}

export async function decideApproval(input: { workspaceId: number; approvalId: number; userId: number; status: "approved" | "edited" | "rejected" | "scheduled" | "paused" }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  const approval = await db.select().from(approvals).where(and(eq(approvals.id, input.approvalId), eq(approvals.workspaceId, input.workspaceId))).limit(1);
  if (!approval[0]) throw new Error("Approval not found in this workspace.");
  await db.update(approvals).set({ status: input.status, decidedByUserId: input.userId, decidedAt: new Date() }).where(eq(approvals.id, input.approvalId));
  if (approval[0].contentItemId) {
    const contentStatus = input.status === "approved" ? "approved" : input.status === "rejected" ? "rejected" : input.status === "scheduled" ? "approved" : "pending_approval";
    await db.update(contentItems).set({ status: contentStatus }).where(and(eq(contentItems.id, approval[0].contentItemId), eq(contentItems.workspaceId, input.workspaceId)));
  }
  return db.select().from(approvals).where(eq(approvals.id, input.approvalId)).limit(1).then((rows) => rows[0]);
}

export async function listClients(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clients).where(eq(clients.workspaceId, workspaceId)).orderBy(desc(clients.updatedAt));
}

export async function createClient(workspaceId: number, input: { name: string; email?: string; phone?: string; segment?: string; consentStatus?: "unknown" | "granted" | "revoked"; notes?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  const result = await db.insert(clients).values({ workspaceId, ...input, email: input.email?.trim().toLowerCase() || null });
  return db.select().from(clients).where(eq(clients.id, Number(result[0]?.insertId))).limit(1).then((rows) => rows[0]);
}

export async function updateClient(workspaceId: number, clientId: number, input: Partial<{ name: string; email: string; phone: string; segment: string; consentStatus: "unknown" | "granted" | "revoked"; notes: string }>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  await db.update(clients).set(input).where(and(eq(clients.id, clientId), eq(clients.workspaceId, workspaceId)));
  return db.select().from(clients).where(and(eq(clients.id, clientId), eq(clients.workspaceId, workspaceId))).limit(1).then((rows) => rows[0]);
}

export async function listAutomations(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(automations).where(eq(automations.workspaceId, workspaceId)).orderBy(desc(automations.updatedAt));
}

export async function createAutomation(input: { workspaceId: number; createdByUserId: number; name: string; triggerType: string; conditions?: Record<string, unknown>; quietHours?: Record<string, unknown>; actionLimits?: Record<string, unknown>; requiresApproval: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  const result = await db.insert(automations).values(input);
  return db.select().from(automations).where(eq(automations.id, Number(result[0]?.insertId))).limit(1).then((rows) => rows[0]);
}

export async function toggleAutomation(workspaceId: number, automationId: number, enabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  await db.update(automations).set({ enabled, pausedReason: enabled ? null : "Paused by workspace owner." }).where(and(eq(automations.id, automationId), eq(automations.workspaceId, workspaceId)));
  return db.select().from(automations).where(and(eq(automations.id, automationId), eq(automations.workspaceId, workspaceId))).limit(1).then((rows) => rows[0]);
}

export async function createAutomationRun(input: { workspaceId: number; automationId: number; status: "queued" | "blocked" | "paused"; reason: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  const automation = await db.select().from(automations).where(and(eq(automations.id, input.automationId), eq(automations.workspaceId, input.workspaceId))).limit(1);
  if (!automation[0]) throw new Error("Automation not found in this workspace.");
  const result = await db.insert(automationRuns).values(input);
  return db.select().from(automationRuns).where(eq(automationRuns.id, Number(result[0]?.insertId))).limit(1).then((rows) => rows[0]);
}

export async function listConnectors(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(connectors).where(eq(connectors.workspaceId, workspaceId)).orderBy(connectors.provider);
}

export async function recordConnectorAttempt(input: { workspaceId: number; userId: number; provider: string; outcome: "authorization_required" | "error"; message: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  const connector = await db.select().from(connectors).where(and(eq(connectors.workspaceId, input.workspaceId), eq(connectors.provider, input.provider))).limit(1);
  if (!connector[0]) throw new Error("Connector was not found in this workspace.");
  const metadata = { ...(connector[0].metadata && typeof connector[0].metadata === "object" ? connector[0].metadata as Record<string, unknown> : {}), lastAuthorizationAttemptAt: new Date().toISOString(), lastAuthorizationOutcome: input.outcome, lastAuthorizationMessage: input.message };
  await db.update(connectors).set({ metadata }).where(and(eq(connectors.id, connector[0].id), eq(connectors.workspaceId, input.workspaceId)));
  await db.insert(auditLogs).values({ workspaceId: input.workspaceId, userId: input.userId, action: "connector.authorization_attempt", entityType: "connector", entityId: connector[0].id, metadata: { provider: input.provider, outcome: input.outcome } });
  return db.select().from(connectors).where(eq(connectors.id, connector[0].id)).limit(1).then((rows) => rows[0]);
}

export async function listAnalytics(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(analyticsEvents).where(eq(analyticsEvents.workspaceId, workspaceId)).orderBy(desc(analyticsEvents.occurredAt)).limit(100);
}

export async function recordAnalytics(input: { workspaceId: number; userId: number; eventType: string; value?: number; campaignId?: number; contentItemId?: number; metadata?: Record<string, unknown> }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  if (input.campaignId) {
    const campaign = await db.select({ id: campaigns.id }).from(campaigns).where(and(eq(campaigns.id, input.campaignId), eq(campaigns.workspaceId, input.workspaceId))).limit(1);
    if (!campaign[0]) throw new Error("Campaign was not found in this workspace.");
  }
  if (input.contentItemId) {
    const content = await db.select({ id: contentItems.id }).from(contentItems).where(and(eq(contentItems.id, input.contentItemId), eq(contentItems.workspaceId, input.workspaceId))).limit(1);
    if (!content[0]) throw new Error("Content item was not found in this workspace.");
  }
  const result = await db.insert(analyticsEvents).values(input);
  await db.insert(auditLogs).values({ workspaceId: input.workspaceId, userId: input.userId, action: "analytics.event_recorded", entityType: "analytics_event", entityId: Number(result[0]?.insertId), metadata: { eventType: input.eventType } });
  return { id: Number(result[0]?.insertId), recorded: true };
}

export async function listPerformanceImports(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(performanceImports).where(eq(performanceImports.workspaceId, workspaceId)).orderBy(desc(performanceImports.createdAt)).limit(50);
}

export async function createPerformanceImport(input: { workspaceId: number; userId: number; source: string; rows: Array<{ eventType: string; value?: number; occurredAt: Date; campaignId?: number; contentItemId?: number; metadata?: Record<string, unknown>; validationError?: string }> }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  const rejectedCount = input.rows.filter((row) => row.validationError).length;
  const acceptedRows = input.rows.filter((row) => !row.validationError);
  const batchResult = await db.insert(performanceImports).values({ workspaceId: input.workspaceId, importedByUserId: input.userId, source: input.source, status: rejectedCount ? "validated" : "applied", rowCount: input.rows.length, acceptedCount: acceptedRows.length, rejectedCount, errorMessage: rejectedCount ? "Some rows were rejected during validation." : null });
  const importId = Number(batchResult[0]?.insertId);
  if (input.rows.length) await db.insert(performanceImportRows).values(input.rows.map((row) => ({ importId, workspaceId: input.workspaceId, eventType: row.eventType, value: row.value, occurredAt: row.occurredAt, campaignId: row.campaignId, contentItemId: row.contentItemId, metadata: row.metadata, validationError: row.validationError })));
  for (const row of acceptedRows) await db.insert(analyticsEvents).values({ workspaceId: input.workspaceId, eventType: row.eventType, value: row.value, campaignId: row.campaignId, contentItemId: row.contentItemId, metadata: { ...(row.metadata || {}), source: input.source, importId } });
  await db.insert(auditLogs).values({ workspaceId: input.workspaceId, userId: input.userId, action: "performance.imported", entityType: "performance_import", entityId: importId, metadata: { source: input.source, rowCount: input.rows.length, acceptedCount: acceptedRows.length, rejectedCount } });
  return db.select().from(performanceImports).where(eq(performanceImports.id, importId)).limit(1).then((rows) => rows[0]);
}

export async function listSchedules(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(schedules).where(eq(schedules.workspaceId, workspaceId)).orderBy(asc(schedules.runAt)).limit(100);
}

export async function createSchedule(input: { workspaceId: number; userId: number; name: string; scheduleType: "content" | "performance_import" | "automation_check"; targetId?: number; runAt: Date; timezone?: string; requiresApproval?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  const result = await db.insert(schedules).values({ workspaceId: input.workspaceId, createdByUserId: input.userId, name: input.name, scheduleType: input.scheduleType, targetId: input.targetId, runAt: input.runAt, timezone: input.timezone || "UTC", requiresApproval: input.requiresApproval ?? true, enabled: false, status: "draft", guardrailNote: "Schedules start paused. Enable only after confirming approval and connector requirements." });
  return db.select().from(schedules).where(eq(schedules.id, Number(result[0]?.insertId))).limit(1).then((rows) => rows[0]);
}

export async function toggleSchedule(workspaceId: number, scheduleId: number, enabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  await db.update(schedules).set({ enabled, status: enabled ? "scheduled" : "paused", guardrailNote: enabled ? "Enabled, but execution remains approval- and connector-gated." : "Paused by workspace owner." }).where(and(eq(schedules.id, scheduleId), eq(schedules.workspaceId, workspaceId)));
  return db.select().from(schedules).where(and(eq(schedules.id, scheduleId), eq(schedules.workspaceId, workspaceId))).limit(1).then((rows) => rows[0]);
}

export async function runScheduleCheck(workspaceId: number, scheduleId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available. Configure DATABASE_URL before using this operation.");
  const schedule = await db.select().from(schedules).where(and(eq(schedules.id, scheduleId), eq(schedules.workspaceId, workspaceId))).limit(1);
  if (!schedule[0]) throw new Error("Schedule not found in this workspace.");

  let reason: string | null = null;
  if (!schedule[0].enabled) reason = "Schedule is paused; no work was executed.";

  if (!reason && schedule[0].scheduleType === "content") {
    const item = schedule[0].targetId ? await db.select().from(contentItems).where(and(eq(contentItems.id, schedule[0].targetId), eq(contentItems.workspaceId, workspaceId))).limit(1) : [];
    if (!item[0]) reason = "The scheduled content target was not found in this workspace.";
    if (!reason && schedule[0].requiresApproval) {
      const approval = await db.select().from(approvals).where(and(eq(approvals.workspaceId, workspaceId), eq(approvals.contentItemId, schedule[0].targetId!))).orderBy(desc(approvals.createdAt)).limit(1);
      if (!approval[0] || !["approved", "scheduled"].includes(approval[0].status)) reason = "Approval is required before scheduled content can execute.";
    }
    if (!reason) {
      const connector = await db.select().from(connectors).where(and(eq(connectors.workspaceId, workspaceId), eq(connectors.provider, item[0]!.platform), eq(connectors.status, "connected"))).limit(1);
      if (!connector[0]) reason = `No connected ${item[0]!.platform} connector is available for scheduled execution.`;
    }
  }

  if (!reason && schedule[0].scheduleType === "performance_import") {
    const connector = await db.select().from(connectors).where(and(eq(connectors.workspaceId, workspaceId), eq(connectors.provider, "performance"), eq(connectors.status, "connected"))).limit(1);
    if (!connector[0]) reason = "No connected performance source is available for scheduled import.";
  }

  if (!reason && schedule[0].scheduleType === "automation_check") {
    const automation = schedule[0].targetId ? await db.select().from(automations).where(and(eq(automations.id, schedule[0].targetId), eq(automations.workspaceId, workspaceId))).limit(1) : [];
    if (!automation[0]) reason = "The scheduled automation target was not found in this workspace.";
    else if (!automation[0].enabled) reason = "The target automation is disabled.";
    else if (isWithinQuietHours(automation[0].quietHours)) reason = "The automation is inside its configured quiet hours.";
    else if (automation[0].actionLimits && typeof automation[0].actionLimits === "object" && Number((automation[0].actionLimits as Record<string, unknown>).maxPerRun) <= 0) reason = "The automation action limit prevents execution.";
    else if (automation[0].requiresApproval) reason = "Approval is required before the automation can execute.";
  }

  if (!reason) reason = "Execution is not enabled for this environment; no outbound work was performed.";
  const result = await db.insert(scheduleRuns).values({ workspaceId, scheduleId, status: "blocked", reason });
  return db.select().from(scheduleRuns).where(eq(scheduleRuns.id, Number(result[0]?.insertId))).limit(1).then((rows) => rows[0]);
}

export async function getLearning(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(learning).where(eq(learning.workspaceId, workspaceId)).orderBy(desc(learning.createdAt));
}

export async function getDashboard(workspaceId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [workspace, business, workspaceGoals, workspaceContent, workspaceApprovals, workspaceClients, workspaceAutomations, workspaceConnectors, workspaceAnalytics, workspaceLearning] = await Promise.all([
    db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1),
    getBusiness(workspaceId),
    listGoals(workspaceId),
    listContent(workspaceId),
    listApprovals(workspaceId),
    listClients(workspaceId),
    listAutomations(workspaceId),
    listConnectors(workspaceId),
    listAnalytics(workspaceId),
    getLearning(workspaceId),
  ]);
  if (!workspace[0]) return undefined;
  return {
    workspace: workspace[0],
    business,
    goals: workspaceGoals,
    content: workspaceContent,
    approvals: workspaceApprovals.filter((approval) => approval.status === "pending").slice(0, 10),
    clients: workspaceClients,
    automations: workspaceAutomations,
    connectors: workspaceConnectors,
    analytics: workspaceAnalytics,
    learning: workspaceLearning,
  };
}

export async function getResultsBreakdown(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  const [workspaceCampaigns, workspaceGoals, workspaceContent, workspaceEvents] = await Promise.all([
    db.select().from(campaigns).where(eq(campaigns.workspaceId, workspaceId)).orderBy(desc(campaigns.createdAt)),
    db.select().from(goals).where(eq(goals.workspaceId, workspaceId)),
    db.select().from(contentItems).where(eq(contentItems.workspaceId, workspaceId)),
    db.select().from(analyticsEvents).where(eq(analyticsEvents.workspaceId, workspaceId)).orderBy(desc(analyticsEvents.occurredAt)).limit(1000),
  ]);
  const goalById = new Map(workspaceGoals.map((goal) => [goal.id, goal]));
  return workspaceCampaigns.map((campaign) => {
    const campaignEvents = workspaceEvents.filter((event) => event.campaignId === campaign.id);
    const campaignContent = workspaceContent.filter((item) => item.campaignId === campaign.id);
    const metrics = summarizeCampaignEvents(campaignEvents.map((event) => ({ eventType: event.eventType, value: event.value })));
    const goal = campaign.goalId ? goalById.get(campaign.goalId) : undefined;
    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      status: campaign.status,
      goal: goal ? { id: goal.id, title: goal.title, target: goal.target, actual: goal.actual, goalType: goal.goalType } : null,
      contentCount: campaignContent.length,
      ...metrics,
      target: goal?.target ?? null,
      forecast: null,
      assumptions: "Campaign metrics use only workspace-scoped analytics events linked to this campaign. Forecast remains unavailable without comparable evidence.",
    };
  });
}

export async function getResultsComparison(workspaceId: number, periodDays = 30) {
  const db = await getDb();
  if (!db) return { periodDays, ...comparePeriods([]) };
  const events = await db.select({ eventType: analyticsEvents.eventType, value: analyticsEvents.value, occurredAt: analyticsEvents.occurredAt }).from(analyticsEvents).where(eq(analyticsEvents.workspaceId, workspaceId)).orderBy(desc(analyticsEvents.occurredAt)).limit(1000);
  return { periodDays, ...comparePeriods(events, new Date(), periodDays) };
}

export async function getGoalSummary(workspaceId: number) {
  const db = await getDb();
  if (!db) return { goals: [], actualEventCount: 0 };
  const workspaceGoals = await listGoals(workspaceId);
  const countRows = await db.select({ count: sql<number>`count(*)` }).from(analyticsEvents).where(eq(analyticsEvents.workspaceId, workspaceId));
  return { goals: workspaceGoals, actualEventCount: Number(countRows[0]?.count ?? 0) };
}

export async function getUsage(workspaceId: number, period: string) {
  const db = await getDb();
  if (!db) return undefined;
  return db.select().from(usage).where(and(eq(usage.workspaceId, workspaceId), eq(usage.period, period))).limit(1).then((rows) => rows[0]);
}

export async function getSubscription(workspaceId: number) {
  const db = await getDb();
  if (!db) return undefined;
  return db.select().from(subscriptions).where(eq(subscriptions.workspaceId, workspaceId)).limit(1).then((rows) => rows[0]);
}
