import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import type { SpeedScope, SpeedStore } from "../ports";
import type { VitalName } from "../speed/score";
import type { Database } from "./drizzle";
import { attempt, numeric, selectRows, textual } from "./drizzle-rows";

const humanScore = 50;

function where(scope: SpeedScope): SQL {
  const conditions: SQL[] = [
    scope.projectIds.length > 0
      ? sql`w.project_id IN (${sql.join(
          scope.projectIds.map((id) => sql`${id}`),
          sql`, `,
        )})`
      : sql`false`,
    sql`w.ts >= ${scope.from.toISOString()}::timestamptz`,
    sql`w.ts < ${scope.to.toISOString()}::timestamptz`,
    sql`w.bot_score < ${humanScore}`,
    sql`NOT w.is_internal`,
  ];
  if (scope.device !== "all") conditions.push(sql`w.device = ${scope.device}`);
  if (scope.route !== null) conditions.push(sql`w.route = ${scope.route}`);
  if (scope.path !== null) conditions.push(sql`w.path = ${scope.path}`);
  if (scope.country !== null) conditions.push(sql`w.country = ${scope.country}`);
  return sql.join(conditions, sql` AND `);
}

function percentileOf(percentile: number) {
  return sql`percentile_cont(${percentile / 100}::double precision) WITHIN GROUP (ORDER BY w.value)`;
}

/**
 * @name drizzleSpeed
 * @description The `SpeedStore` on the `web_vitals` table: percentiles with `percentile_cont`,
 * rating counts, a zero-filled daily series, per-route values and the selectors behind slow
 * values, all over human traffic only; and the daily `rollup_vitals` job, which also drops raw
 * rows past the retention cut-off.
 *
 * @example
 * await drizzleSpeed(db).summary(scope, 75);
 */
export function drizzleSpeed(db: Database): SpeedStore {
  return {
    summary: (scope, percentile) =>
      attempt("Could not read speed", async () => {
        const rows = await selectRows(
          db,
          sql`SELECT w.metric, count(*) AS samples, ${percentileOf(percentile)} AS value,
              count(*) FILTER (WHERE w.rating = 'good') AS good,
              count(*) FILTER (WHERE w.rating = 'needs-improvement') AS needs_improvement,
              count(*) FILTER (WHERE w.rating = 'poor') AS poor
            FROM web_vitals w WHERE ${where(scope)} GROUP BY w.metric`,
        );
        return rows.map((row) => ({
          metric: textual(row.metric) as VitalName,
          samples: numeric(row.samples),
          value: numeric(row.value),
          good: numeric(row.good),
          needsImprovement: numeric(row.needs_improvement),
          poor: numeric(row.poor),
        }));
      }),
    daily: (scope, percentile, metric) =>
      attempt("Could not read the speed timeseries", async () => {
        const rows = await selectRows(
          db,
          sql`SELECT (d.day AT TIME ZONE 'UTC') AS day, COALESCE(v.samples, 0) AS samples, v.value
            FROM generate_series(
              date_trunc('day', ${scope.from.toISOString()}::timestamptz, 'UTC') AT TIME ZONE 'UTC',
              (${scope.to.toISOString()}::timestamptz AT TIME ZONE 'UTC') - interval '1 microsecond',
              interval '1 day'
            ) AS d(day)
            LEFT JOIN (
              SELECT date_trunc('day', w.ts, 'UTC') AS day, count(*) AS samples, ${percentileOf(percentile)} AS value
              FROM web_vitals w WHERE ${where(scope)} AND w.metric = ${metric} GROUP BY 1
            ) v ON v.day = (d.day AT TIME ZONE 'UTC')
            ORDER BY 1`,
        );
        return rows.map((row) => ({
          day: new Date(textual(row.day)),
          samples: numeric(row.samples),
          value: row.value === null || row.value === undefined ? null : numeric(row.value),
        }));
      }),
    routes: (scope, percentile) =>
      attempt("Could not read the speed routes", async () => {
        const rows = await selectRows(
          db,
          sql`SELECT COALESCE(w.route, w.path) AS route, w.metric, count(*) AS samples, ${percentileOf(percentile)} AS value
            FROM web_vitals w WHERE ${where(scope)} GROUP BY 1, 2`,
        );
        return rows.map((row) => ({
          route: textual(row.route),
          metric: textual(row.metric) as VitalName,
          samples: numeric(row.samples),
          value: numeric(row.value),
        }));
      }),
    elements: (scope, percentile, metric, minSamples, page) =>
      attempt("Could not read the speed elements", async () => {
        const grouped = sql`SELECT w.selector, COALESCE(w.route, w.path) AS route, count(*) AS samples,
            ${percentileOf(percentile)} AS value
          FROM web_vitals w
          WHERE ${where(scope)} AND w.metric = ${metric} AND w.selector IS NOT NULL AND w.rating <> 'good'
          GROUP BY 1, 2 HAVING count(*) >= ${minSamples}`;
        const [counts] = await selectRows(db, sql`SELECT count(*) AS total FROM (${grouped}) g`);
        const rows = await selectRows(
          db,
          sql`SELECT * FROM (${grouped}) g ORDER BY g.samples DESC, g.value DESC, g.selector
            LIMIT ${page.limit} OFFSET ${page.offset}`,
        );
        return {
          rows: rows.map((row) => ({
            selector: textual(row.selector),
            route: textual(row.route),
            samples: numeric(row.samples),
            value: numeric(row.value),
          })),
          total: numeric(counts?.total),
        };
      }),
    rollup: (from, to, keepAfter) =>
      attempt("Could not roll up speed", async () => {
        const written = await selectRows(
          db,
          sql`INSERT INTO rollup_vitals (project_id, day, route, device, metric, samples, p50, p75, p90, p95, p99, good, needs_improvement, poor)
            SELECT w.project_id, (w.ts AT TIME ZONE 'UTC')::date, COALESCE(w.route, ''), w.device, w.metric, count(*),
              percentile_cont(0.5) WITHIN GROUP (ORDER BY w.value),
              percentile_cont(0.75) WITHIN GROUP (ORDER BY w.value),
              percentile_cont(0.9) WITHIN GROUP (ORDER BY w.value),
              percentile_cont(0.95) WITHIN GROUP (ORDER BY w.value),
              percentile_cont(0.99) WITHIN GROUP (ORDER BY w.value),
              count(*) FILTER (WHERE w.rating = 'good'),
              count(*) FILTER (WHERE w.rating = 'needs-improvement'),
              count(*) FILTER (WHERE w.rating = 'poor')
            FROM web_vitals w
            WHERE w.ts >= ${from.toISOString()}::timestamptz AND w.ts < ${to.toISOString()}::timestamptz
              AND w.bot_score < ${humanScore} AND NOT w.is_internal
            GROUP BY 1, 2, 3, 4, 5
            ON CONFLICT (project_id, day, route, device, metric) DO UPDATE SET
              samples = excluded.samples, p50 = excluded.p50, p75 = excluded.p75, p90 = excluded.p90,
              p95 = excluded.p95, p99 = excluded.p99, good = excluded.good,
              needs_improvement = excluded.needs_improvement, poor = excluded.poor
            RETURNING 1`,
        );
        const deleted = await selectRows(
          db,
          sql`DELETE FROM web_vitals WHERE ts < ${keepAfter.toISOString()}::timestamptz RETURNING 1`,
        );
        return { rowsWritten: written.length, rowsDeleted: deleted.length };
      }),
  };
}
