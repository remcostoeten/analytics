import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { Range } from "./common";
import { DeviceType } from "./enums";
import { maxReportsPerBatch } from "./limits";
import { Count, Id, nullable, oneOf, Ratio, Timestamp } from "./schema";
import activeVisitors from "../fixtures/ActiveVisitors/valid/one.json";
import clientLogBatch from "../fixtures/ClientLogBatch/valid/drop.json";
import liveSessions from "../fixtures/LiveSessions/valid/engaged.json";
import logList from "../fixtures/LogList/valid/rejected.json";
import overview from "../fixtures/Overview/valid/busy.json";
import widgetSession from "../fixtures/WidgetSession/valid/admin.json";

const BotScore = Type.Integer({
  minimum: 0,
  maximum: 100,
  description: "The highest bot score in the window, from 0 to 100; 50 and up counts as a bot.",
});
const CountryCode = Type.String({
  minLength: 2,
  maxLength: 2,
  description: "ISO 3166-1 alpha-2 country code.",
});

export const WidgetFeatures = Type.Object(
  {
    logs: Type.Boolean(),
    speed: Type.Boolean(),
    issues: Type.Boolean(),
  },
  { description: "The widget panels this API serves." },
);
export type WidgetFeatures = Static<typeof WidgetFeatures>;

export const WidgetSession = Type.Object(
  {
    project: Type.String({
      minLength: 1,
      description: "The project whose allowed origins include the request's `Origin`.",
    }),
    access: Type.Literal("admin", { description: "The token's access level; always `admin`." }),
    user: Type.Object({ id: Id, name: Type.String() }, { description: "The signed-in member." }),
    release: nullable(
      Type.String({ description: "The newest `release` seen on the project's events." }),
    ),
    token: Type.String({
      minLength: 1,
      description:
        "A `wt_` widget token with the `admin` scope for this project only, sent as a bearer token. Never listed by `GET /v2/tokens`.",
    }),
    expiresAt: Type.String({
      format: "date-time",
      description: "When the token expires, 15 minutes after it was issued.",
    }),
    features: WidgetFeatures,
  },
  { examples: [widgetSession] },
);
export type WidgetSession = Static<typeof WidgetSession>;

export const ActiveVisitor = Type.Object({
  visitor: Id,
  session: Type.String({
    minLength: 1,
    maxLength: 128,
    description: "The visitor's latest session.",
  }),
  lastSeen: Type.String({ format: "date-time", description: "When their latest event arrived." }),
  path: nullable(Type.String({ description: "The path of the session's latest pageview." })),
  referrer: nullable(Type.String({ description: "The session's referrer." })),
  country: nullable(CountryCode),
  city: nullable(Type.String()),
  device: DeviceType,
  browser: nullable(Type.String()),
  os: nullable(Type.String()),
  pages: Type.Integer({ minimum: 0, description: "Pageviews in the session." }),
  duration: Type.Integer({ minimum: 0, description: "Session length in seconds." }),
  botScore: BotScore,
  identified: Type.Boolean({
    description: "Whether `identify` gave the visitor a user id. The id itself is never returned.",
  }),
});
export type ActiveVisitor = Static<typeof ActiveVisitor>;

export const ActiveVisitors = Type.Object(
  {
    data: Type.Array(ActiveVisitor, {
      description: "One row per visitor seen in the last five minutes, newest activity first.",
    }),
    window: Range,
  },
  { examples: [activeVisitors] },
);
export type ActiveVisitors = Static<typeof ActiveVisitors>;

export const SessionSignal = oneOf(["human", "engaged", "suspect", "bot"], {
  description:
    "`bot` from a bot score of 50, `suspect` from 25; otherwise `engaged` from three pageviews or a minute on the site, and `human` below that.",
});
export type SessionSignal = Static<typeof SessionSignal>;

