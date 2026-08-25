import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 128 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    passwordHash: text("passwordHash"),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
    emailVerifiedAt: timestamp("emailVerifiedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  }),
);

export const workspaces = mysqlTable(
  "workspaces",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    timezone: varchar("timezone", { length: 64 }).default("UTC").notNull(),
    onboardingStep: int("onboardingStep").default(1).notNull(),
    createdByUserId: int("createdByUserId").notNull().references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("workspaces_slug_idx").on(table.slug),
    creatorIdx: index("workspaces_creator_idx").on(table.createdByUserId),
  }),
);

export const workspaceMembers = mysqlTable(
  "workspace_members",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
    userId: int("userId").notNull().references(() => users.id),
    role: mysqlEnum("role", ["owner", "admin", "member", "viewer"]).default("owner").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    membershipIdx: uniqueIndex("workspace_membership_idx").on(table.workspaceId, table.userId),
    userIdx: index("workspace_members_user_idx").on(table.userId),
  }),
);

export const businesses = mysqlTable(
  "businesses",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
    name: varchar("name", { length: 255 }).notNull(),
    industry: varchar("industry", { length: 160 }),
    location: varchar("location", { length: 255 }),
    productsServices: text("productsServices"),
    targetCustomer: text("targetCustomer"),
    website: varchar("website", { length: 500 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    workspaceIdx: uniqueIndex("businesses_workspace_idx").on(table.workspaceId),
  }),
);

export const brands = mysqlTable(
  "brands",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
    voice: text("voice"),
    colors: json("colors"),
    approvedAssets: json("approvedAssets"),
    website: varchar("website", { length: 500 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    workspaceIdx: uniqueIndex("brands_workspace_idx").on(table.workspaceId),
  }),
);

export const goals = mysqlTable(
  "goals",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
    title: varchar("title", { length: 255 }).notNull(),
    goalType: mysqlEnum("goalType", ["customers", "bookings", "sales", "leads", "launch", "content", "retention", "other"]).notNull(),
    period: varchar("period", { length: 120 }).notNull(),
    currentPerformance: int("currentPerformance"),
    target: int("target").notNull(),
    targetAmountCents: int("targetAmountCents"),
    actual: int("actual").default(0).notNull(),
    forecast: int("forecast"),
    assumptions: json("assumptions"),
    status: mysqlEnum("status", ["active", "paused", "completed"]).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    workspaceStatusIdx: index("goals_workspace_status_idx").on(table.workspaceId, table.status),
  }),
);

export const offers = mysqlTable(
  "offers",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    priceCents: int("priceCents"),
    status: mysqlEnum("status", ["draft", "active", "archived"]).default("draft").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index("offers_workspace_idx").on(table.workspaceId),
  }),
);

export const clients = mysqlTable(
  "clients",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 64 }),
    segment: varchar("segment", { length: 120 }),
    consentStatus: mysqlEnum("consentStatus", ["unknown", "granted", "revoked"]).default("unknown").notNull(),
    quietHours: json("quietHours"),
    preferences: json("preferences"),
    lastContactedAt: timestamp("lastContactedAt"),
    lastVisitAt: timestamp("lastVisitAt"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    workspaceEmailIdx: index("clients_workspace_email_idx").on(table.workspaceId, table.email),
    segmentIdx: index("clients_segment_idx").on(table.workspaceId, table.segment),
  }),
);

export const campaigns = mysqlTable(
  "campaigns",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
    goalId: int("goalId").references(() => goals.id),
    offerId: int("offerId").references(() => offers.id),
    name: varchar("name", { length: 255 }).notNull(),
    objective: text("objective"),
    platforms: json("platforms"),
    status: mysqlEnum("status", ["draft", "active", "paused", "completed"]).default("draft").notNull(),
    startAt: timestamp("startAt"),
    endAt: timestamp("endAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    workspaceStatusIdx: index("campaigns_workspace_status_idx").on(table.workspaceId, table.status),
  }),
);

export const contentItems = mysqlTable(
  "content_items",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
    campaignId: int("campaignId").references(() => campaigns.id),
    goalId: int("goalId").references(() => goals.id),
    type: mysqlEnum("type", ["image", "video", "copy", "social_post", "advertisement", "campaign", "email", "content_plan", "storyboard", "product_creative"]).notNull(),
    platform: mysqlEnum("platform", ["tiktok", "instagram", "youtube", "facebook", "pinterest", "linkedin", "email", "website", "multi"]).notNull(),
    desiredOutcome: text("desiredOutcome").notNull(),
    offer: text("offer"),
    message: text("message"),
    cta: varchar("cta", { length: 255 }),
    status: mysqlEnum("status", ["draft", "generating", "needs_improvement", "approval_candidate", "pending_approval", "approved", "rejected", "published", "blocked"]).default("draft").notNull(),
    createdByUserId: int("createdByUserId").notNull().references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    workspaceStatusIdx: index("content_workspace_status_idx").on(table.workspaceId, table.status),
    campaignIdx: index("content_campaign_idx").on(table.campaignId),
  }),
);

