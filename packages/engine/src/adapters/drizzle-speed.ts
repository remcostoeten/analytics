import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { botThreshold } from "@spoar/contract";

import type { RouteStat, SpeedGroup, SpeedScope, SpeedStore, VitalStat } from "../ports";
import type { VitalName } from "../speed/score";
import type { Database } from "./drizzle";
import { attempt, numeric, selectRows, textual } from "./drizzle-rows";

const rolledColumns: { [percentile: number]: string } = {
  50: "p50",
  75: "p75",
  90: "p90",
  95: "p95",
  99: "p99",
};

type Weighed = { samples: number; value: number | null };

type Counted = Weighed & { good: number; needsImprovement: number; poor: number };

function projectsIn(column: SQL, scope: SpeedScope) {
  return scope.projectIds.length > 0
    ? sql`${column} IN (${sql.join(
        scope.projectIds.map((id) => sql`${id}`),
        sql`, `,
      )})`
    : sql`false`;
}

function rawStart(scope: SpeedScope) {
  return new Date(Math.max(scope.from.getTime(), scope.rawFrom.getTime()));
}

function where(scope: SpeedScope): SQL {
  const conditions: SQL[] = [
    projectsIn(sql`w.project_id`, scope),
    sql`w.ts >= ${rawStart(scope).toISOString()}::timestamptz`,
    sql`w.ts < ${scope.to.toISOString()}::timestamptz`,
    sql`w.bot_score < ${botThreshold}`,
    sql`NOT w.is_internal`,
  ];
  if (scope.device !== "all") conditions.push(sql`w.device = ${scope.device}`);
  if (scope.environment !== "all") {
    conditions.push(scope.environment === "preview" ? sql`w.is_preview` : sql`NOT w.is_preview`);
  }
  if (scope.route !== null) conditions.push(sql`w.route = ${scope.route}`);
  if (scope.path !== null) conditions.push(sql`w.path = ${scope.path}`);
  if (scope.country !== null) conditions.push(sql`w.country = ${scope.country}`);
  return sql.join(conditions, sql` AND `);
}

function rolledWhere(scope: SpeedScope): SQL | null {
  if (scope.path !== null || scope.country !== null || scope.environment === "preview") return null;
  const end = Math.min(scope.to.getTime(), scope.rawFrom.getTime());
  if (scope.from.getTime() >= end) return null;
  const conditions: SQL[] = [
    projectsIn(sql`r.project_id`, scope),
    sql`r.day >= ${scope.from.toISOString().slice(0, 10)}::date`,
    sql`r.day <= ${new Date(end - 1).toISOString().slice(0, 10)}::date`,
  ];
  if (scope.device !== "all") conditions.push(sql`r.device = ${scope.device}`);
  if (scope.route !== null) conditions.push(sql`r.route = ${scope.route}`);
  return sql.join(conditions, sql` AND `);
}

function rolledPercentile(percentile: number) {
  const column = sql.raw(`r.${rolledColumns[percentile] ?? "p75"}`);
  return sql`sum(${column} * r.samples) / NULLIF(sum(r.samples) FILTER (WHERE ${column} IS NOT NULL), 0)`;
}

function nullableNumber(value: unknown) {
  return value === null || value === undefined ? null : numeric(value);
}

function weigh(parts: Weighed[]): Weighed {
  const valued = parts.filter((part) => part.value !== null && part.samples > 0);
  const weight = valued.reduce((sum, part) => sum + part.samples, 0);
  return {
    samples: parts.reduce((sum, part) => sum + part.samples, 0),
    value:
      weight > 0
        ? valued.reduce((sum, part) => sum + (part.value ?? 0) * part.samples, 0) / weight
        : null,
  };
}

function grouping(group: SpeedGroup) {
  return group === "path" ? sql`w.path` : sql`COALESCE(w.route, w.path)`;
}

function percentileOf(percentile: number) {
  return sql`percentile_cont(${percentile / 100}::double precision) WITHIN GROUP (ORDER BY w.value)`;
}

/**
 * @name drizzleSpeed
 * @description The `SpeedStore` on the `web_vitals` table: percentiles with `percentile_cont`,
 * rating counts, a zero-filled hourly or daily series, values per route or per path and the
 * selectors behind slow values, all over human traffic only and split by production and preview;
 * and the daily `rollup_vitals` job, which rolls up production rows only and drops raw rows past
 * the retention cut-off. Days before the scope's `rawFrom` come from `rollup_vitals`, with each
 * day's percentile averaged over its routes and devices weighted by samples, so ranges older than
 * the raw retention still answer. The rollup has no path, country, selector, hour or preview rows,
 * so a `path` or `country` filter, the preview environment, the hourly series, grouping by path
 * and the elements read cover raw days only, and the routes read leaves out rolled-up rows
 * without a route.
 *
 * @example
 * await drizzleSpeed(db).summary(scope, 75);
 */
