import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import type { LifecycleInterval, MapLevel, ReadStore } from "../ports";
import { scopedEvents, scopeParts } from "../reads/scope";
import { countedVisitor } from "../reads/server-visitor";
import type { Database } from "./drizzle";
import { attempt, numeric, rounded, selectRows, textual } from "./drizzle-rows";
import type { Row } from "./drizzle-rows";

type PlaceLevel = { columns: string[]; id: SQL; join: SQL };

const placeLevels: { [level in MapLevel]: PlaceLevel } = {
  country: {
    columns: ["country"],
    id: sql`NULL::integer`,
    join: sql`p.kind = 'country' AND p.country = g.country`,
  },
  region: {
    columns: ["country", "region"],
    id: sql`max(e.region_id)`,
    join: sql`p.id = g.place_id`,
  },
  city: {
    columns: ["country", "region", "city"],
    id: sql`max(e.city_id)`,
    join: sql`p.id = g.place_id`,
  },
};

function nullableText(value: unknown) {
  return value === null || value === undefined ? null : textual(value);
}

function nullableNumber(value: unknown) {
  return value === null || value === undefined ? null : numeric(value);
}

function coordinate(value: unknown) {
  return value === null || value === undefined ? null : rounded(numeric(value), 2);
}

const dayMs = 86_400_000;

function previousPeriodStart(date: Date, interval: LifecycleInterval) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  if (interval === "month") return new Date(Date.UTC(year, month - 1, 1));
  const day = Date.UTC(year, month, date.getUTCDate());
  if (interval === "day") return new Date(day - dayMs);
  const monday = day - ((date.getUTCDay() + 6) % 7) * dayMs;
  return new Date(monday - 7 * dayMs);
}

function periodOffset(interval: "week" | "month", later: SQL, earlier: SQL) {
  return interval === "week"
    ? sql`((${later})::date - (${earlier})::date) / 7`
    : sql`((extract(year FROM ${later}) - extract(year FROM ${earlier})) * 12 + extract(month FROM ${later}) - extract(month FROM ${earlier}))::int`;
}

/**
 * @name exploreReads
 * @description The exploration reads of the `ReadStore`: page paths, retention cohorts, the
 * lifecycle of visitors per period, how many days visitors were active, the weekday and hour
 * heatmap, and visitors per place for a map, named in the requested locale from `geo_places`.
 * Each reads `events` through the same scope as every other read.
 *
 * @example
 * const reads = { ...exploreReads(db) };
 */