export const contentRevisions = mysqlTable(
  "content_revisions",
  {
    id: int("id").autoincrement().primaryKey(),
    contentItemId: int("contentItemId").notNull().references(() => contentItems.id),
    version: int("version").notNull(),
    headline: text("headline"),
    body: text("body"),
    visualBrief: text("visualBrief"),
    platformAdaptation: json("platformAdaptation"),
    providerTask: varchar("providerTask", { length: 120 }),
    createdByUserId: int("createdByUserId").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    versionIdx: uniqueIndex("content_revision_version_idx").on(table.contentItemId, table.version),
  }),
);

export const qualityReviews = mysqlTable(
  "quality_reviews",
  {
    id: int("id").autoincrement().primaryKey(),
    contentItemId: int("contentItemId").notNull().references(() => contentItems.id),
    revisionId: int("revisionId").notNull().references(() => contentRevisions.id),
    hook: int("hook"),
    retention: int("retention"),
    clarity: int("clarity"),
    emotion: int("emotion"),
    brandFit: int("brandFit"),
    naturalness: int("naturalness"),
    visualQuality: int("visualQuality"),
    artifactRisk: int("artifactRisk"),
    offer: int("offer"),
    cta: int("cta"),
    conversionPotential: int("conversionPotential"),
    platformFit: int("platformFit"),
    originality: int("originality"),
    professionalism: int("professionalism"),
    overallScore: int("overallScore"),
    critique: text("critique"),
    weaknesses: json("weaknesses"),
    decision: mysqlEnum("decision", ["reject", "improve", "review", "approval_candidate"]).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    contentIdx: index("quality_content_idx").on(table.contentItemId, table.createdAt),
  }),
);

export const approvals = mysqlTable(
  "approvals",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
    contentItemId: int("contentItemId").references(() => contentItems.id),
    actionType: varchar("actionType", { length: 120 }).notNull(),
    what: text("what").notNull(),
    why: text("why"),
    whereTo: varchar("whereTo", { length: 255 }),
    whenAt: timestamp("whenAt"),
    expectedPurpose: text("expectedPurpose"),
    risk: mysqlEnum("risk", ["low", "medium", "high"]).default("low").notNull(),
    status: mysqlEnum("status", ["pending", "approved", "edited", "rejected", "scheduled", "paused"]).default("pending").notNull(),
    requestedByUserId: int("requestedByUserId").notNull().references(() => users.id),
    decidedByUserId: int("decidedByUserId").references(() => users.id),
    decidedAt: timestamp("decidedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    workspaceStatusIdx: index("approvals_workspace_status_idx").on(table.workspaceId, table.status),
  }),
);

export const automations = mysqlTable(
  "automations",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
    name: varchar("name", { length: 255 }).notNull(),
    triggerType: varchar("triggerType", { length: 120 }).notNull(),
    conditions: json("conditions"),
    quietHours: json("quietHours"),
    actionLimits: json("actionLimits"),
    requiresApproval: boolean("requiresApproval").default(true).notNull(),
    enabled: boolean("enabled").default(false).notNull(),
    pausedReason: text("pausedReason"),
    createdByUserId: int("createdByUserId").notNull().references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    workspaceEnabledIdx: index("automations_workspace_enabled_idx").on(table.workspaceId, table.enabled),
  }),
);

export const automationRuns = mysqlTable(
  "automation_runs",
  {
    id: int("id").autoincrement().primaryKey(),
    automationId: int("automationId").notNull().references(() => automations.id),
    workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
    status: mysqlEnum("status", ["queued", "running", "completed", "blocked", "failed", "paused"]).notNull(),
    reason: text("reason"),
    result: json("result"),
    startedAt: timestamp("startedAt"),
    finishedAt: timestamp("finishedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    workspaceCreatedIdx: index("automation_runs_workspace_created_idx").on(table.workspaceId, table.createdAt),
  }),
);

export const connectors = mysqlTable(
  "connectors",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
    provider: varchar("provider", { length: 120 }).notNull(),
    status: mysqlEnum("status", ["available", "authorization_required", "connected", "approval_required", "error", "disconnected"]).default("available").notNull(),
    scopes: json("scopes"),
    metadata: json("metadata"),
    connectedAt: timestamp("connectedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    providerIdx: uniqueIndex("connectors_workspace_provider_idx").on(table.workspaceId, table.provider),
  }),
);

