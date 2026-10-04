import { JobResult } from "@spoar/contract";
import { engineError, jobLine, rawVitalDays } from "@spoar/engine";
import type {
  EngineError,
  IssueStore,
  JobName,
  LogStore,
  OpsStore,
  SpeedStore,
} from "@spoar/engine";
import { ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";
import { runAlerts } from "@spoar/engine/alerts";
import type { Nullable } from "@spoar/shared/semantic";
import { Elysia, t } from "elysia";

import type { AccessDeps } from "../../access/types";
import { access } from "../../plugins/access";
import { failure } from "../../plugins/error-handler";
import { errorResponses } from "../../plugins/error-responses";
import type { AlertsDeps } from "../alerts/service";
import { checkCrux } from "./crux";
import type { CruxOptions } from "./crux";

export type JobsOptions = {
  speed: SpeedStore;
  issues: IssueStore;
  ops: Nullable<OpsStore>;
  alerts: Nullable<AlertsDeps>;
  crux: Nullable<CruxOptions>;
  clock: () => Date;
  logs?: Nullable<LogStore>;
};

type Set = { status?: unknown; headers: { [name: string]: unknown } };

type Outcome = {
  startDay?: string;
  days?: number;
  rowsWritten?: number;
  rowsDeleted?: number;
};

const dayMs = 24 * 60 * 60 * 1000;
const maxDays = 90;
const cleanupBatch = 50_000;

function startOfDay(at: Date) {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
}

/**
 * @name jobsModule
 * @description Scheduled jobs behind the cron secret, each recorded in the job history:
 * `rollup?days=2` runs the session layer of bot detection over the previous UTC day, then rolls
 * the last `days` UTC days of `web_vitals` into `rollup_vitals` and drops raw speed rows past 30
 * days; `cleanup` deletes events, sessions and raw speed rows past each project's retention,
 * 50,000 of each per run, plus week-old log lines and expired widget tokens; `alerts` queues new
 * issues and regressions and sends due deliveries to the alert targets; `crux` compares each
 * project's p75 with the Chrome UX Report. With `logs`, every run also writes a `jobs` line to
 * each project's log.
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
    await logRun(job, startedAt, {
      ok: result.ok,
      durationMs,
      rowsWritten: result.ok ? (result.value.rowsWritten ?? null) : null,
      rowsDeleted: result.ok ? (result.value.rowsDeleted ?? null) : null,
    });
    if (!result.ok) return reject(result.error, set);
    return { data: { job, status: "ok" as const, ...result.value, durationMs } };
  }

  async function logRun(
    job: JobName,
    at: Date,
    outcome: {
      ok: boolean;
      durationMs: number;
      rowsWritten: Nullable<number>;
      rowsDeleted: Nullable<number>;
    },
  ) {
    if (!options.logs) return;
    const projects = await deps.projects.list(null);
    if (!projects.ok) return;
    await options.logs.write(
      projects.value.map((project) => jobLine(project.id, at, { job, ...outcome })),
    );
  }

  function unset(name: string): Promise<Result<Outcome, EngineError>> {
    return Promise.resolve({ ok: false, error: engineError("UNAVAILABLE", `${name} is not set`) });
  }

  async function scoreYesterday(now: Date): Promise<Result<number, EngineError>> {
    if (!options.ops) return ok(0);
    const to = startOfDay(now);
    const scored = await options.ops.scoreSessions(new Date(to.getTime() - dayMs), to);
    return scored.ok ? ok(scored.value.velocity + scored.value.fanout) : scored;
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
          const scored = await scoreYesterday(now);
          if (!scored.ok) return scored;
          const result = await options.speed.rollup(
            from,
            to,
            new Date(now.getTime() - rawVitalDays * dayMs),
          );
          if (!result.ok) return result;
          return ok({
            startDay: from.toISOString().slice(0, 10),
            days,
            rowsWritten: result.value.rowsWritten + scored.value,
            rowsDeleted: result.value.rowsDeleted,
          });
        });
      },
      {
        ...route,
        query: t.Object({ days: t.Optional(t.String()) }),
        detail: {
          summary: "Roll up speed",
          description:
            "Runs the session bot signals (`session_velocity`, `ip_fanout`) over the previous UTC day first, which adds each reason once, so a rerun changes nothing, and copies session bot scores onto their speed rows. Then writes daily p50 to p99 and rating counts per project, route, device and metric and drops raw speed rows past 30 days. `rowsWritten` counts rollup rows plus events the session signals raised. Needs the cron secret.",
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
            "Deletes events, sessions and raw speed rows older than each project's `retentionDays`, up to 50,000 of each per run, log lines older than 7 days, expired widget tokens and rate limit windows older than a day; `rowsDeleted` is the total. Needs the cron secret.",
          tags,
        },
      },
    )
    .post(
      "/admin/jobs/alerts",
      ({ set }) =>
        run("alerts", set, async () => {
          if (!options.alerts) {
            return {
              ok: false as const,
              error: engineError(
                "UNAVAILABLE",
                "Alerts are off: alerts() is not in analytics.config.ts",
              ),
            };
          }
          const result = await runAlerts(
            options.alerts.plugin,
            {
              issues: options.issues,
              speed: options.speed,
              alerts: options.alerts.store,
              links: options.alerts.links,
            },
            options.clock(),
          );
          return result.ok ? ok({ rowsWritten: result.value.sent }) : result;
        }),
      {
        ...route,
        detail: {
          summary: "Queue and send alerts",
          description:
            "Queues new issues and regressions, up to 100 per run, and speed drops (yesterday's Real Experience Score against the 7 days before it), as one delivery per subscribed alert target, then sends every due delivery, one mail or request per target, retrying failures by the retry policy; `rowsWritten` is the number sent. Answers 503 when `alerts()` is not in the config. Needs the cron secret.",
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
