import {
  bigint,
  bigserial,
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { baseEntity, timestamps } from "./columns";

export const events = pgTable(
  "events",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    projectId: text("project_id").notNull(),
    type: text("type").notNull().default("pageview"),
    name: text("name"),
    ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow(),
    path: text("path"),
    route: text("route"),
    referrer: text("referrer"),
    referrerDomain: text("referrer_domain"),
    channel: text("channel"),
    origin: text("origin"),
    host: text("host"),
    isLocalhost: boolean("is_localhost").default(false),
    isPreview: boolean("is_preview").default(false),
    botDetected: boolean("bot_detected").default(false),
    botScore: smallint("bot_score").notNull().default(0),
    botReasons: text("bot_reasons").array().notNull().default([]),
    isInternal: boolean("is_internal").default(false),
    ua: text("ua"),
    lang: text("lang"),
    deviceType: text("device_type"),
    ipHash: text("ip_hash"),
    visitorId: text("visitor_id"),
    sessionId: text("session_id"),
    country: text("country"),
    region: text("region"),
    city: text("city"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    timezone: text("timezone"),
    postalCode: text("postal_code"),
    continent: text("continent"),
    asn: integer("asn"),
    asOrg: text("as_org"),
    fingerprint: text("fingerprint"),
    schemaVersion: smallint("schema_version").notNull().default(0),
    issueId: bigint("issue_id", { mode: "bigint" }),
    meta: jsonb("meta"),
  },
  (table) => [
    uniqueIndex("events_fingerprint_uidx").on(table.fingerprint),
    index("events_project_ts_idx").on(table.projectId, table.ts),
    index("events_project_received_idx").on(table.projectId, table.receivedAt, table.id),
    index("events_project_type_idx").on(table.projectId, table.type),
    index("events_project_name_ts_idx").on(table.projectId, table.name, table.ts),
    index("events_project_route_ts_idx").on(table.projectId, table.route, table.ts),
    index("events_visitor_idx").on(table.visitorId),
    index("events_session_idx").on(table.sessionId),
  ],
);

export const visitors = pgTable(
  "visitors",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    projectId: text("project_id").notNull().default("default"),
    fingerprint: text("fingerprint").notNull(),
    firstSeen: timestamp("first_seen", { withTimezone: true }).notNull().defaultNow(),
    lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
    visitCount: integer("visit_count").notNull().default(1),
    isInternal: boolean("is_internal").notNull().default(false),
    deviceType: text("device_type"),
    os: text("os"),
    osVersion: text("os_version"),
    browser: text("browser"),
    browserVersion: text("browser_version"),
    screenResolution: text("screen_resolution"),
    timezone: text("timezone"),
    language: text("language"),
    country: text("country"),
    region: text("region"),
    city: text("city"),
    ipHash: text("ip_hash"),
    ua: text("ua"),
    meta: jsonb("meta"),
  },
  (table) => [
    uniqueIndex("idx_visitors_project_fingerprint").on(table.projectId, table.fingerprint),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    projectId: text("project_id").notNull(),
    sessionId: text("session_id").notNull(),
    visitorId: text("visitor_id"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    lastEventAt: timestamp("last_event_at", { withTimezone: true }).notNull().defaultNow(),
    entryPath: text("entry_path"),
    exitPath: text("exit_path"),
    entryRoute: text("entry_route"),
    exitRoute: text("exit_route"),
    referrer: text("referrer"),
    channel: text("channel"),
    utmSource: text("utm_source"),
    utmCampaign: text("utm_campaign"),
    pageviews: integer("pageviews").notNull().default(0),
    events: integer("events").notNull().default(0),
    durationMs: integer("duration_ms").notNull().default(0),
    isBounce: boolean("is_bounce").notNull().default(true),
    botScore: smallint("bot_score").notNull().default(0),
    country: text("country"),
    deviceType: text("device_type"),
    isInternal: boolean("is_internal").notNull().default(false),
  },
  (table) => [
    uniqueIndex("sessions_project_session_uidx").on(table.projectId, table.sessionId),
    index("idx_sessions_project_started").on(table.projectId, table.startedAt),
    index("idx_sessions_visitor").on(table.visitorId),
  ],
);

export const rollupDaily = pgTable(
  "rollup_daily",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    projectId: text("project_id").notNull(),
    day: date("day").notNull(),
    dimension: text("dimension").notNull(),
    dimValue: text("dim_value").notNull().default(""),
    route: text("route"),
    pageviews: integer("pageviews").notNull().default(0),
    events: integer("events").notNull().default(0),
    visitors: integer("visitors").notNull().default(0),
    sessions: integer("sessions").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("rollup_daily_uidx").on(
      table.projectId,
      table.day,
      table.dimension,
      table.dimValue,
    ),
  ],
);

