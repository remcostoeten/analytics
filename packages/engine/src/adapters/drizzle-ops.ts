import { ok } from "@spoar/shared/result";
import { sql } from "drizzle-orm";

import { scoreSessions } from "../jobs/session-signals";
import type { JobName, OpsStore, SpeedCheck } from "../ports";
import type { Database } from "./drizzle";
import { attempt, numeric, selectRows, textual } from "./drizzle-rows";

const botThreshold = 50;
const topReasons = 5;
const rateLimitDays = 1;
const sentDays = 30;
const failedDays = 90;

function hourOf(at: Date) {
  const hour = new Date(at);
  hour.setUTCMinutes(0, 0, 0);
  return hour.toISOString();
}

function nullableNumber(value: unknown) {
  return value === null || value === undefined ? null : numeric(value);
}

/**
 * @name drizzleOps
 * @description The `OpsStore` on Postgres: hourly ingest counters, the job history, bot and
 * ingest numbers since a moment, retention cleanup of events and sessions past each project's
 * `retention_days` in batches, alert deliveries sent over 30 days ago or failed over 90 days ago,
 * the session layer of bot detection over a range, and the Chrome UX Report checks.
 *
 * @example
 * await drizzleOps(db).metrics(new Date(Date.now() - 86_400_000));
 */
