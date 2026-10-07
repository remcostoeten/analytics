import type { Project, PublicProject } from "@spoar/contract";
import type { EngineError, Role } from "@spoar/engine";
import { ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";

import { canAdmin, isSignedInAdmin } from "../../access/rules";
import type { AccessDeps, Caller } from "../../access/types";
import { listProjects } from "../projects/service";

export type SetupUser = { login: string; name: string; role: Role };

export type SetupView =
  | { state: "signed-out"; baseUrl: string }
  | { state: "no-access"; baseUrl: string; user: SetupUser }
  | { state: "admin"; baseUrl: string; user: SetupUser; canCreate: boolean; projects: Project[] };

function withSettings(project: Project | PublicProject): project is Project {
  return "publicKey" in project;
}

/**
 * @name setupView
 * @description What the setup page shows this caller: the sign-in button for anyone without a
 * session, the login and role for a member who may not administer anything, and for owners and
 * admins the projects they administer with their settings, plus whether they may create one.
 *
 * @example
 * const view = await setupView(deps, caller, "https://api.analytics.remcostoeten.nl");
 */
export async function setupView(
  deps: AccessDeps,
  caller: Caller,
  baseUrl: string,
): Promise<Result<SetupView, EngineError>> {
  if (caller.kind !== "user") return ok({ state: "signed-out", baseUrl });
  const { signedIn } = caller;
  const user: SetupUser = {
    login: signedIn.login ?? signedIn.name,
    name: signedIn.name,
    role: caller.role,
  };
  if (!isSignedInAdmin(caller)) return ok({ state: "no-access", baseUrl, user });
  const listed = await listProjects(deps, caller, null);
  if (!listed.ok) return listed;
  return ok({
    state: "admin",
    baseUrl,
    user,
    canCreate: canAdmin(caller, null),
    projects: listed.value.filter(withSettings),
  });
}