export function drizzleSpeed(db: Database): SpeedStore {
  return {
    summary: (scope, percentile) =>
      attempt("Could not read speed", async () => {
        const raw = await selectRows(
          db,
          sql`SELECT w.metric, count(*) AS samples, ${percentileOf(percentile)} AS value,
              count(*) FILTER (WHERE w.rating = 'good') AS good,
              count(*) FILTER (WHERE w.rating = 'needs-improvement') AS needs_improvement,
              count(*) FILTER (WHERE w.rating = 'poor') AS poor
            FROM web_vitals w WHERE ${where(scope)} GROUP BY w.metric`,
        );
        const rolled = rolledWhere(scope);
        const old = rolled
          ? await selectRows(
              db,
              sql`SELECT r.metric, sum(r.samples) AS samples, ${rolledPercentile(percentile)} AS value,
                  sum(r.good) AS good, sum(r.needs_improvement) AS needs_improvement, sum(r.poor) AS poor
                FROM rollup_vitals r WHERE ${rolled} GROUP BY r.metric`,
            )
          : [];
        const stats = new Map<VitalName, Counted[]>();
        for (const row of [...raw, ...old]) {
          const metric = textual(row.metric) as VitalName;
          stats.set(metric, [
            ...(stats.get(metric) ?? []),
            {
              samples: numeric(row.samples),
              value: nullableNumber(row.value),
              good: numeric(row.good),
              needsImprovement: numeric(row.needs_improvement),
              poor: numeric(row.poor),
            },
          ]);
        }
        return [...stats.entries()].map(([metric, parts]): VitalStat => {
          const weighed = weigh(parts);
          return {
            metric,
            samples: weighed.samples,
            value: weighed.value ?? 0,
            good: parts.reduce((sum, part) => sum + part.good, 0),
            needsImprovement: parts.reduce((sum, part) => sum + part.needsImprovement, 0),
            poor: parts.reduce((sum, part) => sum + part.poor, 0),
          };
        });
      }),
    series: (scope, percentile, metric, interval) =>
      attempt("Could not read the speed timeseries", async () => {
        const unit = sql.raw(`'${interval}'`);
        const rolled = interval === "day" ? rolledWhere(scope) : null;
        const old = rolled
          ? sql`UNION ALL SELECT (r.day::timestamp AT TIME ZONE 'UTC') AS bucket, sum(r.samples) AS samples,
              ${rolledPercentile(percentile)} AS value
            FROM rollup_vitals r WHERE ${rolled} AND r.metric = ${metric} GROUP BY r.day`
          : sql``;
        const rows = await selectRows(
          db,
          sql`SELECT (d.bucket AT TIME ZONE 'UTC') AS bucket, COALESCE(v.samples, 0) AS samples, v.value
            FROM generate_series(
              date_trunc(${unit}, ${scope.from.toISOString()}::timestamptz, 'UTC') AT TIME ZONE 'UTC',
              (${scope.to.toISOString()}::timestamptz AT TIME ZONE 'UTC') - interval '1 microsecond',
              ${sql.raw(`interval '1 ${interval}'`)}
            ) AS d(bucket)
            LEFT JOIN (
              SELECT date_trunc(${unit}, w.ts, 'UTC') AS bucket, count(*) AS samples, ${percentileOf(percentile)} AS value
              FROM web_vitals w WHERE ${where(scope)} AND w.metric = ${metric} GROUP BY 1
              ${old}
            ) v ON v.bucket = (d.bucket AT TIME ZONE 'UTC')
            ORDER BY 1`,
        );
        return rows.map((row) => ({
          bucket: new Date(textual(row.bucket)),
          samples: numeric(row.samples),
          value: row.value === null || row.value === undefined ? null : numeric(row.value),
        }));
      }),
    routes: (scope, percentile, group) =>
      attempt("Could not read the speed routes", async () => {
        const raw = await selectRows(
          db,
          sql`SELECT ${grouping(group)} AS route, w.metric, count(*) AS samples, ${percentileOf(percentile)} AS value
            FROM web_vitals w WHERE ${where(scope)} GROUP BY 1, 2`,
        );
        const rolled = group === "route" ? rolledWhere(scope) : null;
        const old = rolled
          ? await selectRows(
              db,
              sql`SELECT r.route, r.metric, sum(r.samples) AS samples, ${rolledPercentile(percentile)} AS value
                FROM rollup_vitals r WHERE ${rolled} AND r.route <> '' GROUP BY 1, 2`,
            )
          : [];
        const grouped = new Map<string, { route: string; metric: VitalName; parts: Weighed[] }>();
        for (const row of [...raw, ...old]) {
          const route = textual(row.route);
          const metric = textual(row.metric) as VitalName;
          const key = JSON.stringify([route, metric]);
          const entry = grouped.get(key) ?? { route, metric, parts: [] };
          entry.parts.push({ samples: numeric(row.samples), value: nullableNumber(row.value) });
          grouped.set(key, entry);
        }
        return [...grouped.values()].map((entry): RouteStat => {
          const weighed = weigh(entry.parts);
          return {
            route: entry.route,
            metric: entry.metric,
            samples: weighed.samples,
            value: weighed.value ?? 0,
          };
        });
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
              AND w.bot_score < ${botThreshold} AND NOT w.is_internal AND NOT w.is_preview
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
