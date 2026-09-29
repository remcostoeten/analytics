import type {
  BreakdownQuery,
  BreakdownResponse,
  FilterQuery,
  IssueList,
  IssuesQuery,
  LifecycleInterval,
  LifecycleResponse,
  PageQuery,
  RangeQuery,
  StatsResponse,
  TimeseriesQuery,
  TimeseriesResponse,
} from "@remcostoeten/analytics-contract";
import type { Query } from "@remcostoeten/analytics-shared/http";

import type { AdminResult, AdminSend } from "./types";

export type ReadOptions = RangeQuery & FilterQuery;

export type TimeseriesOptions = ReadOptions & TimeseriesQuery;

export type BreakdownOptions = ReadOptions & BreakdownQuery & PageQuery;

export type LifecycleOptions = ReadOptions & { interval?: LifecycleInterval };

export type IssuesOptions = IssuesQuery & PageQuery;

export type ReadsAdmin<Projects extends string> = {
  stats: (project: Projects, options?: ReadOptions) => AdminResult<StatsResponse>;
  timeseries: (project: Projects, options: TimeseriesOptions) => AdminResult<TimeseriesResponse>;
  breakdown: (
    project: Projects,
    dimension: string,
    options?: BreakdownOptions,
  ) => AdminResult<BreakdownResponse>;
  lifecycle: (project: Projects, options?: LifecycleOptions) => AdminResult<LifecycleResponse>;
  issues: (project: Projects, options?: IssuesOptions) => AdminResult<IssueList>;
};

type AnyReadOptions = ReadOptions & BreakdownQuery & PageQuery & Partial<TimeseriesQuery>;

function toQuery(options: AnyReadOptions) {
  const { filter = {}, ...rest } = options;
  const query: Query = { ...rest };
  for (const [dimension, value] of Object.entries(filter)) query[`filter[${dimension}]`] = value;
  return query;
}

/**
 * @name readsAdmin
 * @description The read methods of the admin client, one per read route under
 * `/v2/projects/:project`. Range, traffic and `filter` options become the query string, with
 * `filter: { country: "NL" }` sent as `filter[country]=NL`.
 *
 * @example
 * const reads = readsAdmin<"skriuw">(send);
 * await reads.stats("skriuw", { period: "7d", filter: { country: "NL" } });
 */
export function readsAdmin<Projects extends string>(send: AdminSend): ReadsAdmin<Projects> {
  function projectPath(project: Projects, route: string) {
    return `/v2/projects/${encodeURIComponent(project)}/${route}`;
  }

  return {
    stats: (project, options = {}) =>
      send<StatsResponse>({
        method: "GET",
        path: projectPath(project, "stats"),
        query: toQuery(options),
      }),
    timeseries: (project, options) =>
      send<TimeseriesResponse>({
        method: "GET",
        path: projectPath(project, "timeseries"),
        query: toQuery(options),
      }),
    breakdown: (project, dimension, options = {}) =>
      send<BreakdownResponse>({
        method: "GET",
        path: projectPath(project, `breakdown/${encodeURIComponent(dimension)}`),
        query: toQuery(options),
      }),
    lifecycle: (project, options = {}) =>
      send<LifecycleResponse>({
        method: "GET",
        path: projectPath(project, "lifecycle"),
        query: toQuery(options),
      }),
    issues: (project, options = {}) =>
      send<IssueList>({ method: "GET", path: projectPath(project, "issues"), query: options }),
  };
}
