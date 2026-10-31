import type { AllScope, ProjectScope } from "@spoar/client";
import type { BreakdownResponse, TimeseriesResponse } from "@spoar/contract";
import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";

import type { MetricView } from "./metrics";
import type { FilterDimension, ViewFilters } from "./view-state";

export type SplitSeries = { value: string; total: number | null; series: TimeseriesResponse };

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
  const rows = top.value.data.filter((row) => row.value !== "");
  const series = await Promise.all(
    rows.map(async (row) => {
      const filter: ViewFilters = {};
      filter[dimension] = row.value;
      const read = await scope.where(filter).timeseries(view.series);
      const total = row[view.count] ?? null;
      return read.ok
        ? ok({ value: row.value, total, series: read.value })
        : err(read.error.message);
    }),
  );
  const failed = series.find((entry) => !entry.ok);
  if (failed && !failed.ok) return err(failed.error);
  return ok(series.flatMap((entry) => (entry.ok ? [entry.value] : [])));
}

/**
 * @name readTopList
 * @description The top values of one dimension, ranked by the metric's count, on a project scope
 * or on the combined scope across every project.
 *
 * @example
 * const pages = await readTopList(scope, "page", "visitors", 5);
 */
export async function readTopList(
  scope: Pick<AllScope, "breakdown">,
  dimension: FilterDimension,
  count: MetricView["count"],
  limit: number,
): Promise<Result<BreakdownResponse, string>> {
  const read = await scope.breakdown(dimension, { limit, metrics: [count] });
  return read.ok ? ok(read.value) : err(read.error.message);
}
