import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import type { Metric, ReadScope, ReadStore } from "../ports";
import { aggregateQuery } from "../reads/aggregate";
import { conversionScope, scopedEvents } from "../reads/scope";
import type { Database } from "./drizzle";
import { exploreReads } from "./drizzle-explore";
import { attempt, numeric, rounded, selectRows, textual } from "./drizzle-rows";
import type { Row } from "./drizzle-rows";

const headlineMetrics: Metric[] = [
  { kind: "built-in", name: "visitors" },
  { kind: "built-in", name: "sessions" },
  { kind: "built-in", name: "pageviews" },
  { kind: "built-in", name: "pages_per_session" },
  { kind: "built-in", name: "bounce_rate" },
  { kind: "built-in", name: "session_duration" },
];

const topLimit = 10;

function effective(scope: ReadScope, metrics: Metric[]) {
  const wanted = metrics.some(
    (metric) => metric.kind === "built-in" && metric.name === "conversion_rate",
  );
  const split = wanted ? conversionScope(scope) : null;
  return { scope: split?.scope ?? scope, conversion: split?.conversion ?? null };
}

const scopeTotals = [
  sql`(SELECT count(DISTINCT k) FILTER (WHERE k IS NOT NULL) FROM scoped) AS scope_total`,
  sql`(SELECT count(DISTINCT visitor_id) FROM scoped) AS scope_visitors`,
];

function withScope(
  scope: ReadScope,
  key: SQL,
  keyDimensions: Parameters<typeof scopedEvents>[2],
  metrics: Metric[],
  extra: SQL[] = [],
) {
  const read = effective(scope, metrics);
  return sql`WITH scoped AS (${scopedEvents(read.scope, key, keyDimensions, read.conversion)})${aggregateQuery(metrics, extra)}`;
}

/**
 * @name drizzleReads
 * @description The `ReadStore` on any Drizzle Postgres database: headline numbers, a zero-filled
 * timeseries in UTC buckets, a paged breakdown by any dimension, and the realtime window. Every
 * query reads `events` through the same scope, so filters and traffic mean the same everywhere.
 *
 * @example
 * const reads = drizzleReads(db);
 * const headline = await reads.headline(scope);
 */
export function drizzleReads(db: Database): ReadStore {
  return {
    headline: (scope) =>
      attempt("Could not read the stats", async () => {
        const [row] = await selectRows(db, withScope(scope, sql`1`, [], headlineMetrics));
        return {
          visitors: numeric(row?.m0),
          sessions: numeric(row?.m1),
          pageviews: numeric(row?.m2),
          pagesPerSession: rounded(numeric(row?.m3), 2),
          bounceRate: rounded(numeric(row?.m4), 3),
          sessionDurationMs: Math.round(numeric(row?.m5)),
        };
      }),
    timeseries: (scope, metric, interval) =>
      attempt("Could not read the timeseries", async () => {
        const step = sql.raw(`'1 ${interval}'::interval`);
        const unit = sql.raw(`'${interval}'`);
        const key = sql`date_trunc(${unit}, e.ts, 'UTC')`;
        const rows = await selectRows(
          db,
          sql`SELECT (b.local AT TIME ZONE 'UTC') AS bucket, COALESCE(a.m0, 0) AS value
            FROM generate_series(
              date_trunc(${unit}, ${scope.from.toISOString()}::timestamptz, 'UTC') AT TIME ZONE 'UTC',
              (${scope.to.toISOString()}::timestamptz AT TIME ZONE 'UTC') - interval '1 microsecond',
              ${step}
            ) AS b(local)
            LEFT JOIN (${withScope(scope, key, [], [metric])}) a ON a.k = (b.local AT TIME ZONE 'UTC')
            ORDER BY 1`,
        );
        return rows.map((row) => ({
          bucket: new Date(textual(row.bucket)),
          value: rounded(numeric(row.value), 3),
        }));
      }),
    breakdown: (scope, dimension, metrics, page) =>
      attempt("Could not read the breakdown", async () => {
        const key = dimension.expression({ from: scope.from });
        const order = metrics.slice(0, 2).map((_, index) => sql.raw(`a.m${index} DESC`));
        const rows = await selectRows(
          db,
          sql`SELECT * FROM (${withScope(scope, key, [dimension], metrics, scopeTotals)}) a
            WHERE a.k IS NOT NULL
            ORDER BY ${sql.join(order, sql`, `)}, a.k ASC
            LIMIT ${page.limit} OFFSET ${page.offset}`,
        );
        const [first] = rows;
        const [counts] = first
          ? [{ total: first.scope_total, visitors: first.scope_visitors }]
          : await selectRows(
              db,
              sql`WITH scoped AS (${scopedEvents(effective(scope, metrics).scope, key, [dimension])})
                SELECT count(DISTINCT k) FILTER (WHERE k IS NOT NULL) AS total, count(DISTINCT visitor_id) AS visitors FROM scoped`,
            );
        return {
          rows: rows.map((row) => ({
            value: textual(row.k),
            visitors: numeric(row.visitors_count),
            metrics: metrics.map((_, index) => numeric(row[`m${index}`])),
          })),
          total: numeric(counts?.total),
          scopeVisitors: numeric(counts?.visitors),
        };
      }),
    realtime: (projectIds, from, to) =>
      attempt("Could not read realtime", async () => {
        const scope: ReadScope = {
          projectIds,
          from,
          to,
          traffic: "human",
          environment: "production",
          filters: [],
        };
        const rows = await selectRows(
          db,
          sql`WITH scoped AS (${scopedEvents(scope, sql`1`, [])}),
            totals AS (
              SELECT 'total' AS kind, NULL::text AS value, count(DISTINCT visitor_id) AS visitors,
                count(*) FILTER (WHERE type = 'pageview') AS pageviews
              FROM scoped
            ),
            pages AS (
              SELECT 'page' AS kind, path::text AS value, count(DISTINCT visitor_id) AS visitors, 0::bigint AS pageviews
              FROM scoped WHERE path IS NOT NULL GROUP BY 2 ORDER BY 3 DESC, 2 ASC LIMIT ${topLimit}
            ),
            countries AS (
              SELECT 'country' AS kind, country::text AS value, count(DISTINCT visitor_id) AS visitors, 0::bigint AS pageviews
              FROM scoped WHERE country IS NOT NULL GROUP BY 2 ORDER BY 3 DESC, 2 ASC LIMIT ${topLimit}
            )
            SELECT * FROM (
              SELECT * FROM totals UNION ALL SELECT * FROM pages UNION ALL SELECT * FROM countries
            ) u ORDER BY kind, visitors DESC, value ASC`,
        );
        function shape(row: Row) {
          return { value: textual(row.value), visitors: numeric(row.visitors) };
        }
        const totals = rows.find((row) => row.kind === "total");
        return {
          visitors: numeric(totals?.visitors),
          pageviews: numeric(totals?.pageviews),
          pages: rows.filter((row) => row.kind === "page").map(shape),
          countries: rows.filter((row) => row.kind === "country").map(shape),
        };
      }),
    ...exploreReads(db),
  };
}
