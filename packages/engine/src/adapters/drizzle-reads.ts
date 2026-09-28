import { ok } from "@remcostoeten/analytics-shared/result";
import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import type { Metric, ReadScope, ReadStore } from "../ports";
import { aggregateQuery } from "../reads/aggregate";
import { scopedEvents } from "../reads/scope";
import type { Database } from "./drizzle";
import { unavailable } from "./drizzle";

type Row = { [column: string]: unknown };

const headlineMetrics: Metric[] = [
  { kind: "built-in", name: "visitors" },
  { kind: "built-in", name: "sessions" },
  { kind: "built-in", name: "pageviews" },
  { kind: "built-in", name: "pages_per_session" },
  { kind: "built-in", name: "bounce_rate" },
  { kind: "built-in", name: "session_duration" },
];

const topLimit = 10;

async function select(db: Database, query: SQL): Promise<Row[]> {
  const result: unknown = await db.execute(query);
  if (Array.isArray(result)) return result;
  if (
    typeof result === "object" &&
    result !== null &&
    "rows" in result &&
    Array.isArray(result.rows)
  ) {
    return result.rows;
  }
  return [];
}

function number(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

async function attempt<Value>(message: string, run: () => Promise<Value>) {
  try {
    return ok(await run());
  } catch (error) {
    return unavailable(message, error);
  }
}

function withScope(
  scope: ReadScope,
  key: SQL,
  keyDimensions: Parameters<typeof scopedEvents>[2],
  metrics: Metric[],
) {
  return sql`WITH scoped AS (${scopedEvents(scope, key, keyDimensions)})${aggregateQuery(metrics)}`;
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
        const [row] = await select(db, withScope(scope, sql`1`, [], headlineMetrics));
        return {
          visitors: number(row?.m0),
          sessions: number(row?.m1),
          pageviews: number(row?.m2),
          pagesPerSession: round(number(row?.m3), 2),
          bounceRate: round(number(row?.m4), 3),
          sessionDurationMs: Math.round(number(row?.m5)),
        };
      }),
    timeseries: (scope, metric, interval) =>
      attempt("Could not read the timeseries", async () => {
        const step = sql.raw(`'1 ${interval}'::interval`);
        const unit = sql.raw(`'${interval}'`);
        const key = sql`date_trunc(${unit}, e.ts, 'UTC')`;
        const rows = await select(
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
          bucket: new Date(text(row.bucket)),
          value: round(number(row.value), 3),
        }));
      }),
    breakdown: (scope, dimension, metrics, page) =>
      attempt("Could not read the breakdown", async () => {
        const key = dimension.expression({ from: scope.from });
        const [counts] = await select(
          db,
          sql`WITH scoped AS (${scopedEvents(scope, key, [dimension])})
            SELECT count(DISTINCT k) FILTER (WHERE k IS NOT NULL) AS total, count(DISTINCT visitor_id) AS visitors FROM scoped`,
        );
        const order = metrics.slice(0, 2).map((_, index) => sql.raw(`a.m${index} DESC`));
        const rows = await select(
          db,
          sql`SELECT * FROM (${withScope(scope, key, [dimension], metrics)}) a
            WHERE a.k IS NOT NULL
            ORDER BY ${sql.join(order, sql`, `)}, a.k ASC
            LIMIT ${page.limit} OFFSET ${page.offset}`,
        );
        return {
          rows: rows.map((row) => ({
            value: text(row.k),
            visitors: number(row.visitors_count),
            metrics: metrics.map((_, index) => number(row[`m${index}`])),
          })),
          total: number(counts?.total),
          scopeVisitors: number(counts?.visitors),
        };
      }),
    realtime: (projectIds, from, to) =>
      attempt("Could not read realtime", async () => {
        const scope: ReadScope = { projectIds, from, to, traffic: "human", filters: [] };
        const scoped = sql`WITH scoped AS (${scopedEvents(scope, sql`1`, [])})`;
        const [totals] = await select(
          db,
          sql`${scoped} SELECT count(DISTINCT visitor_id) AS visitors, count(*) FILTER (WHERE type = 'pageview') AS pageviews FROM scoped`,
        );
        function top(column: SQL) {
          return select(
            db,
            sql`${scoped} SELECT ${column} AS value, count(DISTINCT visitor_id) AS visitors FROM scoped
              WHERE ${column} IS NOT NULL GROUP BY 1 ORDER BY 2 DESC, 1 ASC LIMIT ${topLimit}`,
          );
        }
        const [pages, countries] = await Promise.all([top(sql`path`), top(sql`country`)]);
        function shape(row: Row) {
          return { value: text(row.value), visitors: number(row.visitors) };
        }
        return {
          visitors: number(totals?.visitors),
          pageviews: number(totals?.pageviews),
          pages: pages.map(shape),
          countries: countries.map(shape),
        };
      }),
  };
}
