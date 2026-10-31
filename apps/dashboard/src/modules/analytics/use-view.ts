import type { ProjectScope } from "@spoar/client";
import { useParams, useSearchParams } from "next/navigation";
import type { ReadonlyURLSearchParams } from "next/navigation";

import { browserClient } from "@/shared/api/browser-client";

import { viewScope } from "./scope";
import { readViewState } from "./view-state";
import type { ViewState } from "./view-state";

export type ProjectParams = {
  project: string;
  metric?: string[];
  traffic?: string[];
  issue?: string;
  visitor?: string;
  session?: string;
};

export type ProjectView = {
  project: string;
  params: ProjectParams;
  state: ViewState;
  cursor: string | undefined;
  base: string;
  scope: ProjectScope;
};

function viewStateOf(search: ReadonlyURLSearchParams) {
  return readViewState(Object.fromEntries(search.entries()));
}

/**
 * @name useProjectView
 * @description Everything a project page reads from its URL: the project, the route params, the
 * view state, a list cursor, the project's base path and a read scope on the browser client that
 * shares its cache keys with every other page of the project.
 *
 * @example
 * const { scope, state, path } = useProjectView();
 * const stats = useRead(scope.key("stats"), () => scope.stats());
 */
export function useProjectView(): ProjectView {
  const params = useParams<ProjectParams>();
  const search = useSearchParams();
  const state = viewStateOf(search);
  const base = `/projects/${encodeURIComponent(params.project)}`;
  return {
    project: params.project,
    params,
    state,
    cursor: search.get("cursor") ?? undefined,
    base,
    scope: viewScope(browserClient(), params.project, state),
  };
}
