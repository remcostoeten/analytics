import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { botThreshold } from "@spoar/contract";

import type { RouteStat, SpeedGroup, SpeedScope, SpeedStore, VitalStat } from "../ports";
import type { VitalName } from "../speed/score";
import type { Database } from "./drizzle";
import { attempt, numeric, selectRows, textual } from "./drizzle-rows";
import type { Row } from "./drizzle-rows";

const rolledColumns: { [percentile: number]: string } = {
  50: "p50",
  75: "p75",
  90: "p90",
  95: "p95",
  99: "p99",
};

type Weighed = { samples: number; value: number | null };

type Counts = { samples: number; good: number; needsImprovement: number; poor: number };

type Gathered = { counts: Counts[]; exact?: Weighed; legacy?: Weighed; histogram?: Weighed };

const growth = sql.raw("1.02::double precision");

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
  return sql`sum(${column} * r.samples) FILTER (WHERE r.buckets IS NULL) / NULLIF(sum(r.samples) FILTER (WHERE r.buckets IS NULL AND ${column} IS NOT NULL), 0)`;
}

function legacySamples() {
  return sql`sum(r.samples) FILTER (WHERE r.buckets IS NULL)`;
}

function bucketOf(value: SQL, metric: SQL) {
  return sql`floor(ln(greatest(${value} * CASE WHEN ${metric} = 'cls' THEN 1000 ELSE 1 END, 1)) / ln(${growth}))::int`;
}

function histogramPercentile(source: SQL, keys: string, percentile: number, unscale: SQL) {
  const partition = sql.raw(keys);
  return sql`SELECT ${partition}, max(total) AS samples,
      power(${growth}, (min(bucket) + 0.5)::double precision) / ${unscale} AS value
    FROM (
      SELECT ${partition}, bucket,
        sum(n) OVER (PARTITION BY ${partition} ORDER BY bucket) AS cum,
        sum(n) OVER (PARTITION BY ${partition}) AS total
      FROM (SELECT ${partition}, bucket, sum(n) AS n FROM (${source}) s GROUP BY ${partition}, bucket) g
    ) c
    WHERE cum >= total * ${percentile / 100}::double precision
    GROUP BY ${partition}`;
}

function nullableNumber(value: unknown) {
  return value === null || value === undefined ? null : numeric(value);
}

