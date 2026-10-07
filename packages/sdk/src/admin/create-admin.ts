import { createClient } from "@spoar/client";
import type {
  AlertsAdmin,
  AnnotationsAdmin,
  BreakdownOptions,
  Dimension,
  IssuesOptions,
  LifecycleOptions,
  Metric,
  ReadOptions,
  TimeseriesOptions,
} from "@spoar/client";
import type {
  BreakdownResponse,
  IssueList,
  LifecycleResponse,
  StatsResponse,
  TimeseriesResponse,
} from "@spoar/contract";

import type { AdminOptions, AdminResult } from "./types";

export type AdminReadOptions = ReadOptions;

export type AdminTimeseriesOptions = ReadOptions & TimeseriesOptions & { metric: Metric };

export type AdminBreakdownOptions = ReadOptions & BreakdownOptions;

export type AdminLifecycleOptions = ReadOptions & LifecycleOptions;

export type ReadsAdmin<Projects extends string> = {
  stats: (project: Projects, options?: AdminReadOptions) => AdminResult<StatsResponse>;
  timeseries: (
    project: Projects,
    options: AdminTimeseriesOptions,
  ) => AdminResult<TimeseriesResponse>;
  breakdown: (
    project: Projects,
    dimension: Dimension,
    options?: AdminBreakdownOptions,
  ) => AdminResult<BreakdownResponse>;
  lifecycle: (project: Projects, options?: AdminLifecycleOptions) => AdminResult<LifecycleResponse>;
  issues: (project: Projects, options?: IssuesOptions) => AdminResult<IssueList>;
};

export type Admin<Projects extends string> = ReadsAdmin<Projects> & {
  alerts: AlertsAdmin<Projects>;
  annotations: AnnotationsAdmin<Projects>;
};

/**
 * @name createAdmin
 * @description The token client for server code and scripts, kept for 2.0 callers: the same
 * `alerts`, `annotations` and read methods as before, now over `@spoar/client`, which has every
 * read route as a chainable scope. Every method resolves to `{ ok: true, value }` or
 * `{ ok: false, error }` and never throws; a missing token answers `NO_TOKEN` without a request.
 *
 * @example
 * const admin = createAdmin<"remcostoeten.nl" | "skriuw">({ endpoint: "https://api.analytics.remcostoeten.nl", token: process.env.RA_ADMIN_TOKEN });
 * const synced = await admin.alerts.sync("remcostoeten.nl", [mail({ to: ["remco@gmail.com"] })]);
 * if (!synced.ok) console.error(synced.error.code, synced.error.message);
 */
export function createAdmin<Projects extends string = string>(
  options: AdminOptions,
): Admin<Projects> {
  const client = createClient<Projects>({
    endpoint: options.endpoint,
    token: options.token ?? "",
    fetch: options.fetch,
    timeoutMs: options.timeoutMs,
  });

  return {
    stats: (project, options = {}) => client.project(project).apply(options).stats(),
    timeseries: (project, { metric, interval, compare, ...scope }) =>
      client.project(project).apply(scope).timeseries(metric, { interval, compare }),
    breakdown: (project, dimension, { metrics, limit, cursor, ...scope } = {}) =>
      client.project(project).apply(scope).breakdown(dimension, { metrics, limit, cursor }),
    lifecycle: (project, { interval, ...scope } = {}) =>
      client.project(project).apply(scope).lifecycle({ interval }),
    issues: (project, options = {}) => client.project(project).issues(options),
    alerts: client.alerts,
    annotations: client.annotations,
  };
}
