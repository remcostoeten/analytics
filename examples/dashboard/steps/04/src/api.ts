import { createClient } from "@spoar/client";
import type { ProjectScope } from "@spoar/client";

import type { Settings } from "./settings";
import { trimEndpoint } from "./settings";

/**
 * @name createProject
 * @description One `@spoar/client` scope over the configured project. A public project needs no
 * token, so `token` is left out when empty.
 *
 * @example
 * const project = createProject(settings);
 * const stats = await project.period("7d").stats();
 */
export function createProject(settings: Settings): ProjectScope {
  const api = createClient({
    endpoint: trimEndpoint(settings.endpoint),
    ...(settings.token ? { token: settings.token } : {}),
  });
  return api.project(settings.project);
}
