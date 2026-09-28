import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { BotReason, Role } from "./enums";
import { Count, dataOf, Day, Id, Milliseconds, nullable, oneOf, Timestamp, Url } from "./schema";

export const Health = Type.Object({
  ok: Type.Boolean(),
  version: Type.String({ minLength: 1 }),
  time: Timestamp,
});
export type Health = Static<typeof Health>;

export const AuthSession = Type.Object({
  user: nullable(
    Type.Object({
      id: Id,
      login: Type.String({ minLength: 1 }),
      name: nullable(Type.String()),
      avatarUrl: nullable(Url),
    }),
  ),
  session: nullable(Type.Object({ expiresAt: Timestamp })),
  role: nullable(Role),
  isAdmin: Type.Boolean(),
});
export type AuthSession = Static<typeof AuthSession>;

export const JobName = oneOf(["rollup", "cleanup", "alerts"]);
export type JobName = Static<typeof JobName>;

export const JobStatus = oneOf(["ok", "failed"]);
export type JobStatus = Static<typeof JobStatus>;

export const JobRun = Type.Object({
  job: JobName,
  lastRunAt: Timestamp,
  status: JobStatus,
  durationMs: Milliseconds,
  rowsWritten: Type.Optional(Count),
  rowsDeleted: Type.Optional(Count),
});
export type JobRun = Static<typeof JobRun>;

export const AdminMetrics = dataOf(
  Type.Object({
    ingest: Type.Object({
      last24h: Type.Object({
        requests: Count,
        accepted: Count,
        duplicates: Count,
        rejected: Count,
        rateLimited: Count,
      }),
    }),
    bots: Type.Object({
      last24h: Type.Object({
        scoredAbove50: Count,
        topReasons: Type.Array(Type.Object({ reason: BotReason, events: Count })),
      }),
    }),
    jobs: Type.Array(JobRun),
  }),
);
export type AdminMetrics = Static<typeof AdminMetrics>;

export const JobQuery = Type.Object({
  days: Type.Optional(Type.Integer({ minimum: 1, maximum: 90 })),
});
export type JobQuery = Static<typeof JobQuery>;

export const JobResult = dataOf(
  Type.Object({
    job: JobName,
    status: JobStatus,
    startDay: Type.Optional(Day),
    days: Type.Optional(Type.Integer({ minimum: 1 })),
    rowsWritten: Type.Optional(Count),
    rowsDeleted: Type.Optional(Count),
    durationMs: Milliseconds,
  }),
);
export type JobResult = Static<typeof JobResult>;
