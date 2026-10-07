import type {
  HeatmapMetric,
  HeatmapResponse,
  LifecycleInterval,
  LifecycleResponse,
  MapLevel,
  MapResponse,
  PathDirection,
  PathsResponse,
  RetentionInterval,
  RetentionResponse,
  StickinessResponse,
} from "@spoar/contract";

import { basePath, toQuery } from "../scope";
import type { ClientResult, Page, ScopeState, Send } from "../types";

export type PathsOptions = Page & { direction?: PathDirection };

export type RetentionOptions = { interval?: RetentionInterval };

export type LifecycleOptions = { interval?: LifecycleInterval };

export type HeatmapOptions = { metric?: HeatmapMetric; timezone?: string };

export type MapOptions = Page & { level?: MapLevel };

export type ExploreReads = {
  paths: (page: string, options?: PathsOptions) => ClientResult<PathsResponse>;
  retention: (options?: RetentionOptions) => ClientResult<RetentionResponse>;
  lifecycle: (options?: LifecycleOptions) => ClientResult<LifecycleResponse>;
  stickiness: () => ClientResult<StickinessResponse>;
  heatmap: (options?: HeatmapOptions) => ClientResult<HeatmapResponse>;
  map: (options?: MapOptions) => ClientResult<MapResponse>;
};

/**
 * @name exploreReads
 * @description The behaviour terminals of a scope: `paths` from one page, `retention` cohorts,
 * `lifecycle`, `stickiness`, the weekday-by-hour `heatmap` and the `map` of places, each one GET
 * on its route under the scope's base path with the scope's query.
 *
 * @example
 * const reads = exploreReads(send, { project: "skriuw", period: "30d", filter: {} });
 * await reads.paths("/pricing", { direction: "next" });
 */
export function exploreReads(send: Send, state: ScopeState): ExploreReads {
  const base = basePath(state);
  const query = toQuery(state);

  return {
    paths: (page, options = {}) =>
      send.json<PathsResponse>({
        method: "GET",
        path: `${base}/paths`,
        query: {
          ...query,
          page,
          direction: options.direction,
          limit: options.limit,
          cursor: options.cursor,
        },
      }),
    retention: (options = {}) =>
      send.json<RetentionResponse>({
        method: "GET",
        path: `${base}/retention`,
        query: { ...query, interval: options.interval },
      }),
    lifecycle: (options = {}) =>
      send.json<LifecycleResponse>({
        method: "GET",
        path: `${base}/lifecycle`,
        query: { ...query, interval: options.interval },
      }),
    stickiness: () =>
      send.json<StickinessResponse>({ method: "GET", path: `${base}/stickiness`, query }),
    heatmap: (options = {}) =>
      send.json<HeatmapResponse>({
        method: "GET",
        path: `${base}/heatmap`,
        query: { ...query, metric: options.metric, timezone: options.timezone },
      }),
    map: (options = {}) =>
      send.json<MapResponse>({
        method: "GET",
        path: `${base}/map`,
        query: { ...query, level: options.level, limit: options.limit, cursor: options.cursor },
      }),
  };
}
