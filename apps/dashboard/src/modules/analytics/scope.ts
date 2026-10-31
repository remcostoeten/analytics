import type { Client, ProjectScope } from "@spoar/client";

import { speedFilters } from "./speed";
import type { ViewState } from "./view-state";

/**
 * @name viewScope
 * @description The read scope for one project and the view in the URL: its period, traffic and
 * filters. Every page builds it the same way, so their reads share cache keys.
 *
 * @example
 * const scope = viewScope(browserClient(), "skriuw", state);
 * useQuery({ queryKey: scope.key("stats"), queryFn: () => scope.stats() });
 */
export function viewScope(api: Client<string>, project: string, state: ViewState): ProjectScope {
  return api
    .project(project)
    .period(state.period)
    .traffic(state.bots ? "all" : "human")
    .where(state.filters);
}

/**
 * @name speedViewScope
 * @description The read scope for the speed routes of one project: its period and only the
 * route, path and country filters, which are the ones speed accepts. Traffic is always human
 * there.
 *
 * @example
 * const scope = speedViewScope(browserClient(), "skriuw", state);
 * const vitals = await scope.speed({ percentile: state.percentile, device: "all" });
 */
export function speedViewScope(
  api: Client<string>,
  project: string,
  state: ViewState,
): ProjectScope {
  return api.project(project).period(state.period).where(speedFilters(state.filters));
}