export const analyticsEvents = mysqlTable(
  "analytics_events",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
    campaignId: int("campaignId").references(() => campaigns.id),
    contentItemId: int("contentItemId").references(() => contentItems.id),
    eventType: varchar("eventType", { length: 120 }).notNull(),
    value: int("value"),
    metadata: json("metadata"),
    occurredAt: timestamp("occurredAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    workspaceEventIdx: index("analytics_workspace_event_idx").on(table.workspaceId, table.eventType, table.occurredAt),
  }),
);

export const learning = mysqlTable(
  "learning",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
    category: varchar("category", { length: 120 }).notNull(),
    insight: text("insight").notNull(),
    evidence: json("evidence"),
    confidence: int("confidence"),
    status: mysqlEnum("status", ["new", "accepted", "dismissed"]).default("new").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    workspaceStatusIdx: index("learning_workspace_status_idx").on(table.workspaceId, table.status),
  }),
);

export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").references(() => workspaces.id),
    userId: int("userId").references(() => users.id),
    action: varchar("action", { length: 160 }).notNull(),
    entityType: varchar("entityType", { length: 120 }),
    entityId: int("entityId"),
    metadata: json("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    workspaceCreatedIdx: index("audit_workspace_created_idx").on(table.workspaceId, table.createdAt),
  }),
);

export const subscriptions = mysqlTable(
  "subscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
    plan: mysqlEnum("plan", ["starter", "pro", "growth", "enterprise"]).default("starter").notNull(),
    status: mysqlEnum("status", ["trialing", "active", "past_due", "canceled", "blocked"]).default("trialing").notNull(),
    providerCustomerId: varchar("providerCustomerId", { length: 255 }),
    providerSubscriptionId: varchar("providerSubscriptionId", { length: 255 }),
    currentPeriodEnd: timestamp("currentPeriodEnd"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    workspaceIdx: uniqueIndex("subscriptions_workspace_idx").on(table.workspaceId),
  }),
);

export const usage = mysqlTable(
  "usage",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
    period: varchar("period", { length: 32 }).notNull(),
    contentRequests: int("contentRequests").default(0).notNull(),
    aiTasks: int("aiTasks").default(0).notNull(),
    publishedItems: int("publishedItems").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    workspacePeriodIdx: uniqueIndex("usage_workspace_period_idx").on(table.workspaceId, table.period),
  }),
);

export const authSessions = mysqlTable(
  "auth_sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id),
    sessionHash: varchar("sessionHash", { length: 128 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    revokedAt: timestamp("revokedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    sessionIdx: uniqueIndex("auth_sessions_hash_idx").on(table.sessionHash),
    userIdx: index("auth_sessions_user_idx").on(table.userId),
  }),
);

export const passwordResetTokens = mysqlTable(
  "password_reset_tokens",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    usedAt: timestamp("usedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("password_reset_tokens_hash_idx").on(table.tokenHash),
  }),
);

export const emailVerificationTokens = mysqlTable(
  "email_verification_tokens",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    usedAt: timestamp("usedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("email_verification_tokens_hash_idx").on(table.tokenHash),
  }),
);

export const performanceImports = mysqlTable(
  "performance_imports",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
    source: varchar("source", { length: 120 }).notNull(),
    periodStart: timestamp("periodStart"),
    periodEnd: timestamp("periodEnd"),
    status: mysqlEnum("status", ["received", "validated", "blocked", "applied"]).default("received").notNull(),
    rowCount: int("rowCount").default(0).notNull(),
    acceptedCount: int("acceptedCount").default(0).notNull(),
    rejectedCount: int("rejectedCount").default(0).notNull(),
    errorMessage: text("errorMessage"),
    importedByUserId: int("importedByUserId").notNull().references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({ workspaceCreatedIdx: index("performance_imports_workspace_created_idx").on(table.workspaceId, table.createdAt) }),
);

