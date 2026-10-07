import type {
  ActiveVisitors,
  AnnotationList,
  LiveSessions,
  Overview,
  ProjectBreakdownResponse,
  QueryParams,
  QueryResult,
} from "@spoar/contract";

import { toBody } from "../body";
import { basePath, toQuery } from "../scope";
import type { ClientResult, Metric, Page, ScopeState, Send } from "../types";

export type LiveRowsOptions = { limit?: number };

export type ProjectOnlyReads = {
  realtimeVisitors: (options?: LiveRowsOptions) => ClientResult<ActiveVisitors>;
  realtimeSessions: (options?: LiveRowsOptions) => ClientResult<LiveSessions>;
  overview: () => ClientResult<Overview>;
  annotations: (options?: Page) => ClientResult<AnnotationList>;
  query: (sql: string, params?: QueryParams) => ClientResult<QueryResult>;
};

export type AllOnlyReads = {
  projectBreakdown: (
    options?: Page & { metrics?: readonly Metric[] },
  ) => ClientResult<ProjectBreakdownResponse>;
  query: (sql: string, params?: QueryParams) => ClientResult<QueryResult>;
};

/**
 * @name projectOnlyReads
 * @description The terminals that exist only under `/v2/projects/:project`: the live visitor and
 * session rows, the dev widget's `overview`, the `annotations` that overlap the scope's range, and
 * SQL over the project's views.
 *
 * @example
 * const reads = projectOnlyReads(send, { project: "skriuw", period: "7d", filter: {} });
 * await reads.query("select route, count(*) from pageviews group by 1 order by 2 desc limit 10");
 */
export function projectOnlyReads(send: Send, state: ScopeState): ProjectOnlyReads {
  const base = basePath(state);
  const { from, to, period } = toQuery(state);

  return {
    realtimeVisitors: (options = {}) =>
      send.json<ActiveVisitors>({
        method: "GET",
        path: `${base}/realtime/visitors`,
        query: { limit: options.limit },
      }),
    realtimeSessions: (options = {}) =>
      send.json<LiveSessions>({
        method: "GET",
        path: `${base}/realtime/sessions`,
        query: { limit: options.limit },
      }),
    overview: () => send.json<Overview>({ method: "GET", path: `${base}/overview` }),
    annotations: (options = {}) =>
      send.json<AnnotationList>({
        method: "GET",
        path: `${base}/annotations`,
        query: { from, to, period, limit: options.limit, cursor: options.cursor },
      }),
    query: (sql, params) =>
      send.json<QueryResult>({
        method: "POST",
        path: `${base}/query`,
        body: toBody(params ? { sql, params } : { sql }),
      }),
  };
}

/**
 * @name allOnlyReads
 * @description The terminals that exist only on the combined routes: the per-project breakdown
 * with each project's change and speed score, and SQL across every project the caller may read.
 *
 * @example
 * await allOnlyReads(send, { project: null, period: "7d", filter: {} }).projectBreakdown();
 */
export function allOnlyReads(send: Send, state: ScopeState): AllOnlyReads {
  const query = toQuery(state);

  return {
    projectBreakdown: (options = {}) =>
      send.json<ProjectBreakdownResponse>({
        method: "GET",
        path: "/v2/breakdown/project",
        query: {
          ...query,
          metrics: options.metrics?.join(","),
          limit: options.limit,
          cursor: options.cursor,
        },
      }),
    query: (sql, params) =>
      send.json<QueryResult>({
        method: "POST",
        path: "/v2/query",
        body: toBody(params ? { sql, params } : { sql }),
      }),
  };
}
