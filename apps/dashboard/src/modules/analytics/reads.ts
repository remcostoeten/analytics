import type { BreakdownResponse, PublicProject, TimeseriesResponse } from "@spoar/contract";
import type { ProjectScope } from "@spoar/client";
import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";
import { cache } from "react";

import { serverClient } from "@/shared/api/server-client";

import type { MetricView } from "./metrics";
import type { FilterDimension, ViewFilters, ViewState } from "./view-state";

export type SplitSeries = { value: string; series: TimeseriesResponse };

/**
 * @name listProjects
 * @description Every project the caller may read, once per request: public ones when signed out,
 * private ones too for members.
 *
 * @example
 * const projects = await listProjects();
 */
export const listProjects = cache(async (): Promise<Result<PublicProject[], string>> => {
  const api = await serverClient();
  const listed = await api.projects.list();
  return listed.ok ? ok(listed.value.data) : err(listed.error.message);
});

/**
 * @name readScope
 * @description The read scope for one project and the view in the URL: its period, traffic and
 * filters.
 *
 * @example
 * const scope = await readScope("skriuw", state);
 * const stats = await scope.stats();
 */
export async function readScope(project: string, state: ViewState): Promise<ProjectScope> {
  const api = await serverClient();
  return api
    .project(project)
    .period(state.period)
    .traffic(state.bots ? "all" : "human")
    .where(state.filters);
}

/**
 * @name readSplitSeries
 * @description One series per top value of a dimension, for the summary chart's split view. Empty
 * values are skipped, because the API cannot filter on them.
 *
 * @example
 * const split = await readSplitSeries(scope, metricView("visitors"), "country", 5);
 */
export async function readSplitSeries(
  scope: ProjectScope,
  view: MetricView,
  dimension: FilterDimension,
  limit: number,
): Promise<Result<SplitSeries[], string>> {
  const top = await scope.breakdown(dimension, { limit, metrics: [view.count] });
  if (!top.ok) return err(top.error.message);
  const values = top.value.data.map((row) => row.value).filter((value) => value !== "");
  const series = await Promise.all(
    values.map(async (value) => {
      const filter: ViewFilters = {};
      filter[dimension] = value;
      const read = await scope.where(filter).timeseries(view.series);
      return read.ok ? ok({ value, series: read.value }) : err(read.error.message);
    }),
  );
  const failed = series.find((entry) => !entry.ok);
  if (failed && !failed.ok) return err(failed.error);
  return ok(series.flatMap((entry) => (entry.ok ? [entry.value] : [])));
}

/**
 * @name readTopList
 * @description The top values of one dimension, ranked by the metric's count.
 *
 * @example
 * const pages = await readTopList(scope, "page", "visitors", 5);
 */
export async function readTopList(
  scope: ProjectScope,
  dimension: FilterDimension,
  count: MetricView["count"],
  limit: number,
): Promise<Result<BreakdownResponse, string>> {
  const read = await scope.breakdown(dimension, { limit, metrics: [count] });
  return read.ok ? ok(read.value) : err(read.error.message);
}
