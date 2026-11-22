import type {
  HeatmapResponse,
  LifecycleResponse,
  MapResponse,
  PathsResponse,
  RetentionResponse,
  StickinessResponse,
} from "@spoar/contract";
import { engineError } from "@spoar/engine";
import type {
  ActiveDays,
  ActivePeriodDays,
  EngineError,
  HeatMetric,
  LifecycleInterval,
  MapLevel,
  PathDirection,
  ReadStore,
  StickinessInterval,
} from "@spoar/engine";
import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";

import { nextCursor, readPage } from "./params";
import type { Scoped } from "./service";

type Reply<Value> = Promise<Result<Value, EngineError>>;

const directions = new Set<string>(["next", "previous"]);
const retentionIntervals = new Set<string>(["week", "month"]);
const lifecycleIntervals = new Set<string>(["day", "week", "month"]);
const heatMetrics = new Set<string>(["visitors", "pageviews"]);
const mapLevels = new Set<string>(["country", "region", "city"]);
const dayMs = 86_400_000;

function invalid(message: string) {
  return err(engineError("VALIDATION_FAILED", message));
}

function share(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 1000) / 1000 : 0;
}

function shared(scoped: Scoped) {
  return {
    range: { from: scoped.range.from.toISOString(), to: scoped.range.to.toISOString() },
    traffic: scoped.scope.traffic,
    environment: scoped.scope.environment,
    filters: scoped.echo,
  };
}

function knownTimezone(name: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: name }).format(0);
    return true;
  } catch {
    return false;
  }
}

/**
 * @name paths
 * @description The pages visitors viewed right after `page` in the same session, or right before
 * it with `direction=previous`, each with its share of the views of `page`. `dropOff` counts the
 * views that ended the session (or, for `previous`, that started it).
 *
 * @example
 * await paths(store, scoped, params);
 */
export async function paths(
  store: ReadStore,
  scoped: Scoped,
  params: URLSearchParams,
): Reply<PathsResponse> {
  const target = params.get("page");
  if (!target) return invalid("page is required");
  const direction = params.get("direction") ?? "next";
  if (!directions.has(direction)) return invalid(`Unknown direction ${direction}`);
  const page = readPage(params);
  if (!page.ok) return page;
  const found = await store.paths(scoped.scope, target, direction as PathDirection);
  if (!found.ok) return found;
  const { views, dropOff, steps } = found.value;
  const rows = steps.slice(page.value.offset, page.value.offset + page.value.limit);
  return ok({
    data: rows.map((step) => ({ ...step, share: share(step.count, views) })),
    page: target,
    direction: direction as PathDirection,
    views,
    dropOff: { count: dropOff, share: share(dropOff, views) },
    total: steps.length,
    nextCursor: nextCursor(page.value.offset, rows.length, steps.length),
    ...shared(scoped),
  });
}

/**
 * @name retention
 * @description Cohorts of visitors by the week or month of their first visit in the range, with
 * how many came back in each later period up to the end of the range. Period 0 is the cohort
 * itself, so its share is always 1.
 *
 * @example
 * await retention(store, scoped, params);
 */
export async function retention(
  store: ReadStore,
  scoped: Scoped,
  params: URLSearchParams,
): Reply<RetentionResponse> {
  const interval = params.get("interval") ?? "week";
  if (!retentionIntervals.has(interval)) return invalid(`Unknown interval ${interval}`);
  const found = await store.retention(scoped.scope, interval as "week" | "month");
  if (!found.ok) return found;
  return ok({
    data: found.value.map((cohort) => {
      const size = cohort.periods.find((period) => period.offset === 0)?.visitors ?? 0;
      const counts = new Map(cohort.periods.map((period) => [period.offset, period.visitors]));
      return {
        cohort: cohort.cohort.toISOString(),
        visitors: size,
        periods: Array.from({ length: cohort.lastOffset + 1 }, (_, offset) => {
          const visitors = counts.get(offset) ?? 0;
          return { offset, visitors, share: share(visitors, size) };
        }),
      };
    }),
    interval: interval as "week" | "month",
    ...shared(scoped),
  });
}

/**
 * @name lifecycle
 * @description Visitors per `day`, `week` (default, Monday start, UTC) or `month` of the range,
 * split by how they relate to the period before: `new` (first seen ever in this period),
 * `returning` (active in the period before too), `resurrected` (seen before, but not in the
 * period before) and `dormant` (active in the period before, not in this one).
 *
 * @example
 * await lifecycle(store, scoped, params);
 */
export async function lifecycle(
  store: ReadStore,
  scoped: Scoped,
  params: URLSearchParams,
): Reply<LifecycleResponse> {
  const interval = params.get("interval") ?? "week";
  if (!lifecycleIntervals.has(interval)) return invalid(`Unknown interval ${interval}`);
  const found = await store.lifecycle(scoped.scope, interval as LifecycleInterval);
  if (!found.ok) return found;
  return ok({
    data: found.value.map((row) => ({ ...row, period: row.period.toISOString() })),
    interval: interval as LifecycleInterval,
    ...shared(scoped),
  });
}

