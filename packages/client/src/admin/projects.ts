import type {
  CreatedProject,
  CreateProject,
  KeyKind,
  ProjectList,
  ProjectResponse,
  ProjectsQuery,
  RotatedKey,
  UpdatedProject,
  UpdateProject,
} from "@spoar/contract";

import type { Json } from "@spoar/shared/http";

import { toBody } from "../body";
import type { ClientResult, Send } from "../types";

export type ProjectsAdmin<Projects extends string> = {
  list: (query?: ProjectsQuery) => ClientResult<ProjectList>;
  get: (project: Projects) => ClientResult<ProjectResponse>;
  create: (project: CreateProject) => ClientResult<CreatedProject>;
  update: (project: Projects, changes: UpdateProject) => ClientResult<UpdatedProject>;
  rotateKey: (project: Projects, kind: KeyKind) => ClientResult<RotatedKey>;
  remove: (project: Projects) => ClientResult<null>;
};

/**
 * @name projectsAdmin
 * @description The project routes: the list anyone may see (all projects for an admin), one
 * project, the admin-only create, update and key rotation, and the owner-only `remove`. A rotated
 * secret is in the answer once and never again. A removed project's keys stop at once and its
 * rows are purged by the cleanup job.
 *
 * @example
 * const projects = projectsAdmin<"skriuw">(send);
 * await projects.update("skriuw", { visibility: "private" });
 */
export function projectsAdmin<Projects extends string>(send: Send): ProjectsAdmin<Projects> {
  function projectPath(project: Projects) {
    return `/v2/projects/${encodeURIComponent(project)}`;
  }

  return {
    list: (query = {}) =>
      send.json<ProjectList>({ method: "GET", path: "/v2/projects", query: { ...query } }),
    get: (project) => send.json<ProjectResponse>({ method: "GET", path: projectPath(project) }),
    create: (project) =>
      send.json<CreatedProject>({ method: "POST", path: "/v2/projects", body: toBody(project) }),
    update: (project, changes) =>
      send.json<UpdatedProject>({
        method: "PATCH",
        path: projectPath(project),
        body: toBody(changes),
      }),
    rotateKey: (project, kind) =>
      send.json<RotatedKey>({
        method: "POST",
        path: `${projectPath(project)}/keys`,
        body: { kind },
      }),
    remove: async (project) => {
      const result = await send.json<Json>({ method: "DELETE", path: projectPath(project) });
      return result.ok ? { ok: true, value: null } : result;
    },
  };
}
