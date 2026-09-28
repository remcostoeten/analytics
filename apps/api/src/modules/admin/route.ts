import { AdminMetrics } from "@remcostoeten/analytics-contract";
import type { BotReason } from "@remcostoeten/analytics-contract";
import { engineError } from "@remcostoeten/analytics-engine";
import type { OpsStore } from "@remcostoeten/analytics-engine";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";
import { Elysia } from "elysia";

import type { AccessDeps } from "../../access/types";
import { access } from "../../plugins/access";
import { failure } from "../../plugins/error-handler";
import { errorResponses } from "../../plugins/error-responses";

const dayMs = 24 * 60 * 60 * 1000;

/**
 * @name adminModule
 * @description `GET /admin/metrics` for admins: ingest counters and bot numbers over the last 24
 * hours, the last run of each job, and the Chrome UX Report checks, all from Postgres so every
 * serverless instance answers the same.
 *
 * @example
 * app.use(adminModule(deps, { ops, clock }, docsBase));
 */
export function adminModule(
  deps: AccessDeps,
  options: { ops: Nullable<OpsStore>; clock: () => Date },
  docsBase: string,
) {
  return new Elysia({ name: "admin" }).use(access(deps, docsBase)).get(
    "/admin/metrics",
    async ({ set }) => {
      set.headers["cache-control"] = "private, no-store";
      const found = options.ops
        ? await options.ops.metrics(new Date(options.clock().getTime() - dayMs))
        : { ok: false as const, error: engineError("UNAVAILABLE", "No operations store") };
      if (!found.ok) {
        const failed = failure(found.error, set.headers, docsBase);
        set.status = failed.status;
        return failed.body;
      }
      const metrics = found.value;
      return {
        data: {
          ingest: { last24h: metrics.ingest },
          bots: {
            last24h: {
              scoredAbove50: metrics.bots.scoredAbove50,
              topReasons: metrics.bots.topReasons.map((row) => ({
                reason: row.reason as BotReason,
                events: row.events,
              })),
            },
          },
          jobs: metrics.jobs.map((run) => ({
            job: run.job,
            lastRunAt: run.startedAt.toISOString(),
            status: run.status,
            durationMs: run.durationMs,
            ...(run.rowsWritten === null ? {} : { rowsWritten: run.rowsWritten }),
            ...(run.rowsDeleted === null ? {} : { rowsDeleted: run.rowsDeleted }),
            ...(run.message === null ? {} : { message: run.message }),
          })),
          speedChecks: metrics.speedChecks.map((check) => ({
            project: check.projectId,
            metric: check.metric,
            checkedAt: check.checkedAt.toISOString(),
            ours: check.ours,
            crux: check.crux,
            gap: check.gap,
            flagged: check.flagged,
          })),
        },
      };
    },
    {
      access: "admin",
      response: { 200: AdminMetrics, ...errorResponses },
      detail: {
        summary: "Operations metrics",
        description:
          "Ingest counters and bots over the last 24 hours, each job's last run, and the Chrome UX Report checks with gaps over 25% flagged.",
        tags: ["Jobs"],
      },
    },
  );
}
