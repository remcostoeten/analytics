import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import type { MapLevel, ReadStore } from "../ports";
import { scopedEvents, scopeParts } from "../reads/scope";
import type { Database } from "./drizzle";
import { attempt, numeric, rounded, selectRows, textual } from "./drizzle-rows";
import type { Row } from "./drizzle-rows";

const placeColumns: { [level in MapLevel]: string[] } = {
  country: ["country"],
  region: ["country", "region"],
  city: ["country", "region", "city"],
};

function nullableText(value: unknown) {
  return value === null || value === undefined ? null : textual(value);
}

function coordinate(value: unknown) {
  return value === null || value === undefined ? null : rounded(numeric(value), 2);
}

function periodOffset(interval: "week" | "month", later: SQL, earlier: SQL) {
  return interval === "week"
    ? sql`((${later})::date - (${earlier})::date) / 7`
    : sql`((extract(year FROM ${later}) - extract(year FROM ${earlier})) * 12 + extract(month FROM ${later}) - extract(month FROM ${earlier}))::int`;
}

/**
 * @name exploreReads
 * @description The exploration reads of the `ReadStore`: page paths, retention cohorts, the
 * weekday and hour heatmap, and visitors per place for a map. Each reads `events` through the same
 * scope as every other read.
 *
 * @example
 * const reads = { ...exploreReads(db) };
 */
export function exploreReads(
  db: Database,
): Pick<ReadStore, "paths" | "retention" | "heatmap" | "places"> {
  return {
    paths: (scope, page, direction) =>
      attempt("Could not read the paths", async () => {
        const neighbour = direction === "next" ? sql`lead(path)` : sql`lag(path)`;
        const rows = await selectRows(
          db,
          sql`WITH scoped AS (${scopedEvents(scope, sql`1`, [])}),
            views AS (
              SELECT path, ${neighbour} OVER (PARTITION BY project_id, session_id ORDER BY ts, id) AS other
              FROM scoped WHERE type = 'pageview' AND session_id IS NOT NULL
            )
            SELECT other, count(*) AS n FROM views WHERE path = ${page}
            GROUP BY 1 ORDER BY 2 DESC, 1 ASC`,
        );
        const steps = rows
          .filter((row) => row.other !== null && row.other !== undefined)
          .map((row) => ({ path: textual(row.other), count: numeric(row.n) }));
        const dropOff = numeric(rows.find((row) => row.other === null)?.n);
        const views = steps.reduce((sum, step) => sum + step.count, dropOff);
        return { views, dropOff, steps };
      }),
    retention: (scope, interval) =>
      attempt("Could not read retention", async () => {
        const unit = sql.raw(`'${interval}'`);
        const last = sql`date_trunc(${unit}, (${scope.to.toISOString()}::timestamptz AT TIME ZONE 'UTC') - interval '1 microsecond')`;
        const rows = await selectRows(
          db,
          sql`WITH scoped AS (${scopedEvents(scope, sql`1`, [])}),
            firsts AS (
              SELECT project_id, visitor_id, date_trunc(${unit}, min(ts) AT TIME ZONE 'UTC') AS cohort
              FROM scoped WHERE visitor_id IS NOT NULL GROUP BY 1, 2
            ),
            active AS (
              SELECT DISTINCT project_id, visitor_id, date_trunc(${unit}, ts AT TIME ZONE 'UTC') AS period
              FROM scoped WHERE visitor_id IS NOT NULL
            )
            SELECT (f.cohort AT TIME ZONE 'UTC') AS cohort,
              ${periodOffset(interval, sql`a.period`, sql`f.cohort`)} AS n,
              ${periodOffset(interval, last, sql`f.cohort`)} AS last,
              count(*) AS visitors
            FROM firsts f JOIN active a ON a.project_id = f.project_id AND a.visitor_id = f.visitor_id
            GROUP BY f.cohort, 2, 3 ORDER BY f.cohort, 2`,
        );
        const cohorts = new Map<
          string,
          { cohort: Date; lastOffset: number; periods: { offset: number; visitors: number }[] }
        >();
        for (const row of rows) {
          const key = textual(row.cohort);
          const cohort = cohorts.get(key) ?? {
            cohort: new Date(key),
            lastOffset: numeric(row.last),
            periods: [],
          };
          cohort.periods.push({ offset: numeric(row.n), visitors: numeric(row.visitors) });
          cohorts.set(key, cohort);
        }
        return [...cohorts.values()];
      }),
    heatmap: (scope, metric, timezone) =>
      attempt("Could not read the heatmap", async () => {
        const value =
          metric === "visitors"
            ? sql`count(DISTINCT visitor_id)`
            : sql`count(*) FILTER (WHERE type = 'pageview')`;
        const rows = await selectRows(
          db,
          sql`WITH scoped AS (${scopedEvents(scope, sql`1`, [])})
            SELECT extract(isodow FROM ts AT TIME ZONE ${timezone})::int AS weekday,
              extract(hour FROM ts AT TIME ZONE ${timezone})::int AS hour,
              ${value} AS value
            FROM scoped GROUP BY 1, 2`,
        );
        return rows.map((row) => ({
          weekday: numeric(row.weekday),
          hour: numeric(row.hour),
          value: numeric(row.value),
        }));
      }),
    places: (scope, level, page) =>
      attempt("Could not read the map", async () => {
        const { joins, where } = scopeParts(scope, []);
        const columns = placeColumns[level];
        const keys = sql.raw(columns.map((column) => `e.${column}`).join(", "));
        const grouped = sql`SELECT ${keys}, count(DISTINCT e.visitor_id) AS visitors,
            avg(e.latitude) AS latitude, avg(e.longitude) AS longitude
          FROM events e ${joins} WHERE ${where} AND e.country IS NOT NULL GROUP BY ${keys}`;
        const [counts] = await selectRows(
          db,
          sql`SELECT (SELECT count(*) FROM (${grouped}) g) AS total,
            (SELECT count(DISTINCT e.visitor_id) FROM events e ${joins} WHERE ${where}) AS visitors`,
        );
        const order = sql.raw(columns.map((column) => `g.${column} ASC NULLS LAST`).join(", "));
        const rows = await selectRows(
          db,
          sql`SELECT * FROM (${grouped}) g ORDER BY g.visitors DESC, ${order}
            LIMIT ${page.limit} OFFSET ${page.offset}`,
        );
        return {
          rows: rows.map((row: Row) => ({
            country: textual(row.country),
            region: nullableText(row.region),
            city: nullableText(row.city),
            latitude: coordinate(row.latitude),
            longitude: coordinate(row.longitude),
            visitors: numeric(row.visitors),
          })),
          total: numeric(counts?.total),
          scopeVisitors: numeric(counts?.visitors),
        };
      }),
  };
}
