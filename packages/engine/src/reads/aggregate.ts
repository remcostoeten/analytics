import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import type { BuiltInMetric, Metric } from "../ports";

function numeric(key: string) {
  return sql`CASE WHEN jsonb_typeof(meta->${key}) = 'number' THEN (meta->>${key})::numeric END`;
}

const builtIn: { [Name in BuiltInMetric]: SQL } = {
  visitors: sql`ea.visitors`,
  sessions: sql`ea.sessions`,
  pageviews: sql`ea.pageviews`,
  events: sql`ea.events`,
  bounce_rate: sql`COALESCE(sm.bounce, 0)`,
  session_duration: sql`COALESCE(sm.duration, 0)`,
  pages_per_session: sql`CASE WHEN ea.sessions > 0 THEN ea.session_pageviews::numeric / ea.sessions ELSE 0 END`,
  time_on_page: sql`COALESCE(pm.stay, 0)`,
  scroll_depth: sql`COALESCE(ea.scroll, 0)`,
  conversion_rate: sql`CASE WHEN ea.sessions > 0 THEN ea.converted::numeric / ea.sessions ELSE 0 END`,
};

function customColumn(index: number) {
  return sql.raw(`c${index}`);
}

function metricColumn(metric: Metric, index: number): SQL {
  if (metric.kind === "built-in") return builtIn[metric.name];
  return sql`COALESCE(ea.${customColumn(index)}, 0)`;
}

function customAggregates(metrics: Metric[]): SQL[] {
  return metrics.flatMap((metric, index) => {
    if (metric.kind === "built-in") return [];
    const value = numeric(metric.key);
    const aggregate = metric.kind === "sum" ? sql`sum(${value})` : sql`avg(${value})`;
    return [sql`${aggregate} AS ${customColumn(index)}`];
  });
}

/**
 * @name aggregateQuery
 * @description Metrics per group `k` over a `scoped` CTE: visitors, sessions, pageviews and events
 * from the events; bounce rate and session duration from each session's events across the
 * whole scope, so a page's bounce rate counts the sessions that viewed it; time on page from the gap to the session's next pageview; sums and averages of numeric
 * props; scroll depth as the average `scroll_depth` event, as a share of the page; conversion rate as the share of sessions the `scoped` CTE marks `converted`. Each metric comes back as column `m0`, `m1`... in the order given, with `visitors` always
 * included for shares.
 *
 * @example
 * sql`WITH scoped AS (...) ${aggregateQuery(metrics)}`;
 */
export function aggregateQuery(metrics: Metric[]): SQL {
  const custom = customAggregates(metrics);
  const columns = metrics.map(
    (metric, index) => sql`${metricColumn(metric, index)} AS ${sql.raw(`m${index}`)}`,
  );
  return sql`,
    event_agg AS (
      SELECT k, count(DISTINCT visitor_id) AS visitors, count(DISTINCT session_id) AS sessions,
        count(*) FILTER (WHERE type = 'pageview') AS pageviews,
        count(*) FILTER (WHERE type = 'pageview' AND session_id IS NOT NULL) AS session_pageviews,
        count(*) FILTER (WHERE type <> 'pageview') AS events,
        avg(CASE WHEN COALESCE(name, meta->>'eventName') = 'scroll_depth' AND jsonb_typeof(meta->'depth') = 'number'
          THEN LEAST((meta->>'depth')::numeric / 100, 1) END) AS scroll,
        count(DISTINCT session_id) FILTER (WHERE converted) AS converted
        ${custom.length > 0 ? sql`, ${sql.join(custom, sql`, `)}` : sql``}
      FROM scoped GROUP BY k
    ),
    session_totals AS (
      SELECT session_id, count(*) FILTER (WHERE type = 'pageview') AS pv,
        EXTRACT(EPOCH FROM max(ts) - min(ts)) * 1000 AS dur
      FROM scoped WHERE session_id IS NOT NULL GROUP BY session_id
    ),
    session_metrics AS (
      SELECT ks.k, avg(CASE WHEN st.pv <= 1 THEN 1 ELSE 0 END) FILTER (WHERE st.pv >= 1) AS bounce,
        avg(st.dur) AS duration
      FROM (SELECT DISTINCT k, session_id FROM scoped WHERE session_id IS NOT NULL) ks
      JOIN session_totals st ON st.session_id = ks.session_id
      GROUP BY ks.k
    ),
    page_stays AS (
      SELECT k, EXTRACT(EPOCH FROM lead(ts) OVER (PARTITION BY session_id ORDER BY ts) - ts) * 1000 AS stay
      FROM scoped WHERE type = 'pageview' AND session_id IS NOT NULL
    ),
    page_metrics AS (SELECT k, avg(stay) AS stay FROM page_stays GROUP BY k)
    SELECT ea.k, ea.visitors AS visitors_count, ${sql.join(columns, sql`, `)}
    FROM event_agg ea
    LEFT JOIN session_metrics sm ON sm.k IS NOT DISTINCT FROM ea.k
    LEFT JOIN page_metrics pm ON pm.k IS NOT DISTINCT FROM ea.k`;
}
