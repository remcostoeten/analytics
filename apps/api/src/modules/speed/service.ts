import type {
  SpeedElementList,
  SpeedResponse,
  SpeedRouteList,
  SpeedTimeseries,
} from "@remcostoeten/analytics-contract";
import {
  engineError,
  experienceScore,
  metricScore,
  rawVitalsFrom,
  scoreRating,
  vitalRating,
} from "@remcostoeten/analytics-engine";
import type {
  EngineError,
  SpeedDevice,
  SpeedEnvironment,
  SpeedGroup,
  SpeedInterval,
  SpeedScope,
  SpeedStore,
  VitalName,
  VitalStat,
} from "@remcostoeten/analytics-engine";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";

import { nextCursor, readPage, readRange } from "../reads/params";
import type { Range } from "../reads/params";

export type SpeedScoped = { scope: SpeedScope; range: Range; percentile: Percentile };

type Percentile = 50 | 75 | 90 | 95 | 99;

type Reply<Value> = Promise<Result<Value, EngineError>>;

const names: VitalName[] = ["lcp", "inp", "cls", "fcp", "ttfb"];
const devices = new Set<string>(["mobile", "desktop", "all"]);
const environments = new Set<string>(["production", "preview", "all"]);
const intervals = new Set<string>(["hour", "day"]);
const groups = new Set<string>(["route", "path"]);
const maxHourlyMs = 7 * 24 * 60 * 60 * 1000;
const defaultShare = 0.005;
const percentiles = new Set<number>([50, 75, 90, 95, 99]);
const filterNames: { [name: string]: "route" | "path" | "country" } = {
  "filter[route]": "route",
  "filter[page]": "path",
  "filter[country]": "country",
};

export const minSamples = 20;

function invalid<Value>(message: string): Result<Value, EngineError> {
  return err(engineError("VALIDATION_FAILED", message));
}

function round(value: number, metric: VitalName) {
  return metric === "cls" ? Math.round(value * 1000) / 1000 : Math.round(value);
}

function share(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) / 100 : 0;
}

function iso(range: Range) {
  return { from: range.from.toISOString(), to: range.to.toISOString() };
}

function isVital(name: string): name is VitalName {
  return (names as string[]).includes(name);
}

/**
 * @name readSpeedScope
 * @description The speed parameters: the date range, `device` (`mobile`, which includes tablets,
 * `desktop` or `all`, the default), `environment` (`production`, the default, `preview` or
 * `all`), `percentile` (50, 75, 90, 95 or 99, default 75) and the `filter[route]`,
 * `filter[page]` and `filter[country]` filters; other filters answer 400.
 *
 * @example
 * readSpeedScope(params, ["remcostoeten.nl"], new Date());
 */
export function readSpeedScope(
  params: URLSearchParams,
  projectIds: string[],
  now: Date,
): Result<SpeedScoped, EngineError> {
  const range = readRange(params, now);
  if (!range.ok) return range;
  const device = params.get("device") ?? "all";
  if (!devices.has(device)) return invalid(`Unknown device ${device}`);
  const environment = params.get("environment") ?? "production";
  if (!environments.has(environment))
    return invalid("environment must be production, preview or all");
  const percentile = Number(params.get("percentile") ?? 75);
  if (!percentiles.has(percentile)) return invalid("percentile must be 50, 75, 90, 95 or 99");
  const filters: { route: string | null; path: string | null; country: string | null } = {
    route: null,
    path: null,
    country: null,
  };
  for (const [key, value] of params) {
    if (!key.startsWith("filter[")) continue;
    const field = filterNames[key];
    if (!field) return invalid(`${key} is not available for speed`);
    filters[field] = value;
  }
  return ok({
    scope: {
      projectIds,
      ...range.value,
      device: device as SpeedDevice,
      environment: environment as SpeedEnvironment,
      ...filters,
      rawFrom: rawVitalsFrom(now),
    },
    range: range.value,
    percentile: percentile as Percentile,
  });
}

function summarize(stat: VitalStat | undefined, metric: VitalName) {
  const samples = stat?.samples ?? 0;
  const enough = stat !== undefined && samples >= minSamples;
  const value = enough ? round(stat.value, metric) : null;
  return {
    value,
    rating: value === null ? null : vitalRating(metric, value),
    score: value === null ? null : metricScore(metric, value),
    samples,
    shares: {
      good: share(stat?.good ?? 0, samples),
      needsImprovement: share(stat?.needsImprovement ?? 0, samples),
      poor: share(stat?.poor ?? 0, samples),
    },
  };
}

/**
 * @name speedSummary
 * @description The Real Experience Score and, per metric, the chosen percentile, its rating and
 * score, and the good, needs-improvement and poor shares. Metrics under 20 samples show no value
 * and are left out of the score.
 *
 * @example
 * await speedSummary(store, scoped);
 */
export async function speedSummary(store: SpeedStore, scoped: SpeedScoped): Reply<SpeedResponse> {
  const found = await store.summary(scoped.scope, scoped.percentile);
  if (!found.ok) return found;
  const stats = new Map(found.value.map((stat) => [stat.metric, stat]));
  const metrics = {
    lcp: summarize(stats.get("lcp"), "lcp"),
    inp: summarize(stats.get("inp"), "inp"),
    cls: summarize(stats.get("cls"), "cls"),
    fcp: summarize(stats.get("fcp"), "fcp"),
    ttfb: summarize(stats.get("ttfb"), "ttfb"),
  };
  const score = experienceScore({
    lcp: metrics.lcp.score,
    inp: metrics.inp.score,
    cls: metrics.cls.score,
    fcp: metrics.fcp.score,
  });
  return ok({
    data: {
      score,
      rating: score === null ? null : scoreRating(score),
      samples: Math.max(0, ...found.value.map((stat) => stat.samples)),
      metrics,
    },
    percentile: scoped.percentile,
    device: scoped.scope.device,
    environment: scoped.scope.environment,
    range: iso(scoped.range),
    traffic: "human",
  });
}

