import type { Result } from "@remcostoeten/analytics-shared/result";
import type { Nullable, ProjectID } from "@remcostoeten/analytics-shared/semantic";

import type { EngineError } from "../errors";

export type JobName = "rollup" | "cleanup" | "alerts" | "crux";

export type IngestCount = {
  requests: number;
  accepted: number;
  duplicates: number;
  rejected: number;
  rateLimited: number;
};

export type JobRunRecord = {
  job: JobName;
  startedAt: Date;
  status: "ok" | "failed";
  durationMs: number;
  rowsWritten: Nullable<number>;
  rowsDeleted: Nullable<number>;
  message: Nullable<string>;
};

export type SpeedCheck = {
  projectId: ProjectID;
  metric: "lcp" | "inp" | "cls" | "fcp";
  checkedAt: Date;
  ours: Nullable<number>;
  crux: Nullable<number>;
  gap: Nullable<number>;
  flagged: boolean;
};

export type OpsMetrics = {
  ingest: IngestCount;
  bots: { scoredAbove50: number; topReasons: { reason: string; events: number }[] };
  jobs: JobRunRecord[];
  speedChecks: SpeedCheck[];
};

export type CheckTarget = { projectId: ProjectID; domain: string };

type Read<Value> = Promise<Result<Value, EngineError>>;

export type OpsStore = {
  countIngest: (at: Date, count: IngestCount) => Read<null>;
  recordJob: (run: JobRunRecord) => Read<null>;
  metrics: (since: Date) => Read<OpsMetrics>;
  cleanup: (now: Date, batch: number) => Read<{ rowsDeleted: number }>;
  scoreSessions: (from: Date, to: Date) => Read<{ velocity: number; fanout: number }>;
  checkTargets: () => Read<CheckTarget[]>;
  saveChecks: (checks: SpeedCheck[]) => Read<null>;
};