export const performanceImportRows = mysqlTable(
  "performance_import_rows",
  {
    id: int("id").autoincrement().primaryKey(),
    importId: int("importId").notNull().references(() => performanceImports.id),
    workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
    eventType: varchar("eventType", { length: 120 }).notNull(),
    value: int("value"),
    occurredAt: timestamp("occurredAt").notNull(),
    campaignId: int("campaignId").references(() => campaigns.id),
    contentItemId: int("contentItemId").references(() => contentItems.id),
    metadata: json("metadata"),
    validationError: text("validationError"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({ workspaceOccurredIdx: index("performance_rows_workspace_occurred_idx").on(table.workspaceId, table.occurredAt) }),
);

export const rateLimitBuckets = mysqlTable(
  "rate_limit_buckets",
  {
    id: int("id").autoincrement().primaryKey(),
    bucketKey: varchar("bucketKey", { length: 255 }).notNull(),
    windowStart: timestamp("windowStart").notNull(),
    requestCount: int("requestCount").default(0).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({ bucketIdx: uniqueIndex("rate_limit_bucket_key_idx").on(table.bucketKey) }),
);

export const webhookReceipts = mysqlTable(
  "webhook_receipts",
  {
    id: int("id").autoincrement().primaryKey(),
    provider: varchar("provider", { length: 120 }).notNull(),
    eventId: varchar("eventId", { length: 255 }).notNull(),
    signatureHash: varchar("signatureHash", { length: 128 }).notNull(),
    receivedAt: timestamp("receivedAt").defaultNow().notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    status: mysqlEnum("status", ["received", "duplicate", "blocked"]).default("received").notNull(),
    metadata: json("metadata"),
  },
  (table) => ({ providerEventIdx: uniqueIndex("webhook_provider_event_idx").on(table.provider, table.eventId), expiresIdx: index("webhook_expires_idx").on(table.expiresAt) }),
);

export const schedules = mysqlTable(
  "schedules",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
    name: varchar("name", { length: 255 }).notNull(),
    scheduleType: mysqlEnum("scheduleType", ["content", "performance_import", "automation_check"]).notNull(),
    targetId: int("targetId"),
    runAt: timestamp("runAt").notNull(),
    timezone: varchar("timezone", { length: 64 }).default("UTC").notNull(),
    requiresApproval: boolean("requiresApproval").default(true).notNull(),
    enabled: boolean("enabled").default(false).notNull(),
    status: mysqlEnum("status", ["draft", "scheduled", "paused", "completed", "blocked"]).default("draft").notNull(),
    guardrailNote: text("guardrailNote"),
    createdByUserId: int("createdByUserId").notNull().references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({ workspaceRunIdx: index("schedules_workspace_run_idx").on(table.workspaceId, table.runAt, table.status) }),
);

export const oauthStates = mysqlTable(
  "oauth_states",
  {
    id: int("id").autoincrement().primaryKey(),
    stateHash: varchar("stateHash", { length: 128 }).notNull(),
    redirectUri: varchar("redirectUri", { length: 1000 }).notNull(),
    provider: varchar("provider", { length: 64 }).default("manus").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    consumedAt: timestamp("consumedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    stateHashIdx: uniqueIndex("oauth_states_hash_idx").on(table.stateHash),
    expiresIdx: index("oauth_states_expires_idx").on(table.expiresAt),
  }),
);

export const backgroundJobs = mysqlTable(
  "background_jobs",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
    kind: varchar("kind", { length: 120 }).notNull(),
    idempotencyKey: varchar("idempotencyKey", { length: 255 }),
    payload: json("payload"),
    status: mysqlEnum("status", ["queued", "running", "completed", "failed", "blocked"]).default("queued").notNull(),
    attempts: int("attempts").default(0).notNull(),
    maxAttempts: int("maxAttempts").default(3).notNull(),
    availableAt: timestamp("availableAt").defaultNow().notNull(),
    lockedAt: timestamp("lockedAt"),
    completedAt: timestamp("completedAt"),
    lastError: text("lastError"),
    createdByUserId: int("createdByUserId").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    queueIdx: index("background_jobs_queue_idx").on(table.status, table.availableAt),
    workspaceIdx: index("background_jobs_workspace_idx").on(table.workspaceId, table.createdAt),
    idempotencyIdx: uniqueIndex("background_jobs_idempotency_idx").on(table.workspaceId, table.kind, table.idempotencyKey),
  }),
);

export const scheduleRuns = mysqlTable(
  "schedule_runs",
  {
    id: int("id").autoincrement().primaryKey(),
    scheduleId: int("scheduleId").notNull().references(() => schedules.id),
    workspaceId: int("workspaceId").notNull().references(() => workspaces.id),
    status: mysqlEnum("status", ["queued", "running", "completed", "blocked", "failed"]).notNull(),
    reason: text("reason"),
    ranAt: timestamp("ranAt").defaultNow().notNull(),
  },
  (table) => ({ workspaceRanIdx: index("schedule_runs_workspace_ran_idx").on(table.workspaceId, table.ranAt) }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type ContentItem = typeof contentItems.$inferSelect;
export type ContentRevision = typeof contentRevisions.$inferSelect;
export type QualityReview = typeof qualityReviews.$inferSelect;
export type Approval = typeof approvals.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Automation = typeof automations.$inferSelect;
export type Connector = typeof connectors.$inferSelect;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type PerformanceImport = typeof performanceImports.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
export type OAuthState = typeof oauthStates.$inferSelect;
export type BackgroundJob = typeof backgroundJobs.$inferSelect;
