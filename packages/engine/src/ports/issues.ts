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
};

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
};