export function drizzleOps(db: Database): OpsStore {
  return {
    countIngest: (at, count) =>
      attempt("Could not count the ingest request", async () => {
        await db.execute(
          sql`INSERT INTO ingest_counts (hour_start, requests, accepted, duplicates, rejected, rate_limited)
            VALUES (${hourOf(at)}::timestamptz, ${count.requests}, ${count.accepted}, ${count.duplicates},
              ${count.rejected}, ${count.rateLimited})
            ON CONFLICT (hour_start) DO UPDATE SET
              requests = ingest_counts.requests + excluded.requests,
              accepted = ingest_counts.accepted + excluded.accepted,
              duplicates = ingest_counts.duplicates + excluded.duplicates,
              rejected = ingest_counts.rejected + excluded.rejected,
              rate_limited = ingest_counts.rate_limited + excluded.rate_limited`,
        );
        return null;
      }),
    recordJob: (run) =>
      attempt("Could not record the job run", async () => {
        await db.execute(
          sql`INSERT INTO job_runs (job, started_at, status, duration_ms, rows_written, rows_deleted, message)
            VALUES (${run.job}, ${run.startedAt.toISOString()}::timestamptz, ${run.status},
              ${Math.round(run.durationMs)}, ${run.rowsWritten}, ${run.rowsDeleted}, ${run.message})`,
        );
        return null;
      }),
    metrics: (since) =>
      attempt("Could not read the operations metrics", async () => {
        const from = since.toISOString();
        const [ingest] = await selectRows(
          db,
          sql`SELECT coalesce(sum(requests), 0) AS requests, coalesce(sum(accepted), 0) AS accepted,
              coalesce(sum(duplicates), 0) AS duplicates, coalesce(sum(rejected), 0) AS rejected,
              coalesce(sum(rate_limited), 0) AS rate_limited
            FROM ingest_counts WHERE hour_start >= date_trunc('hour', ${from}::timestamptz)`,
        );
        const [bots] = await selectRows(
          db,
          sql`SELECT count(*) AS events FROM events
            WHERE received_at >= ${from}::timestamptz AND bot_score >= ${botThreshold}`,
        );
        const reasons = await selectRows(
          db,
          sql`SELECT reason, count(*) AS events
            FROM events, unnest(bot_reasons) AS reason
            WHERE received_at >= ${from}::timestamptz AND bot_score >= ${botThreshold}
            GROUP BY reason ORDER BY count(*) DESC, reason LIMIT ${topReasons}`,
        );
        const jobs = await selectRows(
          db,
          sql`SELECT DISTINCT ON (job) job, started_at, status, duration_ms, rows_written, rows_deleted, message
            FROM job_runs ORDER BY job, started_at DESC`,
        );
        const checks = await selectRows(
          db,
          sql`SELECT project_id, metric, checked_at, ours, crux, gap, flagged
            FROM speed_checks ORDER BY flagged DESC, project_id, metric`,
        );
        return {
          ingest: {
            requests: numeric(ingest?.requests),
            accepted: numeric(ingest?.accepted),
            duplicates: numeric(ingest?.duplicates),
            rejected: numeric(ingest?.rejected),
            rateLimited: numeric(ingest?.rate_limited),
          },
          bots: {
            scoredAbove50: numeric(bots?.events),
            topReasons: reasons.map((row) => ({
              reason: textual(row.reason),
              events: numeric(row.events),
            })),
          },
          jobs: jobs.map((row) => ({
            job: textual(row.job) as JobName,
            startedAt: new Date(textual(row.started_at)),
            status: row.status === "failed" ? ("failed" as const) : ("ok" as const),
            durationMs: numeric(row.duration_ms),
            rowsWritten: nullableNumber(row.rows_written),
            rowsDeleted: nullableNumber(row.rows_deleted),
            message: row.message === null ? null : textual(row.message),
          })),
          speedChecks: checks.map((row) => ({
            projectId: textual(row.project_id),
            metric: textual(row.metric) as SpeedCheck["metric"],
            checkedAt: new Date(textual(row.checked_at)),
            ours: nullableNumber(row.ours),
            crux: nullableNumber(row.crux),
            gap: nullableNumber(row.gap),
            flagged: row.flagged === true,
          })),
        };
      }),
    scoreSessions: (from, to) =>
      attempt("Could not score the sessions", () => scoreSessions(db, { from, to }, false)),
    cleanup: (now, batch) =>
      attempt("Could not clean up expired rows", async () => {
        const at = now.toISOString();
        const events = await selectRows(
          db,
          sql`DELETE FROM events WHERE id IN (
              SELECT e.id FROM events e JOIN projects p ON p.id = e.project_id
              WHERE e.ts < ${at}::timestamptz - make_interval(days => p.retention_days)
              LIMIT ${batch})
            RETURNING id`,
        );
        const sessions = await selectRows(
          db,
          sql`DELETE FROM sessions WHERE id IN (
              SELECT s.id FROM sessions s JOIN projects p ON p.id = s.project_id
              WHERE s.last_event_at < ${at}::timestamptz - make_interval(days => p.retention_days)
              LIMIT ${batch})
            RETURNING id`,
        );
        const vitals = await selectRows(
          db,
          sql`DELETE FROM web_vitals WHERE id IN (
              SELECT w.id FROM web_vitals w JOIN projects p ON p.id = w.project_id
              WHERE w.ts < ${at}::timestamptz - make_interval(days => p.retention_days)
              LIMIT ${batch})
            RETURNING id`,
        );
        const limits = await selectRows(
          db,
          sql`DELETE FROM rate_limits
            WHERE window_start < ${at}::timestamptz - make_interval(days => ${rateLimitDays})
            RETURNING key`,
        );
        const deliveries = await selectRows(
          db,
          sql`DELETE FROM alert_deliveries
            WHERE (status = 'sent' AND created_at < ${at}::timestamptz - make_interval(days => ${sentDays}))
              OR (status = 'failed' AND created_at < ${at}::timestamptz - make_interval(days => ${failedDays}))
            RETURNING id`,
        );
        return {
          rowsDeleted:
            events.length + sessions.length + vitals.length + limits.length + deliveries.length,
        };
      }),
    checkTargets: () =>
      attempt("Could not read the projects to check", async () => {
        const rows = await selectRows(
          db,
          sql`SELECT id, domain FROM projects WHERE domain IS NOT NULL AND domain <> '' ORDER BY id`,
        );
        return rows.map((row) => ({ projectId: textual(row.id), domain: textual(row.domain) }));
      }),
    saveChecks: async (checks) => {
      if (checks.length === 0) return ok(null);
      return attempt("Could not save the speed checks", async () => {
        await db.execute(
          sql`INSERT INTO speed_checks (project_id, metric, checked_at, ours, crux, gap, flagged)
            VALUES ${sql.join(
              checks.map(
                (check) =>
                  sql`(${check.projectId}, ${check.metric}, ${check.checkedAt.toISOString()}::timestamptz,
                    ${check.ours}, ${check.crux}, ${check.gap}, ${check.flagged})`,
              ),
              sql`, `,
            )}
            ON CONFLICT (project_id, metric) DO UPDATE SET checked_at = excluded.checked_at,
              ours = excluded.ours, crux = excluded.crux, gap = excluded.gap, flagged = excluded.flagged`,
        );
        return null;
      });
    },
  };
}
