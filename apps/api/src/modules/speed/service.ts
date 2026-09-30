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
  scoreRating,
  vitalRating,
} from "@remcostoeten/analytics-engine";
import type {
  EngineError,
  SpeedDevice,
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
 * `desktop` or `all`, the default), `percentile` (50, 75, 90, 95 or 99, default 75) and the
 * `filter[route]`, `filter[page]` and `filter[country]` filters; other filters answer 400.
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
    scope: { projectIds, ...range.value, device: device as SpeedDevice, ...filters },
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
    range: iso(scoped.range),
    traffic: "human",
  });
}

/**
 * @name speedTimeseries
 * @description One metric's percentile per UTC day, null on days under 20 samples.
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
  const found = await store.daily(scoped.scope, scoped.percentile, metric);
  if (!found.ok) return found;
  return ok({
    data: found.value.map((day) => ({
      bucket: day.day.toISOString(),
      value: day.value !== null && day.samples >= minSamples ? round(day.value, metric) : null,
      samples: day.samples,
    })),
    metric,
    percentile: scoped.percentile,
    device: scoped.scope.device,
    range: iso(scoped.range),
  });
}

/**
 * @name speedRoutes
 * @description Every route with its score and metric values, worst score first, routes without
 * a score last; values under 20 samples are null.
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
  const found = await store.routes(scoped.scope, scoped.percentile);
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
  rows.sort(
    (left, right) =>
      (left.score ?? 101) - (right.score ?? 101) ||
      right.samples - left.samples ||
      left.route.localeCompare(right.route),
  );
  const slice = rows.slice(page.value.offset, page.value.offset + page.value.limit);
  return ok({ data: slice, nextCursor: nextCursor(page.value.offset, slice.length, rows.length) });
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
