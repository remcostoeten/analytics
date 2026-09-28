import { JobResult } from "@remcostoeten/analytics-contract";
import { engineError } from "@remcostoeten/analytics-engine";
import type {
  EngineError,
  IssueStore,
  JobName,
  OpsStore,
  SpeedStore,
} from "@remcostoeten/analytics-engine";
import { ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";
import { Elysia, t } from "elysia";

import type { AccessDeps } from "../../access/types";
import { access } from "../../plugins/access";
import { failure } from "../../plugins/error-handler";
import { errorResponses } from "../../plugins/error-responses";
import { sendAlerts } from "./alerts";
import type { AlertOptions } from "./alerts";
import { checkCrux } from "./crux";
import type { CruxOptions } from "./crux";

export type JobsOptions = {
  speed: SpeedStore;
  issues: IssueStore;
  ops: Nullable<OpsStore>;
  alerts: Nullable<AlertOptions>;
  crux: Nullable<CruxOptions>;
  clock: () => Date;
};

type Set = { status?: unknown; headers: { [name: string]: unknown } };

type Outcome = {
  startDay?: string;
  days?: number;
  rowsWritten?: number;
  rowsDeleted?: number;
};

const dayMs = 24 * 60 * 60 * 1000;
const rawDays = 30;
const maxDays = 90;
const cleanupBatch = 50_000;

function startOfDay(at: Date) {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
}

/**
 * @name jobsModule
 * @description Scheduled jobs behind the cron secret, each recorded in the job history:
 * `rollup?days=2` rolls the last `days` UTC days of `web_vitals` into `rollup_vitals` and drops
 * raw speed rows past 30 days; `cleanup` deletes events and sessions past each project's
 * retention, 50,000 of each per run; `alerts` posts new issues and regressions to the alert
 * webhook; `crux` compares each project's p75 with the Chrome UX Report.
 *
 * @example
 * app.use(jobsModule(deps, { speed, issues, ops, alerts: null, crux: null, clock }, docsBase));
 */
export function jobsModule(deps: AccessDeps, options: JobsOptions, docsBase: string) {
  function reject(error: EngineError, set: Set) {
    const failed = failure(error, set.headers, docsBase);
    set.status = failed.status;
    return failed.body;
  }

  async function run(job: JobName, set: Set, work: () => Promise<Result<Outcome, EngineError>>) {
    const startedAt = options.clock();
    const started = performance.now();
    const result = await work();
    const durationMs = Math.round(performance.now() - started);
    await options.ops?.recordJob({
      job,
      startedAt,
      status: result.ok ? "ok" : "failed",
      durationMs,
      rowsWritten: result.ok ? (result.value.rowsWritten ?? null) : null,
      rowsDeleted: result.ok ? (result.value.rowsDeleted ?? null) : null,
      message: result.ok ? null : result.error.message,
    });
    if (!result.ok) return reject(result.error, set);
    return { data: { job, status: "ok" as const, ...result.value, durationMs } };
  }

  function unset(name: string): Promise<Result<Outcome, EngineError>> {
    return Promise.resolve({ ok: false, error: engineError("UNAVAILABLE", `${name} is not set`) });
  }

  const route = { access: "cron" as const, response: { 200: JobResult, ...errorResponses } };
  const tags = ["Jobs"];

  return new Elysia({ name: "jobs" })
    .use(access(deps, docsBase))
    .post(
      "/admin/jobs/rollup",
      async ({ query, set }) => {
        const days = Number(query.days ?? 2);
        if (!Number.isInteger(days) || days < 1 || days > maxDays) {
          return reject(
            engineError("VALIDATION_FAILED", `days must be a whole number from 1 to ${maxDays}`),
            set,
          );
        }
        return run("rollup", set, async () => {
          const now = options.clock();
          const to = new Date(startOfDay(now).getTime() + dayMs);
          const from = new Date(to.getTime() - days * dayMs);
          const result = await options.speed.rollup(
            from,
            to,
            new Date(now.getTime() - rawDays * dayMs),
          );
          if (!result.ok) return result;
          return ok({ startDay: from.toISOString().slice(0, 10), days, ...result.value });
        });
      },
      {
        ...route,
        query: t.Object({ days: t.Optional(t.String()) }),
        detail: {
          summary: "Roll up speed",
          description:
            "Writes daily p50 to p99 and rating counts per project, route, device and metric, and drops raw speed rows past 30 days. Needs the cron secret.",
          tags,
        },
      },
    )
    .post(
      "/admin/jobs/cleanup",
      ({ set }) =>
        run("cleanup", set, async () => {
          if (!options.ops) return unset("The operations store");
          return options.ops.cleanup(options.clock(), cleanupBatch);
        }),
      {
        ...route,
        detail: {
          summary: "Delete expired rows",
          description:
            "Deletes events and sessions older than each project's `retentionDays`, up to 50,000 of each per run, and rate limit windows older than a day; `rowsDeleted` is the total. Needs the cron secret.",
          tags,
        },
      },
    )
    .post(
      "/admin/jobs/alerts",
      ({ set }) =>
        run("alerts", set, async () => {
          if (!options.alerts) return unset("ALERT_WEBHOOK_URL");
          const result = await sendAlerts(options.issues, options.alerts, options.clock());
          return result.ok ? ok({ rowsWritten: result.value.sent }) : result;
        }),
      {
        ...route,
        detail: {
          summary: "Send issue alerts",
          description:
            "Posts new issues and regressions since the last run, up to 100, to `ALERT_WEBHOOK_URL`, signed with `ALERT_WEBHOOK_SECRET` as `x-analytics-signature: sha256=<hmac>`; `rowsWritten` is the number sent. Needs the cron secret.",
          tags,
        },
      },
    )
    .post(
      "/admin/jobs/crux",
      ({ set }) =>
        run("crux", set, async () => {
          if (!options.crux) return unset("CRUX_API_KEY");
          if (!options.ops) return unset("The operations store");
          const targets = await options.ops.checkTargets();
          if (!targets.ok) return targets;
          const checks = await checkCrux(
            options.speed,
            targets.value,
            options.crux,
            options.clock(),
          );
          if (!checks.ok) return checks;
          const saved = await options.ops.saveChecks(checks.value);
          return saved.ok ? ok({ rowsWritten: checks.value.length }) : saved;
        }),
      {
        ...route,
        detail: {
          summary: "Compare speed with the Chrome UX Report",
          description:
            "For each project, compares the p75 of LCP, INP, CLS and FCP over 28 days with the Chrome UX Report for its origin and flags a gap over 25% in `/v2/admin/metrics`. Run it weekly. Needs `CRUX_API_KEY` and the cron secret.",
          tags,
        },
      },
    );
}
