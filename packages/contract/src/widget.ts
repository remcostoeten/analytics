import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { Range } from "./common";
import { DeviceType } from "./enums";
import { maxReportsPerBatch } from "./limits";
import { Count, Id, nullable, oneOf, Ratio, Timestamp } from "./schema";

export const WidgetFeatures = Type.Object({
  logs: Type.Boolean(),
  speed: Type.Boolean(),
  issues: Type.Boolean(),
});
export type WidgetFeatures = Static<typeof WidgetFeatures>;

export const WidgetSession = Type.Object({
  project: Id,
  access: Type.Literal("admin"),
  user: Type.Object({ id: Id, name: Type.String() }),
  release: nullable(Type.String()),
  token: Type.String({ minLength: 1 }),
  expiresAt: Timestamp,
  features: WidgetFeatures,
});
export type WidgetSession = Static<typeof WidgetSession>;

export const ActiveVisitor = Type.Object({
  visitor: Id,
  session: Id,
  lastSeen: Timestamp,
  path: nullable(Type.String()),
  referrer: nullable(Type.String()),
  country: nullable(Type.String({ minLength: 2, maxLength: 2 })),
  city: nullable(Type.String()),
  device: DeviceType,
  browser: nullable(Type.String()),
  os: nullable(Type.String()),
  pages: Count,
  duration: Count,
  botScore: Type.Integer({ minimum: 0, maximum: 100 }),
  identified: Type.Boolean(),
});
export type ActiveVisitor = Static<typeof ActiveVisitor>;

export const ActiveVisitors = Type.Object({ data: Type.Array(ActiveVisitor), window: Range });
export type ActiveVisitors = Static<typeof ActiveVisitors>;

export const ActiveVisitorsQuery = Type.Object({
  limit: Type.Optional(Type.String({ pattern: "^[0-9]+$" })),
});
export type ActiveVisitorsQuery = Static<typeof ActiveVisitorsQuery>;

export const LineLevel = oneOf(["info", "ok", "warn", "error"]);
export type LineLevel = Static<typeof LineLevel>;

export const LineKind = oneOf(["ingest", "transport", "pipeline", "signals", "jobs", "auth"]);
export type LineKind = Static<typeof LineKind>;

export const LineSource = oneOf(["api", "sdk", "engine", "cron"]);
export type LineSource = Static<typeof LineSource>;

export const LogValue = Type.Union([
  Type.String({ maxLength: 255 }),
  Type.Number(),
  Type.Boolean(),
  Type.Null(),
  Type.Array(Type.String({ maxLength: 255 }), { maxItems: 50 }),
]);
export type LogValue = Static<typeof LogValue>;

export const LogData = Type.Record(Type.String({ maxLength: 64 }), LogValue, {
  maxProperties: 25,
});
export type LogData = Static<typeof LogData>;

export const LogLine = Type.Object({
  id: Type.String({ pattern: "^[0-9]+$" }),
  ts: Timestamp,
  level: LineLevel,
  kind: LineKind,
  source: LineSource,
  message: Type.String(),
  data: LogData,
  visitor: nullable(Id),
  session: nullable(Id),
});
export type LogLine = Static<typeof LogLine>;

export const LogList = Type.Object({
  data: Type.Array(LogLine),
  nextCursor: Type.String({ minLength: 1 }),
});
export type LogList = Static<typeof LogList>;

export const LogsQuery = Type.Object({
  level: Type.Optional(LineLevel),
  kind: Type.Optional(LineKind),
  source: Type.Optional(LineSource),
  visitor: Type.Optional(Id),
  q: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
  after: Type.Optional(Type.String({ pattern: "^[0-9]{1,19}$" })),
});
export type LogsQuery = Static<typeof LogsQuery>;

export const ClientLog = Type.Object({
  kind: oneOf(["transport", "pipeline"]),
  level: LineLevel,
  message: Type.String({ minLength: 1, maxLength: 500 }),
  data: Type.Optional(LogData),
  visitor: Type.Optional(nullable(Id)),
  session: Type.Optional(nullable(Id)),
  ts: Timestamp,
});
export type ClientLog = Static<typeof ClientLog>;

export const ClientLogBatch = Type.Object({
  logs: Type.Array(ClientLog, { minItems: 1, maxItems: maxReportsPerBatch }),
});
export type ClientLogBatch = Static<typeof ClientLogBatch>;

export const ClientLogResult = Type.Object({ accepted: Count });
export type ClientLogResult = Static<typeof ClientLogResult>;

const Share = Type.Number({ minimum: 0, maximum: 1 });

export const IngestTotals = Type.Object({
  accepted: Count,
  duplicates: Count,
  rejected: Count,
  rateLimited: Count,
});
export type IngestTotals = Static<typeof IngestTotals>;

export const ReleaseInfo = Type.Object({
  current: Type.String({ minLength: 1 }),
  deployedAt: Timestamp,
  newIssuesSince: Count,
});
export type ReleaseInfo = Static<typeof ReleaseInfo>;

export const Overview = Type.Object({
  online: Count,
  viewsPerMinute: Type.Array(Count, { minItems: 10, maxItems: 10 }),
  today: Type.Object({
    visitors: Count,
    pageviews: Count,
    bounceRate: Ratio,
    avgSessionSeconds: Type.Number({ minimum: 0 }),
  }),
  ingest: Type.Object({ last24h: IngestTotals }),
  bots: Type.Object({
    share: Share,
    headless: Count,
    webdriver: Count,
    datacenterAsn: Count,
  }),
  speed: Type.Object({
    lcp: nullable(Type.Number({ minimum: 0 })),
    inp: nullable(Type.Number({ minimum: 0 })),
    cls: nullable(Type.Number({ minimum: 0 })),
    ttfb: nullable(Type.Number({ minimum: 0 })),
  }),
  errors: Type.Object({ last30m: Count, openIssues: Count }),
  topPages: Type.Array(Type.Object({ path: Type.String(), views: Count }), { maxItems: 5 }),
  referrers: Type.Array(Type.Object({ name: Type.String(), share: Share }), { maxItems: 5 }),
  countries: Type.Array(Type.Object({ code: Type.String(), share: Share }), { maxItems: 5 }),
  release: nullable(ReleaseInfo),
});
export type Overview = Static<typeof Overview>;
