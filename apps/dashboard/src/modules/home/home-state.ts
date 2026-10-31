import type { AllScope, Client } from "@spoar/client";
import type { Nullable } from "@spoar/shared/semantic";
import { useSearchParams } from "next/navigation";

import { metricView, metricViews } from "@/modules/analytics/metrics";
import type { MetricView } from "@/modules/analytics/metrics";
import { speedFilters } from "@/modules/analytics/speed";
import { readViewState, viewQuery, withFilter } from "@/modules/analytics/view-state";
import type { FilterDimension, SearchParams, ViewState } from "@/modules/analytics/view-state";

export type HomeState = {
  view: ViewState;
  metric: MetricView;
  project: Nullable<string>;
  byProject: boolean;
};

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * @name readHomeState
 * @description Reads the overview from the URL: the shared analytics view (period and filters),
 * plus `metric` for the traffic chart, `project` to narrow every card to one project and
 * `by=project` to split the chart per project. Unknown values fall back to the defaults.
 *
 * @example
 * readHomeState({ metric: "pageviews", project: "skriuw" }).metric.label; // "Page views"
 */
export function readHomeState(params: SearchParams): HomeState {
  const project = single(params.project);
  return {
    view: readViewState(params),
    metric: metricView(single(params.metric)),
    project: project ? project : null,
    byProject: single(params.by) === "project",
  };
}

/**
 * @name homeHref
 * @description The overview URL for a state, leaving defaults out so links stay short.
 *
 * @example
 * homeHref(readHomeState({ metric: "visitors" })); // "/"
 */
export function homeHref(state: HomeState) {
  const query = new URLSearchParams(viewQuery(state.view));
  if (state.metric.slug !== metricViews[0].slug) query.set("metric", state.metric.slug);
  if (state.project !== null) query.set("project", state.project);
  if (state.byProject) query.set("by", "project");
  const text = query.toString();
  return text ? `/?${text}` : "/";
}

/**
 * @name toggleHomeFilter
 * @description The overview filtered on one dimension value, or with that filter cleared when it
 * is already the active one, so clicking a row twice undoes it.
 *
 * @example
 * toggleHomeFilter(state, "country", "NL").view.filters.country; // "NL"
 */
export function toggleHomeFilter(
  state: HomeState,
  dimension: FilterDimension,
  value: string,
): HomeState {
  const next = state.view.filters[dimension] === value ? null : value;
  return { ...state, view: withFilter(state.view, dimension, next) };
}

/**
 * @name homeScope
 * @description The read scope for the overview: every readable project, or the one in the URL,
 * over the view's period and filters, human traffic only.
 *
 * @example
 * const scope = homeScope(browserClient(), state);
 * await scope.stats();
 */
export function homeScope(api: Client<string>, state: HomeState): AllScope {
  const scope = api.period(state.view.period).human().where(state.view.filters);
  return state.project === null ? scope : scope.where({ project: state.project });
}

/**
 * @name homeSpeedScope
 * @description The overview's scope for the speed routes, which accept only the route, path and
 * country filters.
 *
 * @example
 * await homeSpeedScope(browserClient(), state).speed({ percentile: 75 });
 */
export function homeSpeedScope(api: Client<string>, state: HomeState): AllScope {
  const scope = api.period(state.view.period).where(speedFilters(state.view.filters));
  return state.project === null ? scope : scope.where({ project: state.project });
}

/**
 * @name useHomeState
 * @description The overview state in the browser's URL.
 *
 * @example
 * const state = useHomeState();
 * state.metric.series; // "visitors"
 */
export function useHomeState(): HomeState {
  return readHomeState(Object.fromEntries(useSearchParams().entries()));
}
