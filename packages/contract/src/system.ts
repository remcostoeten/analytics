import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { BotReason, Role } from "./enums";
import { Count, Id, nullable, oneOf, Timestamp, Url } from "./schema";
import adminMetrics from "../fixtures/AdminMetrics/valid/last-day.json";
import authSession from "../fixtures/AuthSession/valid/signed-in.json";
import health from "../fixtures/Health/valid/ok.json";
import rollup from "../fixtures/JobResult/valid/rollup.json";

export const Health = Type.Object(
  {
    ok: Type.Boolean({ description: "Always true when the API answers." }),
    version: Type.String({ minLength: 1, description: "The API version." }),
    time: Type.String({ format: "date-time", description: "The server's current time." }),
  },
  { examples: [health] },
);
export type Health = Static<typeof Health>;

export const AuthSession = Type.Object(
  {
    user: Type.Union(
      [
        Type.Object({
          id: Id,
          login: Type.String({
            minLength: 1,
            description: "GitHub login, or the display name when GitHub gave none.",
          }),
          name: nullable(Type.String()),
          avatarUrl: nullable(Url),
        }),
        Type.Null(),
      ],
      { description: "The signed-in GitHub user; null when signed out." },
    ),
    session: Type.Union(
      [
        Type.Object({
          expiresAt: Type.String({ format: "date-time", description: "When the session ends." }),
        }),
        Type.Null(),
      ],
      { description: "The sign-in session; null when signed out." },
    ),
    role: nullable(Role),
    isAdmin: Type.Boolean({
      description:
        "Whether the user is an owner or admin, who may change settings. Their own visits are marked internal.",
    }),
  },
  { examples: [authSession] },
);
export type AuthSession = Static<typeof AuthSession>;

export const JobName = oneOf(["rollup", "cleanup", "alerts", "crux"], {
  description:
    "`rollup` rescores sessions and rolls up speed data, `cleanup` deletes rows past retention, `alerts` queues and sends alerts, `crux` compares speed with the Chrome UX Report.",
});
export type JobName = Static<typeof JobName>;

export const JobStatus = oneOf(["ok", "failed"]);
export type JobStatus = Static<typeof JobStatus>;

export const JobRun = Type.Object({
  job: JobName,
  lastRunAt: Type.String({ format: "date-time", description: "When the latest run started." }),
  status: JobStatus,
  durationMs: Type.Number({ minimum: 0, description: "How long the run took." }),
  rowsWritten: Type.Optional(Count),
  rowsDeleted: Type.Optional(Count),
  message: Type.Optional(Type.String({ description: "The error message of a failed run." })),
});
export type JobRun = Static<typeof JobRun>;

export const SpeedCheck = Type.Object({
  project: Type.String({ minLength: 1 }),
  metric: oneOf(["lcp", "inp", "cls", "fcp"]),
  checkedAt: Timestamp,
  ours: nullable(
    Type.Number({
      minimum: 0,
      description: "Our p75 over the last 28 days, from human traffic with at least 20 samples.",
    }),
  ),
  crux: nullable(
    Type.Number({
      minimum: 0,
      description:
        "The Chrome UX Report p75 for the project's origin; null when Google has no data.",
    }),
  ),
  gap: nullable(
    Type.Number({
      minimum: 0,
      description: "`|ours - crux| / crux`, rounded to three decimals; null without both values.",
    }),
  ),
  flagged: Type.Boolean({ description: "Whether the gap is above 0.25." }),
});
export type SpeedCheck = Static<typeof SpeedCheck>;

export const AdminMetrics = Type.Object(
  {
    data: Type.Object({
      ingest: Type.Object({
        last24h: Type.Object(
          {
            requests: Type.Integer({ minimum: 0, description: "Ingest requests received." }),
            accepted: Type.Integer({ minimum: 0, description: "Events stored." }),
            duplicates: Type.Integer({ minimum: 0, description: "Events skipped as repeats." }),
            rejected: Type.Integer({ minimum: 0, description: "Events that failed validation." }),
            rateLimited: Type.Integer({
              minimum: 0,
              description: "Requests refused by the per-IP rate limit.",
            }),
          },
          { description: "Ingest counters from the start of the hour 24 hours ago." },
        ),
      }),
      bots: Type.Object({
        last24h: Type.Object({
          scoredAbove50: Type.Integer({
            minimum: 0,
            description: "Events received in the last 24 hours with a bot score of 50 or more.",
          }),
          topReasons: Type.Array(Type.Object({ reason: BotReason, events: Count }), {
            description: "The five most common reasons on those events.",
          }),
        }),
      }),
      jobs: Type.Array(JobRun, { description: "The latest run of each job." }),
      speedChecks: Type.Array(SpeedCheck, { description: "Flagged checks first." }),
    }),
  },
  { examples: [adminMetrics] },
);
export type AdminMetrics = Static<typeof AdminMetrics>;

export const JobQuery = Type.Object({
  days: Type.Optional(
    Type.Integer({
      minimum: 1,
      maximum: 90,
      description:
        "For `rollup`: how many UTC days of speed data to roll up, ending with today; 2 by default.",
    }),
  ),
});
export type JobQuery = Static<typeof JobQuery>;

export const JobResult = Type.Object(
  {
    data: Type.Object({
      job: JobName,
      status: JobStatus,
      startDay: Type.Optional(
        Type.String({ format: "date", description: "First UTC day rolled up." }),
      ),
      days: Type.Optional(
        Type.Integer({ minimum: 1, description: "UTC days rolled up, ending with today." }),
      ),
      rowsWritten: Type.Optional(Count),
      rowsDeleted: Type.Optional(Count),
      durationMs: Type.Number({ minimum: 0, description: "How long the run took." }),
    }),
  },
  { examples: [rollup] },
);
export type JobResult = Static<typeof JobResult>;
