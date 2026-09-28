import type {
  BreakdownResponse,
  RealtimeResponse,
  StatsResponse,
  TimeseriesResponse,
} from "@remcostoeten/analytics-contract";
import { engineError, findDimension } from "@remcostoeten/analytics-engine";
import type { EngineError, Metric, ReadScope, ReadStore } from "@remcostoeten/analytics-engine";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";

import {
  nextCursor,
  previousRange,
  readFilters,
  readInterval,
  readMetric,
  readMetrics,
  readPage,
  readRange,
  readTraffic,
} from "./params";
import type { Range } from "./params";

type Scoped = {
  scope: ReadScope;
  range: Range;
  echo: { [name: string]: string };
};

const realtimeMs = 5 * 60 * 1000;
const responseKeys: { [name: string]: string } = {
  bounce_rate: "bounceRate",
  session_duration: "sessionDurationMs",
  pages_per_session: "pagesPerSession",
  time_on_page: "avgTimeMs",
  scroll_depth: "scrollDepth",
};
const defaultMetrics: { [dimension: string]: string[] } = {
  page: ["visitors", "pageviews", "bounce_rate", "time_on_page"],
};

function iso(range: Range) {
  return { from: range.from.toISOString(), to: range.to.toISOString() };
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function compared(value: number, previous: number) {
  return {
    value,
    previous,
    change: previous === 0 ? null : round((value - previous) / previous, 3),
  };
}

function metricKey(metric: Metric) {
  return metric.kind === "built-in" ? (responseKeys[metric.name] ?? metric.name) : metric.name;
}

function metricValue(metric: Metric, value: number) {
  if (metric.kind !== "built-in") return round(value, 2);
  if (metric.name === "bounce_rate") return round(value, 3);
  if (metric.name === "pages_per_session") return round(value, 2);
  if (metric.name === "scroll_depth") return round(value, 3);
  return Math.round(value);
}

/**
 * @name readScope
 * @description Reads the shared query parameters (range, traffic, filters) into the scope every
 * read uses, or a `VALIDATION_FAILED` error naming the bad parameter.
 *
 * @example
 * readScope(new URL(request.url).searchParams, ["remcostoeten.nl"], new Date());
 */
export function readScope(
  params: URLSearchParams,
  projectIds: string[],
  now: Date,
): Result<Scoped, EngineError> {
  const range = readRange(params, now);
  if (!range.ok) return range;
  const traffic = readTraffic(params);
  if (!traffic.ok) return traffic;
  const filters = readFilters(params);
  if (!filters.ok) return filters;
  return ok({
    scope: { projectIds, ...range.value, traffic: traffic.value, filters: filters.value.filters },
    range: range.value,
    echo: filters.value.echo,
  });
}

/**
 * @name stats
 * @description Headline numbers for the range, each with the previous range of the same length
 * and the relative change, null when the previous value is zero.
 *
 * @example
 * await stats(store, scoped);
 */
export async function stats(
  store: ReadStore,
  scoped: Scoped,
): Promise<Result<StatsResponse, EngineError>> {
  const before = previousRange(scoped.range);
  const [current, previous] = await Promise.all([
    store.headline(scoped.scope),
    store.headline({ ...scoped.scope, ...before }),
  ]);
  if (!current.ok) return current;
  if (!previous.ok) return previous;
  const now = current.value;
  const then = previous.value;
  return ok({
    data: {
      visitors: compared(now.visitors, then.visitors),
      sessions: compared(now.sessions, then.sessions),
      pageviews: compared(now.pageviews, then.pageviews),
      pagesPerSession: compared(now.pagesPerSession, then.pagesPerSession),
      bounceRate: compared(now.bounceRate, then.bounceRate),
      sessionDurationMs: compared(now.sessionDurationMs, then.sessionDurationMs),
    },
    range: iso(scoped.range),
    previousRange: iso(before),
    traffic: scoped.scope.traffic,
    filters: scoped.echo,
  });
}

/**
 * @name timeseries
 * @description One metric per hour, day, week or month across the range, with empty buckets as
 * zero, and with `compare=previous` the previous range's value in each bucket.
 *
 * @example
 * await timeseries(store, scoped, params);
 */
export async function timeseries(
  store: ReadStore,
  scoped: Scoped,
  params: URLSearchParams,
): Promise<Result<TimeseriesResponse, EngineError>> {
  const name = params.get("metric");
  if (!name) return err(engineError("VALIDATION_FAILED", "metric is required"));
  const metric = readMetric(name);
  if (!metric.ok) return metric;
  const interval = readInterval(params, scoped.range);
  if (!interval.ok) return interval;
  const current = await store.timeseries(scoped.scope, metric.value, interval.value);
  if (!current.ok) return current;
  const shared = {
    metric: name,
    interval: interval.value,
    range: iso(scoped.range),
    traffic: scoped.scope.traffic,
    filters: scoped.echo,
  };
  const points = current.value.map((point) => ({
    bucket: point.bucket.toISOString(),
    value: point.value,
  }));
  if (params.get("compare") !== "previous") return ok({ data: points, ...shared });
  const before = previousRange(scoped.range);
  const previous = await store.timeseries(
    { ...scoped.scope, ...before },
    metric.value,
    interval.value,
  );
  if (!previous.ok) return previous;
  return ok({
    data: points.map((point, index) => ({ ...point, previous: previous.value[index]?.value ?? 0 })),
    previousRange: iso(before),
    ...shared,
  });
}

/**
 * @name breakdown
 * @description The top values of one dimension with the requested metrics (default visitors and
 * pageviews, plus bounce rate and time on page for `page`) and each value's share of the range's
 * visitors, paged with a cursor.
 *
 * @example
 * await breakdown(store, scoped, "page", params);
 */
export async function breakdown(
  store: ReadStore,
  scoped: Scoped,
  name: string,
  params: URLSearchParams,
): Promise<Result<BreakdownResponse, EngineError>> {
  const dimension = findDimension(name);
  if (!dimension) return err(engineError("NOT_FOUND", `Unknown dimension ${name}`));
  const metrics = readMetrics(
    params.get("metrics"),
    defaultMetrics[name] ?? ["visitors", "pageviews"],
  );
  if (!metrics.ok) return metrics;
  const page = readPage(params);
  if (!page.ok) return page;
  const found = await store.breakdown(scoped.scope, dimension, metrics.value, page.value);
  if (!found.ok) return found;
  const { rows, total, scopeVisitors } = found.value;
  return ok({
    data: rows.map((row) => ({
      value: row.value,
      ...Object.fromEntries(
        metrics.value.map((metric, index) => [
          metricKey(metric),
          metricValue(metric, row.metrics[index] ?? 0),
        ]),
      ),
      share: scopeVisitors > 0 ? round(row.visitors / scopeVisitors, 3) : 0,
    })),
    dimension: name,
    total,
    nextCursor: nextCursor(page.value.offset, rows.length, total),
    range: iso(scoped.range),
    traffic: scoped.scope.traffic,
    filters: scoped.echo,
  });
}

/**
 * @name realtime
 * @description Human visitors and pageviews in the last five minutes, with the top pages and
 * countries.
 *
 * @example
 * await realtime(store, ["remcostoeten.nl"], new Date());
 */
export async function realtime(
  store: ReadStore,
  projectIds: string[],
  now: Date,
): Promise<Result<RealtimeResponse, EngineError>> {
  const from = new Date(now.getTime() - realtimeMs);
  const found = await store.realtime(projectIds, from, now);
  if (!found.ok) return found;
  return ok({
    data: {
      visitors: found.value.visitors,
      pageviewsPerMinute: round(found.value.pageviews / 5, 1),
      pages: found.value.pages,
      countries: found.value.countries,
    },
    window: { from: from.toISOString(), to: now.toISOString() },
  });
}

/**
 * @name breakdownCsv
 * @description A breakdown as CSV with a header row, quoting values that need it.
 *
 * @example
 * breakdownCsv(response);
 */
export function breakdownCsv(response: BreakdownResponse): string {
  const columns = [...new Set(response.data.flatMap((row) => Object.keys(row)))];
  const header = columns.length > 0 ? columns : ["value"];
  function cell(value: string | number | undefined) {
    const text = value === undefined ? "" : String(value);
    // Quotes, commas and newlines need the field wrapped in quotes.
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }
  const lines = response.data.map((row) =>
    header
      .map((column) => cell(Object.entries(row).find(([key]) => key === column)?.[1]))
      .join(","),
  );
  return `${[header.join(","), ...lines].join("\n")}\n`;
}
