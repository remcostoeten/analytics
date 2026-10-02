# Schemas and types (draft)

The types epic E0.3 builds and the tables epic E1.2 migrates to, sketched now so the API, SDK and database agree before code exists. Names follow generic-program-rules: semantic aliases declared once, literal unions for finite sets, `Nullable<T>` for present-but-empty, `Entity` for mutable records.

## Semantic types

`packages/shared/src/semantic.ts`, the only place these are declared:

```ts
export type ID = string;
export type Timestamp = string;
export type Day = string;
export type Milliseconds = number;
export type Nullable<Value> = Value | null;

export type Timestamps<Deleted extends boolean = false> = {
  createdAt: Timestamp;
  updatedAt: Timestamp;
} & (Deleted extends true ? { deletedAt: Nullable<Timestamp> } : {});

export type Entity<Deleted extends boolean = false> = { id: ID } & Timestamps<Deleted>;

export type CreateInput<Value extends Entity> = Omit<Value, "id" | "createdAt" | "updatedAt">;
export type UpdateInput<Value extends Entity> = Partial<CreateInput<Value>> & { id: ID };

export type ProjectID = ID;
export type VisitorID = ID;
export type SessionID = ID;
export type EventID = ID;
export type IssueID = ID;
export type TokenID = ID;
export type UserID = ID;

export type CountryCode = string;
export type Path = string;
export type Route = string;
export type Selector = string;
```

- `Timestamp` is ISO 8601 in UTC; `Day` is `YYYY-MM-DD` in UTC, used by rollups.
- `Milliseconds` is the one duration unit everywhere: time on page, session length, every vital except CLS.
- `Route` is a template such as `/blog/[slug]`; `Path` is the concrete `/blog/rebuilding-analytics`.
- Events are facts, not entities: they have `ts` and `receivedAt` but no `updatedAt`, so they do not use `Entity`.

## Finite sets

`packages/contract/src/enums.ts`:

```ts
export type Visibility = "public" | "private";
export type DeviceType = "desktop" | "mobile" | "tablet" | "bot" | "unknown";
export type TrafficFilter = "human" | "bots" | "internal" | "all";
export type Interval = "hour" | "day" | "week" | "month";
export type Period = "24h" | "7d" | "30d" | "90d" | "12mo" | "all";
export type Percentile = 50 | 75 | 90 | 95 | 99;
export type VitalMetric = "lcp" | "inp" | "cls" | "fcp" | "ttfb";
export type VitalRating = "good" | "needs-improvement" | "poor";
export type NavigationType = "navigate" | "reload" | "back-forward" | "back-forward-cache" | "prerender" | "restore";
export type IssueStatus = "open" | "resolved" | "ignored";
export type IssueLevel = "error" | "warning";
export type TokenScope = "read" | "admin";
export type AnnotationKind = "release" | "post" | "content" | "incident" | "other";
export type BotReason =
  | "ua_crawler" | "ua_automation" | "edge_verified_bot" | "asn_datacenter"
  | "headers_inconsistent" | "headers_missing" | "client_webdriver" | "client_headless"
  | "client_no_input" | "session_velocity" | "ip_fanout";
export type BuiltInEvent =
  | "pageview" | "web_vital" | "scroll_depth" | "engagement" | "click" | "outbound_click"
  | "file_download" | "form_submit" | "error" | "not_found" | "identify" | "experiment_exposure";
export type EventName = BuiltInEvent | (string & {});
```

`ErrorCode`, `Dimension` and `Metric` are not written by hand: they are the key unions of the error catalog, the dimension registry and the metric registry, so adding an entry adds the type.

## Wire types: what the SDK sends

```ts
export type PropValue = string | number | boolean | null;
export type Props = { [key: string]: PropValue };

export type WirePage = { path: Path; route?: Route; title?: string; referrer?: Nullable<string> };

export type WireContext = {
  screen?: string;
  viewport?: string;
  tz?: string;
  lang?: string;
  connection?: string;
  utm?: { source?: string; medium?: string; campaign?: string; term?: string; content?: string };
  release?: string;
  ua?: string;
  ip?: string;
};

export type WireEvent = {
  id: EventID;
  name: EventName;
  ts: Timestamp;
  visitor: VisitorID;
  session: SessionID;
  page: WirePage;
  props: Props;
  context?: WireContext;
  signals?: number;
};

export type IngestEnvelope = { v: 1; sentAt: Timestamp; events: WireEvent[] };

export type IngestResult = {
  accepted: number;
  duplicates: number;
  rejected: { index: number; code: ErrorCode; message: string }[];
};
```

`context.ua` and `context.ip` are only honoured with a secret key (server SDK and proxy). On the wire, `props` is `WireProps`: at most 25 flat values, keys up to 255 characters, strings up to 255 characters (2048 for `stack` and `breadcrumbs` on `error` events); ingest rejects an event outside these limits with `VALIDATION_FAILED`. `Props` is the storage shape; in application code the SDK's `Events` generic types each event's props.

## Domain types: what the API returns