export const LiveSession = Type.Object({
  id: Id,
  visitor: Id,
  startedAt: Timestamp,
  lastSeen: Type.String({ format: "date-time", description: "When the latest event arrived." }),
  trail: Type.Array(Type.String(), {
    maxItems: 20,
    description: "Paths of the last 20 pageviews, oldest first.",
  }),
  pages: Type.Integer({ minimum: 0, description: "Pageviews in the session." }),
  events: Type.Integer({ minimum: 0, description: "All events in the session." }),
  durationMs: Type.Integer({ minimum: 0, description: "Time from the first event to the last." }),
  referrer: nullable(Type.String({ description: "Referrer of the first event." })),
  country: nullable(CountryCode),
  device: DeviceType,
  botScore: BotScore,
  signal: SessionSignal,
});
export type LiveSession = Static<typeof LiveSession>;

export const LiveSessions = Type.Object(
  {
    data: Type.Array(LiveSession, {
      description: "One row per session with an event in the last five minutes, latest first.",
    }),
    window: Range,
  },
  { examples: [liveSessions] },
);
export type LiveSessions = Static<typeof LiveSessions>;

export const ActiveVisitorsQuery = Type.Object({
  limit: Type.Optional(
    Type.String({
      pattern: "^[0-9]+$",
      description: "Rows to return, from 1 to 200; 50 by default.",
    }),
  ),
});
export type ActiveVisitorsQuery = Static<typeof ActiveVisitorsQuery>;

export const LineLevel = oneOf(["info", "ok", "warn", "error"], { description: "Severity." });
export type LineLevel = Static<typeof LineLevel>;

export const LineKind = oneOf(["ingest", "transport", "pipeline", "signals", "jobs", "auth"], {
  description: "What the line is about.",
});
export type LineKind = Static<typeof LineKind>;

export const LineSource = oneOf(["api", "sdk", "engine", "cron"], {
  description: "What wrote the line: `sdk` lines are reported by the widget build of the SDK.",
});
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
  id: Type.String({
    pattern: "^[0-9]+$",
    description: "A numeric id that increases with each line; pass it as `after` to read on.",
  }),
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

export const LogList = Type.Object(
  {
    data: Type.Array(LogLine, { description: "Log lines, oldest first." }),
    nextCursor: Type.String({
      minLength: 1,
      description: "Pass as `after` for the following lines.",
    }),
  },
  { examples: [logList] },
);
export type LogList = Static<typeof LogList>;

export const LogsQuery = Type.Object({
  level: Type.Optional(LineLevel),
  kind: Type.Optional(LineKind),
  source: Type.Optional(LineSource),
  visitor: Type.Optional(
    Type.String({ minLength: 1, maxLength: 128, description: "Only lines about this visitor." }),
  ),
  q: Type.Optional(
    Type.String({
      minLength: 1,
      maxLength: 200,
      description: "Only lines whose message contains this text.",
    }),
  ),
  after: Type.Optional(
    Type.String({
      pattern: "^[0-9]{1,19}$",
      description:
        "Return lines after this cursor, waiting for new ones. Without it, the last 100 lines.",
    }),
  ),
});
export type LogsQuery = Static<typeof LogsQuery>;

export const ClientLog = Type.Object({
  kind: oneOf(["transport", "pipeline"], {
    description:
      "`transport` for send errors, `pipeline` for events the SDK dropped before sending.",
  }),
  level: LineLevel,
  message: Type.String({ minLength: 1, maxLength: 500 }),
  data: Type.Optional(LogData),
  visitor: Type.Optional(nullable(Id)),
  session: Type.Optional(nullable(Id)),
  ts: Timestamp,
});
export type ClientLog = Static<typeof ClientLog>;

export const ClientLogBatch = Type.Object(
  {
    logs: Type.Array(ClientLog, {
      minItems: 1,
      maxItems: maxReportsPerBatch,
      description: `1 to ${maxReportsPerBatch} reports.`,
    }),
  },
  { examples: [clientLogBatch] },
);
export type ClientLogBatch = Static<typeof ClientLogBatch>;

