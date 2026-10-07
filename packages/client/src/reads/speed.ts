import type {
  SpeedElementList,
  SpeedQuery,
  SpeedResponse,
  SpeedRouteList,
  SpeedTimeseries,
} from "@spoar/contract";

import { basePath, toQuery } from "../scope";
import type { ClientResult, Page, ScopeState, Send } from "../types";

export type SpeedOptions = SpeedQuery;

export type SpeedListOptions = SpeedQuery & Page;

export type SpeedReads = {
  speed: (options?: SpeedOptions) => ClientResult<SpeedResponse>;
  speedTimeseries: (options?: SpeedOptions) => ClientResult<SpeedTimeseries>;
  speedRoutes: (options?: SpeedListOptions) => ClientResult<SpeedRouteList>;
  speedElements: (options?: SpeedListOptions) => ClientResult<SpeedElementList>;
};

/**
 * @name speedReads
 * @description The speed insights terminals of a scope: the summary score, the metric over time,
 * the per-route table and the slowest elements. Speed routes take the scope's range, environment
 * and `filter[route]`, `filter[page]` and `filter[country]`, never `traffic`.
 *
 * @example
 * const reads = speedReads(send, { project: "skriuw", period: "7d", filter: {} });
 * await reads.speedRoutes({ device: "mobile", percentile: 75 });
 */
export function speedReads(send: Send, state: ScopeState): SpeedReads {
  const base = basePath(state);
  const query = toQuery({ ...state, traffic: undefined });

  function read<Response>(route: string, options: SpeedListOptions) {
    return send.json<Response>({
      method: "GET",
      path: `${base}${route}`,
      query: {
        ...query,
        device: options.device,
        environment: options.environment ?? query.environment,
        interval: options.interval,
        group: options.group,
        minShare: options.minShare,
        percentile: options.percentile,
        metric: options.metric,
        limit: options.limit,
        cursor: options.cursor,
      },
    });
  }

  return {
    speed: (options = {}) => read<SpeedResponse>("/speed", options),
    speedTimeseries: (options = {}) => read<SpeedTimeseries>("/speed/timeseries", options),
    speedRoutes: (options = {}) => read<SpeedRouteList>("/speed/routes", options),
    speedElements: (options = {}) => read<SpeedElementList>("/speed/elements", options),
  };
}