```ts
export type Geo = {
  country: Nullable<CountryCode>;
  region: Nullable<string>;
  city: Nullable<string>;
  postalCode: Nullable<string>;
  timezone: Nullable<string>;
  latitude: Nullable<number>;
  longitude: Nullable<number>;
};

export type Device = {
  type: DeviceType;
  browser: Nullable<string>;
  browserVersion: Nullable<string>;
  os: Nullable<string>;
  osVersion: Nullable<string>;
  screen: Nullable<string>;
  viewport: Nullable<string>;
  language: Nullable<string>;
  connection: Nullable<string>;
};

export type Source = {
  referrer: Nullable<string>;
  referrerDomain: Nullable<string>;
  channel: Channel;
  utm: { source: Nullable<string>; medium: Nullable<string>; campaign: Nullable<string>; term: Nullable<string>; content: Nullable<string> };
};

export type Channel = "direct" | "search" | "social" | "referral" | "email" | "paid" | "internal";

export type BotVerdict = { score: number; reasons: BotReason[] };

export type Project = Entity & {
  name: string;
  domain: string;
  visibility: Visibility;
  publicVisitorData: boolean;
  allowedOrigins: string[];
  retentionDays: number;
  publicKey: string;
};

export type StoredEvent = {
  id: EventID;
  projectId: ProjectID;
  name: EventName;
  ts: Timestamp;
  receivedAt: Timestamp;
  visitorId: VisitorID;
  sessionId: SessionID;
  page: { path: Path; route: Nullable<Route>; title: Nullable<string>; host: string };
  props: Props;
  source: Source;
  geo: Geo;
  device: Device;
  bot: BotVerdict;
  isInternal: boolean;
  issueId: Nullable<IssueID>;
};

export type Session = {
  id: SessionID;
  projectId: ProjectID;
  visitorId: VisitorID;
  startedAt: Timestamp;
  lastEventAt: Timestamp;
  durationMs: Milliseconds;
  pageviews: number;
  events: number;
  isBounce: boolean;
  entryPath: Path;
  exitPath: Path;
  entryRoute: Nullable<Route>;
  exitRoute: Nullable<Route>;
  source: Source;
  geo: Geo;
  device: Device;
  bot: BotVerdict;
  isInternal: boolean;
};

export type Visitor = {
  id: VisitorID;
  projectId: ProjectID;
  firstSeen: Timestamp;
  lastSeen: Timestamp;
  sessions: number;
  pageviews: number;
  events: number;
  totalDurationMs: Milliseconds;
  isReturning: boolean;
  isInternal: boolean;
  identity: Nullable<{ userId: UserID; traits: Props }>;
  experiments: { [experimentId: string]: string };
  firstSource: Source;
  geo: Geo;
  device: Device;
};

export type WebVital = {
  id: ID;
  projectId: ProjectID;
  sessionId: SessionID;
  ts: Timestamp;
  metric: VitalMetric;
  value: number;
  rating: VitalRating;
  route: Nullable<Route>;
  path: Path;
  device: DeviceType;
  country: Nullable<CountryCode>;
  connection: Nullable<string>;
  selector: Nullable<Selector>;
  sampleRate: number;
  navigationType: NavigationType;
};

export type Issue = Entity & {
  projectId: ProjectID;
  fingerprint: string;
  title: string;
  culprit: Nullable<string>;
  level: IssueLevel;
  status: IssueStatus;
  count: number;
  visitors: number;
  firstSeen: Timestamp;
  lastSeen: Timestamp;
  firstRelease: Nullable<string>;
  lastRelease: Nullable<string>;
  resolvedAt: Nullable<Timestamp>;
};

export type ApiToken = Entity & {
  name: string;
  scope: TokenScope;
  projectIds: Nullable<ProjectID[]>;
  lastUsedAt: Nullable<Timestamp>;
  expiresAt: Nullable<Timestamp>;
};

export type Annotation = Entity & {
  project: ProjectID;
  title: string;
  date: Timestamp;
  endDate: Nullable<Timestamp>;
  kind: AnnotationKind;
  note: Nullable<string>;
  url: Nullable<string>;
};
```

## Query types

```ts
export type RangeQuery = { from?: Timestamp; to?: Timestamp; period?: Period };
export type FilterQuery = { traffic?: TrafficFilter; filter?: { [dimension: string]: string } };
export type PageQuery = { limit?: number; cursor?: string };

export type ListResult<Item> = { data: Item[]; nextCursor: Nullable<string> };
export type Range = { from: Timestamp; to: Timestamp };
export type Compared = { value: number; previous: number; change: Nullable<number> };

export type ApiError = {
  error: { code: ErrorCode; message: string; details?: ErrorDetails; requestId: string; docs: string };
};
```

Filter keys are dimension names plus `prop:<key>` for event props and `trait:<key>` for visitor traits; a value prefixed with `!` excludes.

## Across projects

```ts
export type ProjectBreakdownRow = {
  value: ProjectID;
  visitors?: number;
  pageviews?: number;
  share?: number;
  name: string;
  visibility: Visibility;
  change: { [metric: string]: Nullable<number> };
  speedScore: Nullable<number>;
  openIssues: Nullable<number>;
};
```

