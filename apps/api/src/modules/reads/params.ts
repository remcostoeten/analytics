import { engineError, findDimension } from "@remcostoeten/analytics-engine";
import type {
  BuiltInMetric,
  EngineError,
  Interval,
  Metric,
  ReadFilter,
  Traffic,
} from "@remcostoeten/analytics-engine";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";

import { exportPageSize } from "./export";

export type Range = { from: Date; to: Date };

const hourMs = 60 * 60 * 1000;
const dayMs = 24 * hourMs;
const periods = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 } as const;
const traffics = new Set<string>(["human", "bots", "internal", "all"]);
const intervals = new Set<string>(["hour", "day", "week", "month"]);
const builtIns: { [name: string]: BuiltInMetric } = {
  visitors: "visitors",
  sessions: "sessions",
  pageviews: "pageviews",
  events: "events",
  bounce_rate: "bounce_rate",
  session_duration: "session_duration",
  pages_per_session: "pages_per_session",
  time_on_page: "time_on_page",
  scroll_depth: "scroll_depth",
  conversion_rate: "conversion_rate",
};
// A filter parameter such as filter[country] or filter[prop:plan].
const filterParameter = /^filter\[([^\]]+)\]$/;
// A custom metric such as sum:prop.revenue or avg:prop.duration.
const customMetric = /^(sum|avg):prop\.([\w.-]{1,64})$/;
const earliest = new Date("2020-01-01T00:00:00.000Z");
const maxLimit = 100;
const defaultLimit = 20;
const exportFormats = new Set<string>(["csv", "json", "sql"]);

function invalid<Value>(message: string): Result<Value, EngineError> {
  return err(engineError("VALIDATION_FAILED", message));
}

function startOfDay(at: Date) {
  return new Date(Math.floor(at.getTime() / dayMs) * dayMs);
}

/**
 * @name readRange
 * @description The range a read covers: `from` and `to` when both are given, otherwise the
 * `period` (default `30d`) ending at the start of today in UTC, or at the start of this hour for
 * `24h`. `all` starts at 2020-01-01.
 *
 * @example
 * readRange(url.searchParams, new Date()); // the last 30 whole days
 */
export function readRange(params: URLSearchParams, now: Date): Result<Range, EngineError> {
  const from = params.get("from");
  const to = params.get("to");
  if (from || to) {
    if (!from || !to) return invalid("Send both from and to, or neither");
    const range = { from: new Date(from), to: new Date(to) };
    if (Number.isNaN(range.from.getTime()) || Number.isNaN(range.to.getTime())) {
      return invalid("from and to must be ISO 8601 timestamps");
    }
    return range.from < range.to ? ok(range) : invalid("from must be before to");
  }
  const period = params.get("period") ?? "30d";
  if (period === "24h") {
    const end = new Date(Math.floor(now.getTime() / hourMs) * hourMs);
    return ok({ from: new Date(end.getTime() - dayMs), to: end });
  }
  const end = startOfDay(now);
  if (period === "all") return ok({ from: earliest, to: end });
  if (period === "12mo") {
    const start = new Date(end);
    start.setUTCFullYear(start.getUTCFullYear() - 1);
    return ok({ from: start, to: end });
  }
  const days = periods[period as keyof typeof periods];
  if (!days) return invalid(`Unknown period ${period}`);
  return ok({ from: new Date(end.getTime() - days * dayMs), to: end });
}

/**
 * @name previousRange
 * @description The range of the same length just before this one, for comparisons.
 *
 * @example
 * previousRange({ from, to });
 */
export function previousRange(range: Range): Range {
  const length = range.to.getTime() - range.from.getTime();
  return { from: new Date(range.from.getTime() - length), to: range.from };
}

/**
 * @name readTraffic
 * @description The `traffic` parameter, `human` by default.
 *
 * @example
 * readTraffic(params); // ok("human")
 */
export function readTraffic(params: URLSearchParams): Result<Traffic, EngineError> {
  const traffic = params.get("traffic") ?? "human";
  return traffics.has(traffic) ? ok(traffic as Traffic) : invalid(`Unknown traffic ${traffic}`);
}

/**
 * @name readFilters
 * @description Every `filter[<dimension>]=value` parameter, with `!value` meaning exclude. An
 * unknown dimension is `VALIDATION_FAILED`. Also returns the filters as sent, for the response.
 *
 * @example
 * readFilters(new URLSearchParams("filter[country]=NL&filter[page]=!/admin"));
 */
