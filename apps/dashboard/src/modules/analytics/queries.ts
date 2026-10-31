import type { ProjectScope } from "@spoar/client";
import type { IssueStatus } from "@spoar/contract";

import { logPageSize, readOutcomes } from "./logs";
import type { MetricView } from "./metrics";
import { readSplitSeries, readTopList } from "./series";
import { speedDevice, speedInterval } from "./speed";
import type { VitalView } from "./speed";
import { readViewState } from "./view-state";
import type { FilterDimension, ViewState } from "./view-state";

export type Target = { pathname: string; state: ViewState; cursor: string | undefined };

const annotationLimit = 100;

const splitLimit = 5;

const issuePageSize = 50;

const visitorPageSize = 50;

/**
 * @name parseTarget
 * @description The project path, view state and list cursor a link points at, read from its href
 * the way the destination page will read its URL.
 *
 * @example
 * parseTarget("/projects/skriuw/speed/inp?device=mobile").state.filters; // { device: "mobile" }
 */
export function parseTarget(href: string): Target {
  const url = new URL(href, "http://dashboard.local");
  return {
    pathname: url.pathname,
    state: readViewState(Object.fromEntries(url.searchParams.entries())),
    cursor: url.searchParams.get("cursor") ?? undefined,
  };
}

export function statsQuery(scope: ProjectScope) {
  return { queryKey: scope.key("stats"), queryFn: () => scope.stats() };
}

export function timeseriesQuery(scope: ProjectScope, metric: MetricView["series"]) {
  return { queryKey: scope.key("timeseries", metric), queryFn: () => scope.timeseries(metric) };
}

export function comparedSeriesQuery(scope: ProjectScope, metric: MetricView["series"]) {
  const options = { compare: "previous" } as const;
  return {
    queryKey: scope.key("timeseries", metric, options),
    queryFn: () => scope.timeseries(metric, options),
  };
}

export function splitSeriesQuery(scope: ProjectScope, view: MetricView, split: FilterDimension) {
  return {
    queryKey: [...scope.key("breakdown", split, { limit: splitLimit }), "split", view.series],
    queryFn: () => readSplitSeries(scope, view, split, splitLimit),
  };
}

export function topListQuery(
  scope: ProjectScope,
  dimension: FilterDimension,
  count: MetricView["count"],
  limit: number,
) {
  return {
    queryKey: scope.key("breakdown", dimension, { limit, metrics: [count] }),
    queryFn: () => readTopList(scope, dimension, count, limit),
  };
}

export function outcomesQuery(scope: ProjectScope) {
  return {
    queryKey: [...scope.key("timeseries", "pageviews"), "outcomes"],
    queryFn: () => readOutcomes(scope),
  };
}

export function annotationsQuery(scope: ProjectScope) {
  const options = { limit: annotationLimit };
  return { queryKey: scope.key("annotations", options), queryFn: () => scope.annotations(options) };
}

export function speedSummaryQuery(scope: ProjectScope, state: ViewState) {
  const options = { percentile: state.percentile, device: speedDevice(state.filters) };
  return { queryKey: scope.key("speed", options), queryFn: () => scope.speed(options) };
}

export function speedSeriesQuery(scope: ProjectScope, state: ViewState, view: VitalView) {
  const options = {
    metric: view.slug,
    percentile: state.percentile,
    device: speedDevice(state.filters),
    interval: speedInterval(state.period),
  };
  return {
    queryKey: scope.key("speedTimeseries", options),
    queryFn: () => scope.speedTimeseries(options),
  };
}

export function speedRoutesQuery(scope: ProjectScope, state: ViewState, limit: number) {
  const options = { percentile: state.percentile, device: speedDevice(state.filters), limit };
  return { queryKey: scope.key("speedRoutes", options), queryFn: () => scope.speedRoutes(options) };
}

export function speedElementsQuery(
  scope: ProjectScope,
  state: ViewState,
  view: VitalView,
  limit: number,
) {
  const options = {
    metric: view.slug,
    percentile: state.percentile,
    device: speedDevice(state.filters),
    limit,
  };
  return {
    queryKey: scope.key("speedElements", options),
    queryFn: () => scope.speedElements(options),
  };
}

export function issuesQuery(scope: ProjectScope, status: IssueStatus, cursor: string | undefined) {
  const options = { status, limit: issuePageSize, cursor };
  return { queryKey: scope.key("issues", options), queryFn: () => scope.issues(options) };
}

export function eventsQuery(scope: ProjectScope, cursor: string | undefined) {
  const options = { limit: logPageSize, cursor };
  return { queryKey: scope.key("events", options), queryFn: () => scope.events(options) };
}

export function visitorsQuery(scope: ProjectScope, cursor: string | undefined) {
  const options = { limit: visitorPageSize, cursor };
  return { queryKey: scope.key("visitors", options), queryFn: () => scope.visitors(options) };
}
