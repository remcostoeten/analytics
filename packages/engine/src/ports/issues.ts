import type { Result } from "@remcostoeten/analytics-shared/result";
import type { ProjectID } from "@remcostoeten/analytics-shared/semantic";

import type { EngineError } from "../errors";

export type IssueStatus = "open" | "resolved" | "ignored";

export type IssueRecord = {
  id: string;
  projectId: string;
  title: string;
  culprit: string | null;
  level: "error" | "warning";
  status: IssueStatus;
  isRegression: boolean;
  count: number;
  visitors: number;
  firstSeen: Date;
  lastSeen: Date;
  firstRelease: string | null;
  lastRelease: string | null;
  resolvedAt: Date | null;
  mutedUntil: Date | null;
  muteRemaining: number | null;
};

export type IgnoreRule = {
  id: string;
  projectId: string;
  field: "message" | "stack";
  pattern: string;
  createdAt: Date;
};

export type PendingAlert = { issue: IssueRecord; kind: "new" | "regression" };

export type IssueEventRecord = {
  id: string;
  ts: Date;
  visitorId: string | null;
  path: string;
  props: { [key: string]: unknown };
  release: string | null;
  device: {
    type: string | null;
    browser: string | null;
    browserVersion: string | null;
    os: string | null;
    osVersion: string | null;
    screen: string | null;
    viewport: string | null;
    language: string | null;
    connection: string | null;
  };
};

type Read<Value> = Promise<Result<Value, EngineError>>;

export type IssueStore = {
  list: (
    projectIds: ProjectID[],
    status: IssueStatus | null,
    page: { limit: number; offset: number },
  ) => Read<{ rows: IssueRecord[]; total: number }>;
  get: (projectIds: ProjectID[], id: string) => Read<IssueRecord | null>;
  events: (
    issue: IssueRecord,
    page: { limit: number; offset: number },
  ) => Read<{ rows: IssueEventRecord[]; total: number }>;
  setStatus: (issue: IssueRecord, status: IssueStatus) => Read<IssueRecord>;
  ignores: (projectId: ProjectID) => Read<IgnoreRule[]>;
  muted: (projectId: ProjectID) => Read<IssueRecord[]>;
  addIgnore: (
    projectId: ProjectID,
    field: IgnoreRule["field"],
    pattern: string,
  ) => Read<IgnoreRule>;
  removeIgnore: (projectId: ProjectID, id: string) => Read<boolean>;
  mute: (issue: IssueRecord, until: Date | null, count: number | null) => Read<IssueRecord>;
  pendingAlerts: (limit: number) => Read<PendingAlert[]>;
  markAlerted: (issues: IssueRecord[]) => Read<null>;
};
