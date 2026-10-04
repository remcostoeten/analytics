import type {
  BotReason,
  DeviceType,
  Issue,
  IssueEvent,
  LiveEvent,
  SpeedRoute,
} from "@spoar/contract";
import type {
  CountryCode,
  ID,
  Milliseconds,
  Nullable,
  Path,
  ProjectID,
  SessionID,
  Timestamp,
  VisitorID,
} from "@spoar/shared/semantic";

export type { Issue, IssueEvent, LiveEvent, SpeedRoute };

export type Consent = "granted" | "denied" | "unset";

export type Bootstrap = {
  token: string;
  expiresAt: Timestamp;
  project: { id: ProjectID; name: string; environment: string };
  user: { name: string };
  widgetReports: boolean;
};

export type Vitals = {
  lcp: Nullable<Milliseconds>;
  inp: Nullable<Milliseconds>;
  cls: Nullable<number>;
};

export type OnlineVisitor = {
  id: VisitorID;
  session: SessionID;
  seenAt: Timestamp;
  path: Path;
  referrer: Nullable<string>;
  country: Nullable<CountryCode>;
  city: Nullable<string>;
  device: DeviceType;
  botScore: number;
  pages: number;
  durationMs: Milliseconds;
  trail: Path[];
  client: {
    os: Nullable<string>;
    browser: Nullable<string>;
    screen: Nullable<string>;
    language: Nullable<string>;
  };
  vitals: Vitals;
  userId: Nullable<string>;
  consent: Consent;
};

export type BotSignal = {
  reason: BotReason;
  weight: number;
};

export type VisitorDetail = {
  id: VisitorID;
  botScore: number;
  botSignals: BotSignal[];
};

export type SessionSignal = "human" | "engaged" | "suspect" | "bot";

export type LiveSession = {
  id: SessionID;
  visitor: VisitorID;
  startedAt: Timestamp;
  trail: Path[];
  pages: number;
  durationMs: Milliseconds;
  signal: SessionSignal;
  botScore: number;
};

export type LogLevel = "info" | "warn" | "error";
export type LogOutcome = "sent" | "retry" | "rejected" | "dropped" | "signal" | "job" | "info";
export type LogKind = "ingest" | "transport" | "pipeline" | "signals" | "jobs" | "auth";
export type LogSource = "api" | "sdk" | "engine" | "cron";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type LogEntry = {
  id: ID;
  at: Timestamp;
  level: LogLevel;
  outcome: LogOutcome;
  kind: LogKind;
  source: LogSource;
  message: string;
  code: Nullable<string>;
  visitor: Nullable<VisitorID>;
  path: Nullable<Path>;
  data: JsonValue;
};

export type ClientReport = {
  at: Timestamp;
  outcome: "dropped" | "error";
  code: string;
  message: string;
  path: Path;
};

export type Share = {
  label: string;
  value: number;
};

export type Overview = {
  online: number;
  viewsPerMinute: number[];
  today: { visitors: number; pageviews: number; bounceRate: number; sessionMs: Milliseconds };
  ingest: { accepted: number; rejected: number; duplicates: number; ratio: number };
  bots: { share: number; reasons: Share[] };
  topPages: Share[];
  referrers: Share[];
  countries: Share[];
  release: Nullable<{ name: string; deployedAt: Timestamp; newIssues: number }>;
  lcp: Nullable<Milliseconds>;
  errors: number;
  config: { [key: string]: JsonValue };
};

export type Page<Item> = {
  data: Item[];
  nextCursor: Nullable<string>;
};
