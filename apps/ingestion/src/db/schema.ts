import {
	pgTable,
	bigserial,
	integer,
	text,
	timestamp,
	boolean,
	jsonb,
	index,
} from "drizzle-orm/pg-core";

export const events = pgTable(
	"events",
	{
		id: bigserial("id", { mode: "bigint" }).primaryKey(),
		projectId: text("project_id").notNull(),
		type: text("type").notNull().default("pageview"),
		ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
		path: text("path"),
		referrer: text("referrer"),
		origin: text("origin"),
		host: text("host"),
		isLocalhost: boolean("is_localhost").default(false),
		ua: text("ua"),
		lang: text("lang"),
		deviceType: text("device_type"),
		ipHash: text("ip_hash"),
		visitorId: text("visitor_id"),
		sessionId: text("session_id"),
		country: text("country"),
		region: text("region"),
		city: text("city"),
		meta: jsonb("meta"),
	},
	(table) => ({
		projectTsIdx: index("events_project_ts_idx").on(table.projectId, table.ts),
		projectTypeIdx: index("events_project_type_idx").on(table.projectId, table.type),
		visitorIdx: index("events_visitor_idx").on(table.visitorId),
		sessionIdx: index("events_session_idx").on(table.sessionId),
		pathIdx: index("events_path_idx").on(table.path),
		hostIdx: index("events_host_idx").on(table.host),
		countryIdx: index("events_country_idx").on(table.country),
		projectTsTypeIdx: index("events_project_ts_type_idx").on(table.projectId, table.ts, table.type),
	}),
);

export const visitors = pgTable(
	"visitors",
	{
		id: bigserial("id", { mode: "bigint" }).primaryKey(),
		fingerprint: text("fingerprint").notNull().unique(),
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
	(table) => ({
		lastSeenIdx: index("idx_visitors_last_seen").on(table.lastSeen),
		fingerprintIdx: index("idx_visitors_fingerprint").on(table.fingerprint),
	}),
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Visitor = typeof visitors.$inferSelect;
export type NewVisitor = typeof visitors.$inferInsert;