/**
 * @name speedTimeseries
 * @description One metric's percentile per UTC hour or day (`interval`, default `day`), null in
 * buckets under 20 samples. Hourly series cover at most 7 days and only the raw retention window.
 *
 * @example
 * await speedTimeseries(store, scoped, params);
 */
export async function speedTimeseries(
  store: SpeedStore,
  scoped: SpeedScoped,
  params: URLSearchParams,
): Reply<SpeedTimeseries> {
  const metric = params.get("metric");
  if (!metric || !isVital(metric)) return invalid("metric must be lcp, inp, cls, fcp or ttfb");
  const interval = params.get("interval") ?? "day";
  if (!intervals.has(interval)) return invalid("interval must be hour or day");
  const span = scoped.range.to.getTime() - scoped.range.from.getTime();
  if (interval === "hour" && span > maxHourlyMs) {
    return invalid("interval=hour covers at most 7 days");
  }
  const found = await store.series(
    scoped.scope,
    scoped.percentile,
    metric,
    interval as SpeedInterval,
  );
  if (!found.ok) return found;
  return ok({
    data: found.value.map((point) => ({
      bucket: point.bucket.toISOString(),
      value:
        point.value !== null && point.samples >= minSamples ? round(point.value, metric) : null,
      samples: point.samples,
    })),
    metric,
    percentile: scoped.percentile,
    device: scoped.scope.device,
    environment: scoped.scope.environment,
    interval: interval as SpeedInterval,
    range: iso(scoped.range),
  });
}

/**
 * @name speedRoutes
 * @description Every route, or every path with `group=path`, with its score and metric values,
 * worst score first, entries without a score last; values under 20 samples are null. Entries
 * with under `minShare` of the samples (default 0.005, so 0.5%) are left out; `minShare=0`
 * keeps them all.
 *
 * @example
 * await speedRoutes(store, scoped, params);
 */
export async function speedRoutes(
  store: SpeedStore,
  scoped: SpeedScoped,
  params: URLSearchParams,
): Reply<SpeedRouteList> {
  const page = readPage(params);
  if (!page.ok) return page;
  const group = params.get("group") ?? "route";
  if (!groups.has(group)) return invalid("group must be route or path");
  const minShare = Number(params.get("minShare") ?? defaultShare);
  if (!Number.isFinite(minShare) || minShare < 0 || minShare > 1) {
    return invalid("minShare must be a number from 0 to 1");
  }
  const found = await store.routes(scoped.scope, scoped.percentile, group as SpeedGroup);
  if (!found.ok) return found;
  const byRoute = new Map<string, Map<VitalName, { samples: number; value: number }>>();
  for (const stat of found.value) {
    const metrics = byRoute.get(stat.route) ?? new Map();
    metrics.set(stat.metric, { samples: stat.samples, value: stat.value });
    byRoute.set(stat.route, metrics);
  }
  const rows = [...byRoute.entries()].map(([route, metrics]) => {
    function value(metric: VitalName) {
      const stat = metrics.get(metric);
      return stat && stat.samples >= minSamples ? round(stat.value, metric) : null;
    }
    function scored(metric: VitalName) {
      const shown = value(metric);
      return shown === null ? null : metricScore(metric, shown);
    }
    return {
      route,
      score: experienceScore({
        lcp: scored("lcp"),
        inp: scored("inp"),
        cls: scored("cls"),
        fcp: scored("fcp"),
      }),
      samples: Math.max(0, ...[...metrics.values()].map((stat) => stat.samples)),
      lcp: value("lcp"),
      inp: value("inp"),
      cls: value("cls"),
      fcp: value("fcp"),
      ttfb: value("ttfb"),
    };
  });
  const total = rows.reduce((sum, row) => sum + row.samples, 0);
  const shown = rows.filter((row) => total === 0 || row.samples / total >= minShare);
  shown.sort(
    (left, right) =>
      (left.score ?? 101) - (right.score ?? 101) ||
      right.samples - left.samples ||
      left.route.localeCompare(right.route),
  );
  const slice = shown.slice(page.value.offset, page.value.offset + page.value.limit);
  return ok({ data: slice, nextCursor: nextCursor(page.value.offset, slice.length, shown.length) });
}

/**
 * @name speedElements
 * @description The selectors most often behind needs-improvement and poor values of one metric,
 * with the route and the chosen percentile of those values, each with at least 20 samples.
 *
 * @example
 * await speedElements(store, scoped, params);
 */
export async function speedElements(
  store: SpeedStore,
  scoped: SpeedScoped,
  params: URLSearchParams,
): Reply<SpeedElementList> {
  const metric = params.get("metric");
  if (!metric || !isVital(metric)) return invalid("metric must be lcp, inp, cls, fcp or ttfb");
  const page = readPage(params);
  if (!page.ok) return page;
  const found = await store.elements(
    scoped.scope,
    scoped.percentile,
    metric,
    minSamples,
    page.value,
  );
  if (!found.ok) return found;
  return ok({
    data: found.value.rows.map((row) => ({ ...row, value: round(row.value, metric) })),
    metric,
    nextCursor: nextCursor(page.value.offset, found.value.rows.length, found.value.total),
  });
}