export function exploreReads(
  db: Database,
): Pick<ReadStore, "paths" | "retention" | "lifecycle" | "stickiness" | "heatmap" | "places"> {
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
    lifecycle: (scope, interval) =>
      attempt("Could not read the lifecycle", async () => {
        const unit = sql.raw(`'${interval}'`);
        const step = sql.raw(`interval '1 ${interval}'`);
        const earlier = { ...scope, from: previousPeriodStart(scope.from, interval) };
        const rows = await selectRows(
          db,
          sql`WITH scoped AS (${scopedEvents(earlier, sql`1`, [])}),
            active AS (
              SELECT DISTINCT project_id, visitor_id, date_trunc(${unit}, ts AT TIME ZONE 'UTC') AS period
              FROM scoped WHERE visitor_id IS NOT NULL
            ),
            firsts AS (
              SELECT a.project_id, a.visitor_id, date_trunc(${unit}, (
                SELECT min(e.ts) FROM events e
                WHERE e.project_id = a.project_id AND e.visitor_id = a.visitor_id
              ) AT TIME ZONE 'UTC') AS first
              FROM (SELECT DISTINCT project_id, visitor_id FROM active) a
            ),
            marks AS (
              SELECT project_id, visitor_id, period, true AS now, false AS before FROM active
              UNION ALL
              SELECT project_id, visitor_id, period + ${step}, false, true FROM active
            ),
            states AS (
              SELECT project_id, visitor_id, period, bool_or(now) AS now, bool_or(before) AS before
              FROM marks GROUP BY 1, 2, 3
            ),
            periods AS (
              SELECT generate_series(
                date_trunc(${unit}, ${scope.from.toISOString()}::timestamptz AT TIME ZONE 'UTC'),
                date_trunc(${unit}, (${scope.to.toISOString()}::timestamptz AT TIME ZONE 'UTC') - interval '1 microsecond'),
                ${step}
              ) AS period
            )
            SELECT (p.period AT TIME ZONE 'UTC') AS period,
              count(*) FILTER (WHERE s.now AND f.first = s.period) AS new,
              count(*) FILTER (WHERE s.now AND s.before AND f.first < s.period) AS returning,
              count(*) FILTER (WHERE s.now AND NOT s.before AND f.first < s.period) AS resurrected,
              count(*) FILTER (WHERE NOT s.now AND s.before) AS dormant
            FROM periods p
            LEFT JOIN states s ON s.period = p.period
            LEFT JOIN firsts f ON f.project_id = s.project_id AND f.visitor_id = s.visitor_id
            GROUP BY p.period ORDER BY p.period`,
        );
        return rows.map((row) => ({
          period: new Date(textual(row.period)),
          new: numeric(row.new),
          returning: numeric(row.returning),
          resurrected: numeric(row.resurrected),
          dormant: numeric(row.dormant),
        }));
      }),
    stickiness: (scope) =>
      attempt("Could not read the stickiness", async () => {
        const rows = await selectRows(
          db,
          sql`WITH scoped AS (${scopedEvents(scope, sql`1`, [])}),
            days AS (
              SELECT project_id, visitor_id, count(DISTINCT (ts AT TIME ZONE 'UTC')::date) AS days
              FROM scoped WHERE visitor_id IS NOT NULL GROUP BY 1, 2
            )
            SELECT days, count(*) AS visitors FROM days GROUP BY 1 ORDER BY 1`,
        );
        return rows.map((row) => ({ days: numeric(row.days), visitors: numeric(row.visitors) }));
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
    places: (scope, level, locale, page) =>
      attempt("Could not read the map", async () => {
        const { joins, where } = scopeParts(scope, []);
        const { columns, id, join } = placeLevels[level];
        const keys = sql.raw(columns.map((column) => `e.${column}`).join(", "));
        const stored = sql.raw(`g.${columns.at(-1) ?? "country"}`);
        const grouped = sql`SELECT ${keys}, count(DISTINCT ${countedVisitor}) AS visitors,
            avg(e.latitude) AS latitude, avg(e.longitude) AS longitude,
            round(avg(e.accuracy_km)) AS accuracy_km, ${id} AS place_id
          FROM events e ${joins} WHERE ${where} AND e.country IS NOT NULL GROUP BY ${keys}`;
        const [counts] = await selectRows(
          db,
          sql`SELECT (SELECT count(*) FROM (${grouped}) g) AS total,
            (SELECT count(DISTINCT ${countedVisitor}) FROM events e ${joins} WHERE ${where}) AS visitors`,
        );
        const order = sql.raw(columns.map((column) => `g.${column} ASC NULLS LAST`).join(", "));
        const rows = await selectRows(
          db,
          sql`SELECT g.*, coalesce(p.names->>${locale}, p.names->>'en', ${stored}) AS name
            FROM (${grouped}) g LEFT JOIN geo_places p ON ${join}
            ORDER BY g.visitors DESC, ${order}
            LIMIT ${page.limit} OFFSET ${page.offset}`,
        );
        return {
          rows: rows.map((row: Row) => ({
            country: textual(row.country),
            region: nullableText(row.region),
            city: nullableText(row.city),
            id: nullableNumber(row.place_id),
            name: nullableText(row.name),
            latitude: coordinate(row.latitude),
            longitude: coordinate(row.longitude),
            accuracyKm: nullableNumber(row.accuracy_km),
            visitors: numeric(row.visitors),
          })),
          total: numeric(counts?.total),
          scopeVisitors: numeric(counts?.visitors),
        };
      }),
  };
}