`visitors` and `pageviews` are the default metrics. With `metrics=`, a row carries the requested metrics instead, as on any breakdown, and `change` has one key per requested metric.

```ts
export type Person = {
  userId: UserID;
  traits: Props;
  firstSeen: Timestamp;
  lastSeen: Timestamp;
  firstProject: ProjectID;
  firstSource: Source;
  projects: { projectId: ProjectID; visitorId: VisitorID; firstSeen: Timestamp; visits: number }[];
};
```

A `Person` exists only for identified users; it is built from the `visitors` rows that share an `identity.userId`, so it needs no new table, only an index on `(meta->'identity'->>'userId')` in the `visitors` table (migration 0021).

## Database tables

The v2 target schema. Existing tables keep every current column, so the legacy service keeps writing; the SQL below lists only what migrations 0009 to 0020 add or change, with the migration number on each part.

```sql
-- 0009
CREATE TABLE IF NOT EXISTS projects (
  id text PRIMARY KEY,
  name text NOT NULL,
  domain text NOT NULL,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  public_visitor_data boolean NOT NULL DEFAULT false,
  allowed_origins text[] NOT NULL DEFAULT '{}',
  public_key text NOT NULL UNIQUE,
  secret_key_hash text NOT NULL,
  retention_days integer NOT NULL DEFAULT 90,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 0010, 0011, 0013, 0017, 0020
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS route text,
  ADD COLUMN IF NOT EXISTS received_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS referrer_domain text,
  ADD COLUMN IF NOT EXISTS bot_score smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bot_reasons text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS schema_version smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS issue_id bigint;
CREATE INDEX IF NOT EXISTS events_project_name_ts_idx ON events (project_id, name, ts);
CREATE INDEX IF NOT EXISTS events_project_route_ts_idx ON events (project_id, route, ts);
CREATE INDEX IF NOT EXISTS events_human_idx ON events (project_id, ts)
  WHERE bot_score < 50 AND is_internal = false AND is_localhost = false AND is_preview = false;
CREATE INDEX IF NOT EXISTS events_props_gin ON events USING gin (meta jsonb_path_ops);

-- 0011, 0012, 0020
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS bot_score smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_bounce boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS entry_route text,
  ADD COLUMN IF NOT EXISTS exit_route text,
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_campaign text;
DROP INDEX IF EXISTS idx_sessions_session_id;
CREATE UNIQUE INDEX IF NOT EXISTS sessions_project_session_uidx ON sessions (project_id, session_id);

-- 0014: Better Auth user, session and account tables come from its Drizzle adapter

-- 0015
CREATE TABLE IF NOT EXISTS api_tokens (
  id text PRIMARY KEY,
  name text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  scope text NOT NULL CHECK (scope IN ('read', 'admin')),
  project_ids text[],
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 0016
CREATE TABLE IF NOT EXISTS issues (
  id bigserial PRIMARY KEY,
  project_id text NOT NULL,
  fingerprint text NOT NULL,
  title text NOT NULL,
  culprit text,
  level text NOT NULL DEFAULT 'error',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'ignored')),
  count integer NOT NULL DEFAULT 0,
  visitors integer NOT NULL DEFAULT 0,
  first_seen timestamptz NOT NULL,
  last_seen timestamptz NOT NULL,
  first_release text,
  last_release text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, fingerprint)
);

-- 0018
CREATE TABLE IF NOT EXISTS web_vitals (
  id text PRIMARY KEY,
  project_id text NOT NULL,
  session_id text,
  ts timestamptz NOT NULL,
  metric text NOT NULL CHECK (metric IN ('lcp', 'inp', 'cls', 'fcp', 'ttfb')),
  value double precision NOT NULL,
  rating text NOT NULL,
  route text,
  path text NOT NULL,
  device text NOT NULL,
  country text,
  connection text,
  selector text,
  sample_rate real NOT NULL DEFAULT 1,
  navigation_type text,
  bot_score smallint NOT NULL DEFAULT 0,
  is_internal boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS web_vitals_project_metric_ts_idx ON web_vitals (project_id, metric, ts);

-- 0019
CREATE TABLE IF NOT EXISTS rollup_vitals (
  project_id text NOT NULL,
  day date NOT NULL,
  route text NOT NULL DEFAULT '',
  device text NOT NULL,
  metric text NOT NULL,
  samples integer NOT NULL,
  p50 double precision, p75 double precision, p90 double precision, p95 double precision, p99 double precision,
  good integer NOT NULL, needs_improvement integer NOT NULL, poor integer NOT NULL,
  PRIMARY KEY (project_id, day, route, device, metric)
);

-- 0020
ALTER TABLE rollup_daily ADD COLUMN IF NOT EXISTS route text;
```

- Event props stay in the existing `meta` jsonb column; the GIN index makes `prop:<key>` filters usable. A later migration may rename it to `props` once the legacy service is gone.
- `channel` and `referrer_domain` are derived at ingest (search engines, social sites, email and paid UTM mediums), so reports never parse referrer URLs at read time.
- `rollup_daily` keeps its dimension rows; phase 4 adds `referrer_domain`, `channel`, `device`, `browser`, `route` and `event` dimension values to it.
