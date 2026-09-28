import { JobResult } from "@remcostoeten/analytics-contract";
import { engineError } from "@remcostoeten/analytics-engine";
import type { SpeedStore } from "@remcostoeten/analytics-engine";
import { Elysia, t } from "elysia";

import type { AccessDeps } from "../../access/types";
import { access } from "../../plugins/access";
import { failure } from "../../plugins/error-handler";
import { errorResponses } from "../../plugins/error-responses";

export type JobsOptions = { speed: SpeedStore; clock: () => Date };

const dayMs = 24 * 60 * 60 * 1000;
const rawDays = 30;
const maxDays = 90;

function startOfDay(at: Date) {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
}

/**
 * @name jobsModule
 * @description Scheduled jobs behind the cron secret: `POST /admin/jobs/rollup?days=2` rolls the
 * last `days` UTC days of `web_vitals` into `rollup_vitals` (today included) and drops raw speed
 * rows older than 30 days.
 *
 * @example
 * app.use(jobsModule(deps, { speed, clock }, docsBase));
 */
export function jobsModule(deps: AccessDeps, options: JobsOptions, docsBase: string) {
  return new Elysia({ name: "jobs" }).use(access(deps, docsBase)).post(
    "/admin/jobs/rollup",
    async ({ query, set }) => {
      const days = Number(query.days ?? 2);
      if (!Number.isInteger(days) || days < 1 || days > maxDays) {
        const failed = failure(
          engineError("VALIDATION_FAILED", `days must be a whole number from 1 to ${maxDays}`),
          set.headers,
          docsBase,
        );
        set.status = failed.status;
        return failed.body;
      }
      const started = Date.now();
      const now = options.clock();
      const to = new Date(startOfDay(now).getTime() + dayMs);
      const from = new Date(to.getTime() - days * dayMs);
      const result = await options.speed.rollup(
        from,
        to,
        new Date(now.getTime() - rawDays * dayMs),
      );
      if (!result.ok) {
        const failed = failure(result.error, set.headers, docsBase);
        set.status = failed.status;
        return failed.body;
      }
      return {
        data: {
          job: "rollup" as const,
          status: "ok" as const,
          startDay: from.toISOString().slice(0, 10),
          days,
          rowsWritten: result.value.rowsWritten,
          rowsDeleted: result.value.rowsDeleted,
          durationMs: Date.now() - started,
        },
      };
    },
    {
      access: "cron",
      query: t.Object({ days: t.Optional(t.String()) }),
      response: { 200: JobResult, ...errorResponses },
      detail: {
        summary: "Roll up speed",
        description:
          "Writes daily p50 to p99 and rating counts per project, route, device and metric, and drops raw speed rows past 30 days. Needs the cron secret.",
        tags: ["Jobs"],
      },
    },
  );
}
