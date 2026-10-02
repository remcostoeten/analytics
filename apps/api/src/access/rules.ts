import type { ProjectRecord } from "@spoar/engine";
import type { Nullable, ProjectID } from "@spoar/shared/semantic";

import type { Caller } from "./types";

function lists(projectIds: Nullable<ProjectID[]>, project: Nullable<ProjectID>) {
  if (projectIds === null) return true;
  return project !== null && projectIds.includes(project);
}

/**
 * @name isListed
 * @description Whether a signed-in member or a token covers a project: owners cover every project,
 * other roles and tokens cover all projects when their list is null and only the listed ones
 * otherwise. Without a project, only callers with no list pass.
 *
 * @example
 * isListed(caller, "remcostoeten.nl");
 */
export function isListed(caller: Caller, project: Nullable<ProjectID>): boolean {
  if (caller.kind === "user") return caller.role === "owner" || lists(caller.projectIds, project);
  if (caller.kind === "token") return lists(caller.projectIds, project);
  return false;
}

/**
 * @name canRead
 * @description The `project` level: anyone may read a public project's aggregates; a private one
 * needs a member or token that lists it.
 *
 * @example
 * canRead({ kind: "anonymous" }, project); // true when the project is public
 */
export function canRead(caller: Caller, project: ProjectRecord): boolean {
  return project.visibility === "public" || isListed(caller, project.id);
}

/**
 * @name canReadDetail
 * @description The `detail` level, for visitor-level reads: anyone when the project is public with
 * `publicVisitorData` on, otherwise owners, admins and analysts who list the project, or any token
 * that lists it. Viewers only see aggregates.
 *
 * @example
 * canReadDetail(viewer, project); // false
 */
export function canReadDetail(caller: Caller, project: ProjectRecord): boolean {
  if (project.visibility === "public" && project.publicVisitorData) return true;
  if (caller.kind === "user") return caller.role !== "viewer" && isListed(caller, project.id);
  return caller.kind === "token" && isListed(caller, project.id);
}

/**
 * @name canAdmin
 * @description The `admin` level: owners always; admins and `admin` tokens for the projects they
 * list, and for organization-wide routes (no project) only when they list no projects at all.
 *
 * @example
 * canAdmin(caller, null); // creating projects and tokens
 */
export function canAdmin(caller: Caller, project: Nullable<ProjectID>): boolean {
  if (caller.kind === "user") {
    if (caller.role === "owner") return true;
    return caller.role === "admin" && lists(caller.projectIds, project);
  }
  return caller.kind === "token" && caller.scope === "admin" && lists(caller.projectIds, project);
}

/**
 * @name isSignedInAdmin
 * @description A signed-in owner or admin, whose own visits are marked internal at ingest.
 *
 * @example
 * isSignedInAdmin(caller);
 */
export function isSignedInAdmin(caller: Caller): boolean {
  return caller.kind === "user" && (caller.role === "owner" || caller.role === "admin");
}

/**
 * @name canQuery
 * @description Who may run SQL on a project: owners always; admins and analysts who list it, and
 * tokens with the `sql` scope that list it, while the project's `sqlEnabled` switch is on. Never
 * viewers or anonymous callers, whatever the project's visibility.
 *
 * @example
 * canQuery(analyst, project); // true when listed and sqlEnabled
 */
export function canQuery(caller: Caller, project: ProjectRecord): boolean {
  if (caller.kind === "user") {
    if (caller.role === "owner") return true;
    return caller.role !== "viewer" && project.sqlEnabled && isListed(caller, project.id);
  }
  return (
    caller.kind === "token" &&
    caller.scope === "sql" &&
    project.sqlEnabled &&
    isListed(caller, project.id)
  );
}
