import { pgTable, text, timestamp, boolean, integer, jsonb, index } from "drizzle-orm/pg-core";

export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    type: text("type").notNull(),
    path: text("path").notNull(),
    referrer: text("referrer"),
    visitorId: text("visitor_id"),
    sessionId: text("session_id"),
    country: text("country"),
    region: text("region"),
    city: text("city"),
    userAgent: text("user_agent"),
    ipHash: text("ip_hash"),
    isBot: boolean("is_bot").default(false),
    screenWidth: integer("screen_width"),
    screenHeight: integer("screen_height"),
    metadata: jsonb("metadata"),
    ts: timestamp("ts", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("events_project_idx").on(table.projectId),
    tsIdx: index("events_ts_idx").on(table.ts),
    pathIdx: index("events_path_idx").on(table.path),
    visitorIdx: index("events_visitor_idx").on(table.visitorId),
    sessionIdx: index("events_session_idx").on(table.sessionId),
    countryIdx: index("events_country_idx").on(table.country),
    projectTsIdx: index("events_project_ts_idx").on(table.projectId, table.ts),
    typeIdx: index("events_type_idx").on(table.type),
  })
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
