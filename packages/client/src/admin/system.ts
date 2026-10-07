import type { AdminMetrics, AuthSession, Health, JobName, JobResult } from "@spoar/contract";

import type { ClientResult, Send } from "../types";

export type JobOptions = { days?: number };

export type SystemAdmin = {
  health: () => ClientResult<Health>;
  session: () => ClientResult<AuthSession>;
  metrics: () => ClientResult<AdminMetrics>;
  runJob: (job: JobName, options?: JobOptions) => ClientResult<JobResult>;
};

/**
 * @name systemAdmin
 * @description The routes about the API itself: `health` for anyone, the signed-in `session`,
 * the admin-only ingest `metrics` and job history, and `runJob`, which the cron secret or an
 * admin may call.
 *
 * @example
 * await systemAdmin(send).runJob("rollup", { days: 7 });
 */
export function systemAdmin(send: Send): SystemAdmin {
  return {
    health: () => send.json<Health>({ method: "GET", path: "/v2/health" }),
    session: () => send.json<AuthSession>({ method: "GET", path: "/v2/auth/session" }),
    metrics: () => send.json<AdminMetrics>({ method: "GET", path: "/v2/admin/metrics" }),
    runJob: (job, options = {}) =>
      send.json<JobResult>({
        method: "POST",
        path: `/v2/admin/jobs/${job}`,
        query: { days: options.days },
      }),
  };
}
