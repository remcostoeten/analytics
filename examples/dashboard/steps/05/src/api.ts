import { createClient } from "@spoar/client";
import type { ProjectScope } from "@spoar/client";

import type { Settings } from "./settings";
import { trimEndpoint } from "./settings";
import type { ViewState } from "./state";

/**
 * @name createProject
 * @description One `@spoar/client` scope over the configured project. A public project needs no
 * token, so `token` is left out when empty.
 *
 * @example
 * const project = createProject(settings);
 * const stats = await scoped(project, state).stats();
 */
export function createProject(settings: Settings): ProjectScope {
  const api = createClient({
    endpoint: trimEndpoint(settings.endpoint),
    ...(settings.token ? { token: settings.token } : {}),
  });
  return api.project(settings.project);
}

/**
 * @name scoped
 * @description Applies the page's period, traffic and filters to a project scope. Every view
 * reads from the result, so one state change refreshes them all together.
 *
 * @example
 * scoped(project, { period: "7d", traffic: "human", filters: { country: "NL" } }).stats();
 */
export function scoped(project: ProjectScope, state: ViewState) {
  return project.period(state.period).traffic(state.traffic).where(state.filters);
}
