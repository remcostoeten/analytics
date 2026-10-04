import { engineError } from "@spoar/engine";
import type { EngineError, ProjectRecord } from "@spoar/engine";
import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";
import type { Nullable, ProjectID } from "@spoar/shared/semantic";

import { bearerToken, resolveCaller, sameSecret } from "./caller";
import { canAdmin, canRead, canReadDetail } from "./rules";
import type { AccessDeps, Caller, Level } from "./types";

export type Decision = {
  caller: Caller;
  project: Nullable<ProjectRecord>;
};

function notFound(): Result<Decision, EngineError> {
  return err(engineError("NOT_FOUND", "Project not found"));
}

function refused(caller: Caller, message: string): Result<Decision, EngineError> {
  return caller.kind === "anonymous"
    ? err(engineError("UNAUTHORIZED", "Sign in or send an API token"))
    : err(engineError("FORBIDDEN", message));
}

function cron(headers: Headers, secret: Nullable<string>): Result<Decision, EngineError> {
  const given = bearerToken(headers);
  if (secret && given && sameSecret(given, secret))
    return ok({ caller: { kind: "cron" }, project: null });
  return err(engineError("UNAUTHORIZED", "The cron secret is missing or wrong"));
}

function judge(
  level: Level,
  caller: Caller,
  project: Nullable<ProjectRecord>,
): Result<Decision, EngineError> {
  const decision = ok({ caller, project });
  if (level === "public") return decision;
  if (!project) {
    if (level !== "admin") return notFound();
    return canAdmin(caller, null) ? decision : refused(caller, "This needs an organization admin");
  }
  if (!canRead(caller, project)) return notFound();
  if (level === "project") return decision;
  if (level === "detail") {
    return canReadDetail(caller, project)
      ? decision
      : refused(caller, "Visitor-level data needs an analyst, admin or API token");
  }
  return canAdmin(caller, project.id) ? decision : refused(caller, "This needs a project admin");
}

/**
 * @name decide
 * @description Applies one access level to a request, reading the caller and, for routes under
 * `/projects/:project`, the project. A private project the caller cannot read is `NOT_FOUND`, so
 * its name does not leak; a readable project the caller may not change or see in detail is
 * `UNAUTHORIZED` when signed out and `FORBIDDEN` otherwise. `cron` only accepts the cron secret.
 *
 * @example
 * const decision = await decide("admin", request.headers, "docs", deps);
 */
export async function decide(
  level: Level,
  headers: Headers,
  projectId: Nullable<ProjectID>,
  deps: AccessDeps,
): Promise<Result<Decision, EngineError>> {
  if (level === "cron") return cron(headers, deps.cronSecret);
  const caller = await resolveCaller(headers, deps);
  if (!caller.ok) return caller;
  if (!projectId) return judge(level, caller.value, null);
  const project = await deps.projects.find(projectId);
  if (!project.ok) return project;
  if (!project.value) return notFound();
  return judge(level, caller.value, project.value);
}