function weighedValue(parts: (Weighed | undefined)[]) {
  const valued = parts.filter(
    (part): part is Weighed & { value: number } =>
      part !== undefined && part.value !== null && part.samples > 0,
  );
  const weight = valued.reduce((sum, part) => sum + part.samples, 0);
  return weight > 0 ? valued.reduce((sum, part) => sum + part.value * part.samples, 0) / weight : 0;
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
 * day's value read from a log-spaced histogram (2% steps) stored with the rollup and merged across
 * days, routes and devices, so ranges older than the raw retention still answer within about 1%.
 * Days rolled up before the histogram existed fall back to their stored percentile averaged
 * weighted by samples. The rollup has no path, country, selector, hour or preview rows,
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
              sql`SELECT r.metric, sum(r.samples) AS samples, ${legacySamples()} AS legacy_samples,
                  ${rolledPercentile(percentile)} AS value,
                  sum(r.good) AS good, sum(r.needs_improvement) AS needs_improvement, sum(r.poor) AS poor
                FROM rollup_vitals r WHERE ${rolled} GROUP BY r.metric`,
            )
          : [];
        const merged = rolled
          ? await selectRows(
              db,
              histogramPercentile(
                sql`SELECT w.metric, ${bucketOf(sql`w.value`, sql`w.metric`)} AS bucket, count(*) AS n
                    FROM web_vitals w WHERE ${where(scope)} GROUP BY 1, 2
                  UNION ALL
                  SELECT r.metric, e.key::int AS bucket, sum(e.value::int) AS n
                    FROM rollup_vitals r, jsonb_each_text(r.buckets) e WHERE ${rolled} GROUP BY 1, 2`,
                "metric",
                percentile,
                sql`CASE WHEN metric = 'cls' THEN 1000 ELSE 1 END`,
              ),
            )
          : [];
        const stats = new Map<VitalName, Gathered>();
        function gathered(row: Row) {
          const metric = textual(row.metric) as VitalName;
          const found = stats.get(metric) ?? { counts: [] };
          stats.set(metric, found);
          return found;
        }
        function counts(row: Row): Counts {
          return {
            samples: numeric(row.samples),
            good: numeric(row.good),
            needsImprovement: numeric(row.needs_improvement),
            poor: numeric(row.poor),
          };
        }
        for (const row of raw) {
          const found = gathered(row);
          found.counts.push(counts(row));
          found.exact = { samples: numeric(row.samples), value: nullableNumber(row.value) };
        }
        for (const row of old) {
          const found = gathered(row);
          found.counts.push(counts(row));
          found.legacy = {
            samples: numeric(row.legacy_samples),
            value: nullableNumber(row.value),
          };
        }
        for (const row of merged) {
          gathered(row).histogram = {
            samples: numeric(row.samples),
            value: nullableNumber(row.value),
          };
        }
        return [...stats.entries()].map(([metric, found]): VitalStat => {
          function sum(pick: (part: Counts) => number) {
            return found.counts.reduce((total, part) => total + pick(part), 0);
          }
          return {
            metric,
            samples: sum((part) => part.samples),
            value: weighedValue([found.histogram ?? found.exact, found.legacy]),
            good: sum((part) => part.good),
            needsImprovement: sum((part) => part.needsImprovement),
            poor: sum((part) => part.poor),
          };
        });
      }),
    series: (scope, percentile, metric, interval) =>
      attempt("Could not read the speed timeseries", async () => {
        const unit = sql.raw(`'${interval}'`);
        const rolled = interval === "day" ? rolledWhere(scope) : null;
        const old = rolled
          ? sql`UNION ALL SELECT (r.day::timestamp AT TIME ZONE 'UTC') AS bucket, sum(r.samples) AS samples,
              COALESCE(h.value, ${rolledPercentile(percentile)}) AS value
            FROM rollup_vitals r
            LEFT JOIN (${histogramPercentile(
              sql`SELECT r.day, e.key::int AS bucket, sum(e.value::int) AS n
                FROM rollup_vitals r, jsonb_each_text(r.buckets) e
                WHERE ${rolled} AND r.metric = ${metric} GROUP BY 1, 2`,
              "day",
              percentile,
              sql.raw(metric === "cls" ? "1000" : "1"),
            )}) h ON h.day = r.day
            WHERE ${rolled} AND r.metric = ${metric} GROUP BY r.day, h.value`
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
              sql`SELECT r.route, r.metric, sum(r.samples) AS samples, ${legacySamples()} AS legacy_samples,
                  ${rolledPercentile(percentile)} AS value
                FROM rollup_vitals r WHERE ${rolled} AND r.route <> '' GROUP BY 1, 2`,
            )
          : [];
        const merged = rolled
          ? await selectRows(
              db,
              histogramPercentile(
                sql`SELECT ${grouping(group)} AS route, w.metric, ${bucketOf(sql`w.value`, sql`w.metric`)} AS bucket, count(*) AS n
                    FROM web_vitals w WHERE ${where(scope)} GROUP BY 1, 2, 3
                  UNION ALL
                  SELECT r.route, r.metric, e.key::int AS bucket, sum(e.value::int) AS n
                    FROM rollup_vitals r, jsonb_each_text(r.buckets) e
                    WHERE ${rolled} AND r.route <> '' GROUP BY 1, 2, 3`,
                "route, metric",
                percentile,
                sql`CASE WHEN metric = 'cls' THEN 1000 ELSE 1 END`,
              ),
            )
          : [];
        const grouped = new Map<
          string,
          { route: string; metric: VitalName; samples: number } & Omit<Gathered, "counts">
        >();
        function entryOf(row: Row) {
          const route = textual(row.route);
          const metric = textual(row.metric) as VitalName;
          const key = JSON.stringify([route, metric]);
          const entry = grouped.get(key) ?? { route, metric, samples: 0 };
          grouped.set(key, entry);
          return entry;
        }
        for (const row of raw) {
          const entry = entryOf(row);
          entry.samples += numeric(row.samples);
          entry.exact = { samples: numeric(row.samples), value: nullableNumber(row.value) };
        }
        for (const row of old) {
          const entry = entryOf(row);
          entry.samples += numeric(row.samples);
          entry.legacy = { samples: numeric(row.legacy_samples), value: nullableNumber(row.value) };
        }
        for (const row of merged) {
          entryOf(row).histogram = {
            samples: numeric(row.samples),
            value: nullableNumber(row.value),
          };
        }
        return [...grouped.values()].map((entry): RouteStat => ({
          route: entry.route,
          metric: entry.metric,
          samples: entry.samples,
          value: weighedValue([entry.histogram ?? entry.exact, entry.legacy]),
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
          sql`WITH kept AS (
              SELECT w.project_id, (w.ts AT TIME ZONE 'UTC')::date AS day, COALESCE(w.route, '') AS route,
                w.device, w.metric, w.value, w.rating, ${bucketOf(sql`w.value`, sql`w.metric`)} AS bucket
              FROM web_vitals w
              WHERE w.ts >= ${from.toISOString()}::timestamptz AND w.ts < ${to.toISOString()}::timestamptz
                AND w.bot_score < ${botThreshold} AND NOT w.is_internal AND NOT w.is_preview
            ), histograms AS (
              SELECT project_id, day, route, device, metric, jsonb_object_agg(bucket::text, n) AS buckets
              FROM (
                SELECT project_id, day, route, device, metric, bucket, count(*) AS n
                FROM kept GROUP BY 1, 2, 3, 4, 5, 6
              ) b GROUP BY 1, 2, 3, 4, 5
            )
            INSERT INTO rollup_vitals (project_id, day, route, device, metric, samples, p50, p75, p90, p95, p99, good, needs_improvement, poor, buckets)
            SELECT k.project_id, k.day, k.route, k.device, k.metric, count(*),
              percentile_cont(0.5) WITHIN GROUP (ORDER BY k.value),
              percentile_cont(0.75) WITHIN GROUP (ORDER BY k.value),
              percentile_cont(0.9) WITHIN GROUP (ORDER BY k.value),
              percentile_cont(0.95) WITHIN GROUP (ORDER BY k.value),
              percentile_cont(0.99) WITHIN GROUP (ORDER BY k.value),
              count(*) FILTER (WHERE k.rating = 'good'),
              count(*) FILTER (WHERE k.rating = 'needs-improvement'),
              count(*) FILTER (WHERE k.rating = 'poor'),
              h.buckets
            FROM kept k
            JOIN histograms h ON h.project_id = k.project_id AND h.day = k.day AND h.route = k.route
              AND h.device = k.device AND h.metric = k.metric
            GROUP BY k.project_id, k.day, k.route, k.device, k.metric, h.buckets
            ON CONFLICT (project_id, day, route, device, metric) DO UPDATE SET
              samples = excluded.samples, p50 = excluded.p50, p75 = excluded.p75, p90 = excluded.p90,
              p95 = excluded.p95, p99 = excluded.p99, good = excluded.good,
              needs_improvement = excluded.needs_improvement, poor = excluded.poor,
              buckets = excluded.buckets
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
