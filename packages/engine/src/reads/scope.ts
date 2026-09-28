import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import type { Dimension, DimensionJoin } from "../define";
import type { ReadFilter, ReadScope, Traffic } from "../ports";

const humanScore = 50;

/**
 * @name trafficCondition
 * @description The one definition of each traffic filter: `human` is a bot score under 50 and not
 * internal, localhost or preview traffic; `bots` is 50 or more; `internal` is the owner's own.
 *
 * @example
 * trafficCondition("human");
 */
function trafficCondition(traffic: Traffic): SQL {
  if (traffic === "bots") return sql`e.bot_score >= ${humanScore}`;
  if (traffic === "internal") return sql`COALESCE(e.is_internal, false)`;
  if (traffic === "all") return sql`true`;
  return sql`e.bot_score < ${humanScore} AND NOT COALESCE(e.is_internal, false) AND NOT COALESCE(e.is_localhost, false) AND NOT COALESCE(e.is_preview, false)`;
}

function filterCondition(filter: ReadFilter, scope: ReadScope): SQL {
  const at = { from: scope.from };
  const matches = filter.dimension.matches
    ? filter.dimension.matches(filter.value, at)
    : sql`(${filter.dimension.expression(at)}) = ${filter.value}`;
  return filter.exclude ? sql`NOT COALESCE(${matches}, false)` : sql`COALESCE(${matches}, false)`;
}

function joins(needed: Set<DimensionJoin>): SQL {
  const parts: SQL[] = [];
  if (needed.has("session")) {
    parts.push(
      sql`LEFT JOIN sessions s ON s.project_id = e.project_id AND s.session_id = e.session_id`,
    );
  }
  if (needed.has("visitor")) {
    parts.push(
      sql`LEFT JOIN visitors v ON v.project_id = e.project_id AND v.fingerprint = e.visitor_id`,
    );
  }
  return sql.join(parts, sql` `);
}

/**
 * @name scopeParts
 * @description The joins and `WHERE` condition for the events one read covers: the projects, the
 * half-open range `[from, to)`, the traffic filter and every dimension filter. Sessions and
 * visitors are joined only when a dimension needs them.
 *
 * @example
 * const { joins, where } = scopeParts(scope, []);
 */
export function scopeParts(
  scope: ReadScope,
  keyDimensions: Dimension[],
): { joins: SQL; where: SQL } {
  const needed = new Set<DimensionJoin>();
  for (const dimension of [...keyDimensions, ...scope.filters.map((filter) => filter.dimension)]) {
    if (dimension.join) needed.add(dimension.join);
  }
  const projects =
    scope.projectIds.length > 0
      ? sql`e.project_id IN (${sql.join(
          scope.projectIds.map((id) => sql`${id}`),
          sql`, `,
        )})`
      : sql`false`;
  const conditions = [
    projects,
    sql`e.ts >= ${scope.from.toISOString()}::timestamptz`,
    sql`e.ts < ${scope.to.toISOString()}::timestamptz`,
    trafficCondition(scope.traffic),
    ...scope.filters.map((filter) => filterCondition(filter, scope)),
  ];
  return { joins: joins(needed), where: sql.join(conditions, sql` AND `) };
}

/**
 * @name scopedEvents
 * @description The events one read covers, as a `SELECT` for a `scoped` CTE, with each row's
 * group `key` and, given a `conversion` condition, whether the row's session converted.
 *
 * @example
 * sql`WITH scoped AS (${scopedEvents(scope, sql`1`, [])}) SELECT count(*) FROM scoped`;
 */
export function scopedEvents(
  scope: ReadScope,
  key: SQL,
  keyDimensions: Dimension[],
  conversion: SQL | null = null,
): SQL {
  const { joins: joined, where } = scopeParts(scope, keyDimensions);
  const converted = conversion
    ? sql`COALESCE(bool_or(${conversion}) OVER (PARTITION BY e.project_id, e.session_id), false)`
    : sql`false`;
  return sql`SELECT ${key} AS k, e.id, e.project_id, e.visitor_id, e.session_id, e.type, e.name, e.ts, e.meta, e.path, e.country, ${converted} AS converted FROM events e ${joined} WHERE ${where}`;
}

/**
 * @name conversionScope
 * @description For reads with `conversion_rate`: the `filter[event]` filters stop narrowing the
 * events and define the conversion instead, so the other metrics cover every event in scope and a
 * session counts as converted when any of its events matches. Null when there is no event filter.
 *
 * @example
 * const split = conversionScope(scope); // { scope: without filter[event], conversion: SQL }
 */
export function conversionScope(scope: ReadScope): { scope: ReadScope; conversion: SQL } | null {
  const events = scope.filters.filter(
    (filter) => filter.dimension.name === "event" && !filter.exclude,
  );
  if (events.length === 0) return null;
  return {
    scope: { ...scope, filters: scope.filters.filter((filter) => !events.includes(filter)) },
    conversion: sql.join(
      events.map((filter) => filterCondition(filter, scope)),
      sql` AND `,
    ),
  };
}