export const ClientLogResult = Type.Object({
  accepted: Type.Integer({ minimum: 0, description: "Reports written to the log." }),
});
export type ClientLogResult = Static<typeof ClientLogResult>;

export const IngestTotals = Type.Object(
  {
    accepted: Count,
    duplicates: Count,
    rejected: Count,
    rateLimited: Count,
  },
  { description: "Ingest counts from the project's log lines." },
);
export type IngestTotals = Static<typeof IngestTotals>;

export const ReleaseInfo = Type.Object({
  current: Type.String({ minLength: 1, description: "The newest `release` seen on events." }),
  deployedAt: Type.String({
    format: "date-time",
    description: "When that release first appeared on an event in the last 30 days.",
  }),
  newIssuesSince: Type.Integer({ minimum: 0, description: "Issues first seen since then." }),
});
export type ReleaseInfo = Static<typeof ReleaseInfo>;

export const Overview = Type.Object(
  {
    online: Type.Integer({ minimum: 0, description: "Visitors in the last five minutes." }),
    viewsPerMinute: Type.Array(Count, {
      minItems: 10,
      maxItems: 10,
      description: "Human pageviews per minute for the last ten minutes, oldest first.",
    }),
    today: Type.Object(
      {
        visitors: Count,
        pageviews: Count,
        bounceRate: Ratio,
        avgSessionSeconds: Type.Number({ minimum: 0, description: "Average session length." }),
      },
      { description: "Human traffic since UTC midnight." },
    ),
    ingest: Type.Object({ last24h: IngestTotals }),
    bots: Type.Object(
      {
        share: Type.Number({
          minimum: 0,
          maximum: 1,
          description: "Share of visitors with a bot score of 50 or more.",
        }),
        headless: Type.Integer({ minimum: 0, description: "Visitors flagged as headless." }),
        webdriver: Type.Integer({
          minimum: 0,
          description: "Visitors flagged by `navigator.webdriver`.",
        }),
        datacenterAsn: Type.Integer({
          minimum: 0,
          description: "Visitors from a datacenter network.",
        }),
      },
      { description: "All traffic over the last 24 hours." },
    ),
    speed: Type.Object(
      {
        lcp: nullable(Type.Number({ minimum: 0, description: "Milliseconds." })),
        inp: nullable(Type.Number({ minimum: 0, description: "Milliseconds." })),
        cls: nullable(Type.Number({ minimum: 0, description: "Unitless layout shift score." })),
        ttfb: nullable(Type.Number({ minimum: 0, description: "Milliseconds." })),
      },
      {
        description:
          "The p75 of each Core Web Vital over the last seven days; null under 20 samples.",
      },
    ),
    errors: Type.Object({
      last30m: Type.Integer({ minimum: 0, description: "`error` events in the last 30 minutes." }),
      openIssues: Type.Integer({ minimum: 0, description: "Issues with status `open`." }),
    }),
    topPages: Type.Array(Type.Object({ path: Type.String(), views: Count }), {
      maxItems: 5,
      description: "Today's five most viewed pages.",
    }),
    referrers: Type.Array(
      Type.Object({
        name: Type.String({ description: "Referrer domain." }),
        share: Type.Number({ minimum: 0, maximum: 1, description: "Share of today's visitors." }),
      }),
      { maxItems: 5, description: "Today's top five referrer domains." },
    ),
    countries: Type.Array(
      Type.Object({
        code: Type.String({ description: "ISO 3166-1 alpha-2 country code." }),
        share: Type.Number({ minimum: 0, maximum: 1, description: "Share of today's visitors." }),
      }),
      { maxItems: 5, description: "Today's top five countries." },
    ),
    release: nullable(ReleaseInfo),
  },
  { examples: [overview] },
);
export type Overview = Static<typeof Overview>;