export function readFilters(
  params: URLSearchParams,
): Result<{ filters: ReadFilter[]; echo: { [name: string]: string } }, EngineError> {
  const filters: ReadFilter[] = [];
  const echo: { [name: string]: string } = {};
  for (const [name, raw] of params) {
    const match = filterParameter.exec(name);
    if (!match?.[1]) continue;
    const dimension = findDimension(match[1]);
    if (!dimension) return invalid(`Unknown filter dimension ${match[1]}`);
    const exclude = raw.startsWith("!");
    filters.push({ dimension, value: exclude ? raw.slice(1) : raw, exclude });
    echo[match[1]] = raw;
  }
  return ok({ filters, echo });
}

/**
 * @name readMetric
 * @description One metric name: a built-in such as `visitors` or `bounce_rate`, or
 * `sum:prop.<key>` and `avg:prop.<key>` for numeric props.
 *
 * @example
 * readMetric("sum:prop.revenue");
 */
export function readMetric(name: string): Result<Metric, EngineError> {
  const builtIn = builtIns[name];
  if (builtIn) return ok({ kind: "built-in", name: builtIn });
  const custom = customMetric.exec(name);
  if (custom?.[1] && custom[2]) {
    return ok({ kind: custom[1] === "sum" ? "sum" : "avg", name, key: custom[2] });
  }
  return invalid(`Unknown metric ${name}`);
}

/**
 * @name readMetrics
 * @description A comma-separated `metrics` list, or the given defaults.
 *
 * @example
 * readMetrics("visitors,sum:prop.revenue", ["visitors"]);
 */
export function readMetrics(
  list: string | null,
  defaults: string[],
): Result<Metric[], EngineError> {
  const metrics: Metric[] = [];
  for (const name of list ? list.split(",") : defaults) {
    const metric = readMetric(name.trim());
    if (!metric.ok) return metric;
    metrics.push(metric.value);
  }
  return metrics.length > 0 ? ok(metrics) : invalid("metrics is empty");
}

/**
 * @name readInterval
 * @description The timeseries `interval`: `hour` for a 24-hour range by default, `day` otherwise.
 *
 * @example
 * readInterval(params, range);
 */
export function readInterval(params: URLSearchParams, range: Range): Result<Interval, EngineError> {
  const interval =
    params.get("interval") ?? (range.to.getTime() - range.from.getTime() <= dayMs ? "hour" : "day");
  return intervals.has(interval)
    ? ok(interval as Interval)
    : invalid(`Unknown interval ${interval}`);
}

/**
 * @name limitCap
 * @description The largest `limit` a list accepts: 100 for a page, and the export page size when
 * the request is a `format=csv|json|sql` download.
 *
 * @example
 * limitCap(new URLSearchParams("format=csv")); // 1000
 */
export function limitCap(params: URLSearchParams): number {
  return exportFormats.has(params.get("format") ?? "") ? exportPageSize : maxLimit;
}

/**
 * @name readPage
 * @description `limit` (1 to 100, default 20) and the offset in an opaque `cursor`.
 *
 * @example
 * readPage(params); // ok({ limit: 20, offset: 0 })
 */
export function readPage(
  params: URLSearchParams,
): Result<{ limit: number; offset: number }, EngineError> {
  const limit = Number(params.get("limit") ?? defaultLimit);
  const cap = limitCap(params);
  if (!Number.isInteger(limit) || limit < 1 || limit > cap) {
    return invalid(`limit must be a whole number from 1 to ${cap}`);
  }
  const cursor = params.get("cursor");
  if (!cursor) return ok({ limit, offset: 0 });
  try {
    const decoded: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    const offset =
      typeof decoded === "object" && decoded !== null && "o" in decoded ? decoded.o : null;
    if (typeof offset === "number" && Number.isInteger(offset) && offset >= 0)
      return ok({ limit, offset });
  } catch {
    return invalid("cursor is not valid");
  }
  return invalid("cursor is not valid");
}

/**
 * @name nextCursor
 * @description The cursor for the page after this one, or null on the last page.
 *
 * @example
 * nextCursor(0, 3, 64); // "eyJvIjozfQ"
 */
export function nextCursor(offset: number, count: number, total: number): string | null {
  const next = offset + count;
  return next < total ? Buffer.from(JSON.stringify({ o: next })).toString("base64url") : null;
}