export const dashboardUsers = pgTable("dashboard_users", {
  githubLogin: text("github_login").primaryKey(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  ...baseEntity(),
  name: text("name").notNull(),
  domain: text("domain").notNull(),
  visibility: text("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("public"),
  publicVisitorData: boolean("public_visitor_data").notNull().default(false),
  allowedOrigins: text("allowed_origins").array().notNull().default([]),
  publicKey: text("public_key").notNull().unique(),
  secretKeyHash: text("secret_key_hash").notNull(),
  retentionDays: integer("retention_days").notNull().default(90),
  orgId: text("org_id").references(() => authOrganization.id, { onDelete: "set null" }),
  sqlEnabled: boolean("sql_enabled").notNull().default(true),
});

export const apiTokens = pgTable("api_tokens", {
  ...baseEntity(),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  scope: text("scope", { enum: ["read", "sql", "admin"] }).notNull(),
  projectIds: text("project_ids").array(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const issues = pgTable(
  "issues",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    projectId: text("project_id").notNull(),
    fingerprint: text("fingerprint").notNull(),
    title: text("title").notNull(),
    culprit: text("culprit"),
    level: text("level", { enum: ["error", "warning"] })
      .notNull()
      .default("error"),
    status: text("status", { enum: ["open", "resolved", "ignored"] })
      .notNull()
      .default("open"),
    count: integer("count").notNull().default(0),
    visitors: integer("visitors").notNull().default(0),
    firstSeen: timestamp("first_seen", { withTimezone: true }).notNull(),
    lastSeen: timestamp("last_seen", { withTimezone: true }).notNull(),
    firstRelease: text("first_release"),
    lastRelease: text("last_release"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [unique().on(table.projectId, table.fingerprint)],
);

export const webVitals = pgTable(
  "web_vitals",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    sessionId: text("session_id"),
    ts: timestamp("ts", { withTimezone: true }).notNull(),
    metric: text("metric", { enum: ["lcp", "inp", "cls", "fcp", "ttfb"] }).notNull(),
    value: doublePrecision("value").notNull(),
    rating: text("rating", { enum: ["good", "needs-improvement", "poor"] }).notNull(),
    route: text("route"),
    path: text("path").notNull(),
    device: text("device").notNull(),
    country: text("country"),
    connection: text("connection"),
    selector: text("selector"),
    sampleRate: real("sample_rate").notNull().default(1),
    navigationType: text("navigation_type"),
    botScore: smallint("bot_score").notNull().default(0),
    isInternal: boolean("is_internal").notNull().default(false),
  },
  (table) => [
    index("web_vitals_project_metric_ts_idx").on(table.projectId, table.metric, table.ts),
  ],
);

export const rollupVitals = pgTable(
  "rollup_vitals",
  {
    projectId: text("project_id").notNull(),
    day: date("day").notNull(),
    route: text("route").notNull().default(""),
    device: text("device").notNull(),
    metric: text("metric").notNull(),
    samples: integer("samples").notNull(),
    p50: doublePrecision("p50"),
    p75: doublePrecision("p75"),
    p90: doublePrecision("p90"),
    p95: doublePrecision("p95"),
    p99: doublePrecision("p99"),
    good: integer("good").notNull(),
    needsImprovement: integer("needs_improvement").notNull(),
    poor: integer("poor").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.day, table.route, table.device, table.metric] }),
  ],
);

export const authUser = pgTable("auth_user", {
  ...baseEntity(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  githubLogin: text("github_login"),
});

export const authOrganization = pgTable("auth_organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authSession = pgTable("auth_session", {
  ...baseEntity(),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  activeOrganizationId: text("active_organization_id"),
});

export const authAccount = pgTable("auth_account", {
  ...baseEntity(),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
});

export const authVerification = pgTable("auth_verification", {
  ...baseEntity(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const authMember = pgTable("auth_member", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => authOrganization.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["owner", "admin", "analyst", "viewer"] })
    .notNull()
    .default("viewer"),
  projectIds: text("project_ids").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authInvitation = pgTable("auth_invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => authOrganization.id, { onDelete: "cascade" }),
  inviterId: text("inviter_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role"),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const queryRuns = pgTable(
  "query_runs",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    actorKind: text("actor_kind", { enum: ["user", "token"] }).notNull(),
    actorId: text("actor_id").notNull(),
    projectIds: text("project_ids").array().notNull(),
    statement: text("statement").notNull(),
    durationMs: integer("duration_ms"),
    rowCount: integer("row_count"),
    blocked: boolean("blocked").notNull().default(false),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("query_runs_actor_idx").on(table.actorKind, table.actorId, table.createdAt)],
);

export const schemaMigrations = pgTable("schema_migrations", {
  name: text("name").primaryKey(),
  checksum: text("checksum").notNull(),
  appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    hits: integer("hits").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.key, table.windowStart] })],
);
