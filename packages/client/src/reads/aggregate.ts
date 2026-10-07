import type {
  BreakdownResponse,
  Interval,
  LiveEvent,
  LiveEvents,
  RealtimeResponse,
  StatsResponse,
  TimeseriesResponse,
} from "@spoar/contract";
import type { Result } from "@spoar/shared/result";

import { basePath, toQuery } from "../scope";
import type {
  ClientError,
  ClientResult,
  Dimension,
  Metric,
  Page,
  ScopeState,
  Send,
} from "../types";

export type TimeseriesOptions = { interval?: Interval; compare?: "previous" };

export type BreakdownOptions = Page & { metrics?: readonly Metric[] };

export type RealtimeOptions = { include?: "visitors"; limit?: number };

export type LiveEventsOptions = { limit?: number; after?: string; signal?: AbortSignal };

export type AggregateReads = {
  stats: () => ClientResult<StatsResponse>;
  timeseries: (metric: Metric, options?: TimeseriesOptions) => ClientResult<TimeseriesResponse>;
  breakdown: (dimension: Dimension, options?: BreakdownOptions) => ClientResult<BreakdownResponse>;
  realtime: (options?: RealtimeOptions) => ClientResult<RealtimeResponse>;
  realtimeEvents: (options?: LiveEventsOptions) => ClientResult<LiveEvents>;
  liveEvents: (options?: LiveEventsOptions) => AsyncGenerator<Result<LiveEvent, ClientError>>;
};

const longPollTimeoutMs = 35_000;

/**
 * @name aggregateReads
 * @description The aggregate terminals of a scope: `stats`, `timeseries`, `breakdown`, `realtime`
 * and the live feed, each one GET on the matching route under the scope's base path with the
 * scope's query. `liveEvents` long-polls `realtime/events` with the cursor the API hands back and
 * yields one event at a time until the signal aborts or a call fails.
 *
 * @example
 * const reads = aggregateReads(send, { project: "skriuw", period: "7d", filter: {} });
 * await reads.breakdown("page", { metrics: ["visitors", "bounce_rate"], limit: 50 });
 */
export function aggregateReads(send: Send, state: ScopeState): AggregateReads {
  const base = basePath(state);
  const query = toQuery(state);

  function realtimeEvents(options: LiveEventsOptions = {}): ClientResult<LiveEvents> {
    const { traffic, environment, ...filters } = query;
    return send.json<LiveEvents>({
      method: "GET",
      path: `${base}/realtime/events`,
      query: { traffic, environment, ...filters, limit: options.limit, after: options.after },
      signal: options.signal,
      timeoutMs: longPollTimeoutMs,
    });
  }

  async function* liveEvents(options: LiveEventsOptions = {}) {
    let after = options.after;
    while (!options.signal?.aborted) {
      const page = await realtimeEvents({ ...options, after });
      if (!page.ok) {
        if (page.error.code !== "TIMEOUT") {
          yield page;
          return;
        }
        continue;
      }
      for (const event of page.value.data) yield { ok: true as const, value: event };
      after = page.value.nextCursor;
    }
  }

  return {
    stats: () => send.json<StatsResponse>({ method: "GET", path: `${base}/stats`, query }),
    timeseries: (metric, options = {}) =>
      send.json<TimeseriesResponse>({
        method: "GET",
        path: `${base}/timeseries`,
        query: { ...query, metric, interval: options.interval, compare: options.compare },
      }),
    breakdown: (dimension, options = {}) =>
      send.json<BreakdownResponse>({
        method: "GET",
        path: `${base}/breakdown/${encodeURIComponent(dimension)}`,
        query: {
          ...query,
          metrics: options.metrics?.join(","),
          limit: options.limit,
          cursor: options.cursor,
        },
      }),
    realtime: (options = {}) =>
      send.json<RealtimeResponse>({
        method: "GET",
        path: `${base}/realtime`,
        query: { include: options.include, limit: options.limit },
      }),
    realtimeEvents,
    liveEvents,
  };
}