function histogram(rows: ActiveDays[], length: number) {
  const counts = new Map(rows.map((row) => [row.days, row.visitors]));
  const visitors = rows.reduce((sum, row) => sum + row.visitors, 0);
  const activeDays = rows.reduce((sum, row) => sum + row.days * row.visitors, 0);
  return {
    data: Array.from({ length }, (_, index) => {
      const count = counts.get(index + 1) ?? 0;
      return { days: index + 1, visitors: count, share: share(count, visitors) };
    }),
    visitors,
    averageDays: visitors > 0 ? Math.round((activeDays / visitors) * 100) / 100 : 0,
  };
}

function mostDays(rows: ActiveDays[]) {
  return rows.reduce((most, row) => Math.max(most, row.days), 0);
}

function nextPeriod(start: number, interval: StickinessInterval) {
  if (interval === "week") return start + 7 * dayMs;
  const date = new Date(start);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}

function daysInRange(start: number, end: number, scoped: Scoped) {
  const first = Math.max(start, scoped.range.from.getTime());
  const last = Math.min(end, scoped.range.to.getTime()) - 1;
  return Math.floor(last / dayMs) - Math.floor(first / dayMs) + 1;
}

function stickinessPeriods(rows: ActivePeriodDays[], interval: StickinessInterval, scoped: Scoped) {
  const byPeriod = new Map<number, ActivePeriodDays[]>();
  for (const row of rows) {
    const start = row.period.getTime();
    byPeriod.set(start, [...(byPeriod.get(start) ?? []), row]);
  }
  if (byPeriod.size === 0) return [];
  const periods = [];
  const to = scoped.range.to.getTime();
  for (let start = Math.min(...byPeriod.keys()); start < to; start = nextPeriod(start, interval)) {
    const length = daysInRange(start, nextPeriod(start, interval), scoped);
    periods.push({
      period: new Date(start).toISOString(),
      ...histogram(byPeriod.get(start) ?? [], length),
    });
  }
  return periods;
}

/**
 * @name stickiness
 * @description How many visitors were active on 1, 2, 3 and more distinct UTC days in the range,
 * with each count's share of all visitors and the average number of active days. Counts run
 * from 1 to the most days any visitor was active, zero-filled. `interval=week` or `month` adds
 * `periods`: the same histogram per calendar period, from the first period with a visitor to the
 * end of the range, each running to the number of days of that period inside the range.
 *
 * @example
 * await stickiness(store, scoped, new URLSearchParams("interval=week"));
 */
export async function stickiness(
  store: ReadStore,
  scoped: Scoped,
  params: URLSearchParams,
): Reply<StickinessResponse> {
  const interval = params.get("interval");
  if (interval === null) {
    const found = await store.stickiness(scoped.scope);
    if (!found.ok) return found;
    return ok({ ...histogram(found.value, mostDays(found.value)), ...shared(scoped) });
  }
  if (!retentionIntervals.has(interval)) return invalid(`Unknown interval ${interval}`);
  const unit = interval as StickinessInterval;
  const found = await store.stickinessPeriods(scoped.scope, unit);
  if (!found.ok) return found;
  return ok({
    ...histogram(found.value.overall, mostDays(found.value.overall)),
    interval: unit,
    periods: stickinessPeriods(found.value.periods, unit, scoped),
    ...shared(scoped),
  });
}

/**
 * @name heatmap
 * @description Visitors or pageviews for each weekday (1 is Monday) and hour of the day, all 168
 * cells, in `timezone` (an IANA name, default UTC).
 *
 * @example
 * await heatmap(store, scoped, params);
 */
export async function heatmap(
  store: ReadStore,
  scoped: Scoped,
  params: URLSearchParams,
): Reply<HeatmapResponse> {
  const metric = params.get("metric") ?? "visitors";
  if (!heatMetrics.has(metric)) return invalid(`Unknown metric ${metric}`);
  const timezone = params.get("timezone") ?? "UTC";
  if (!knownTimezone(timezone)) return invalid(`Unknown timezone ${timezone}`);
  const found = await store.heatmap(scoped.scope, metric as HeatMetric, timezone);
  if (!found.ok) return found;
  const cells = new Map(found.value.map((cell) => [`${cell.weekday}:${cell.hour}`, cell.value]));
  return ok({
    data: Array.from({ length: 7 * 24 }, (_, index) => {
      const weekday = Math.floor(index / 24) + 1;
      const hour = index % 24;
      return { weekday, hour, value: cells.get(`${weekday}:${hour}`) ?? 0 };
    }),
    metric: metric as HeatMetric,
    timezone,
    ...shared(scoped),
  });
}

/**
 * @name places
 * @description Visitors per country, region or city (`level`, default country), with the
 * average coordinates of their lookups rounded to two decimals, and each place's share of the
 * range's visitors, paged with a cursor.
 *
 * @example
 * await places(store, scoped, params);
 */
export async function places(
  store: ReadStore,
  scoped: Scoped,
  params: URLSearchParams,
): Reply<MapResponse> {
  const level = params.get("level") ?? "country";
  if (!mapLevels.has(level)) return invalid(`Unknown level ${level}`);
  const page = readPage(params);
  if (!page.ok) return page;
  const found = await store.places(scoped.scope, level as MapLevel, page.value);
  if (!found.ok) return found;
  const { rows, total, scopeVisitors } = found.value;
  return ok({
    data: rows.map((place) => ({ ...place, share: share(place.visitors, scopeVisitors) })),
    level: level as MapLevel,
    total,
    nextCursor: nextCursor(page.value.offset, rows.length, total),
    ...shared(scoped),
  });
}
