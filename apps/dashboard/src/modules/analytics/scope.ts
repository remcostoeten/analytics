import type { Client, ProjectScope } from "@spoar/client";

import type { ViewState } from "./view-state";

/**
 * @name viewScope
 * @description The read scope for one project and the view in the URL: its period, traffic and
 * filters. Shared by server components and client components, so both sides build the same
 * requests and the same cache keys.
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
