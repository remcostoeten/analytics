import type { AddMember, GithubProfile, Member, UpdateMember } from "@spoar/contract";
import { engineError } from "@spoar/engine";
import type { EngineError, MemberRecord } from "@spoar/engine";
import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";
import type { Nullable, ProjectID } from "@spoar/shared/semantic";

import { isOwner } from "../../access/rules";
import type { AccessDeps, Caller } from "../../access/types";
import type { GithubDirectory } from "./github";

type Answer<Value> = Promise<Result<Value, EngineError>>;

function memberShape(member: MemberRecord): Member {
  return {
    login: member.login,
    githubId: member.githubId,
    role: member.role,
    projectIds: member.projectIds,
    joined: member.joined,
    addedAt: member.addedAt.toISOString(),
    lastSignInAt: member.lastSignInAt ? member.lastSignInAt.toISOString() : null,
  };
}

function needOwner(caller: Caller): Result<null, EngineError> {
  return isOwner(caller)
    ? ok(null)
    : err(engineError("FORBIDDEN", "Managing members needs the owner"));
}

async function unknownProject(deps: AccessDeps, projectIds: Nullable<ProjectID[]> | undefined) {
  for (const id of projectIds ?? []) {
    const found = await deps.projects.find(id);
    if (!found.ok) return found;
    if (!found.value) return ok(id);
  }
  return ok(null);
}

async function checkProjects(
  deps: AccessDeps,
  projectIds: Nullable<ProjectID[]> | undefined,
): Promise<Result<null, EngineError>> {
  const missing = await unknownProject(deps, projectIds);
  if (!missing.ok) return missing;
  return missing.value === null
    ? ok(null)
    : err(engineError("VALIDATION_FAILED", `Project ${missing.value} does not exist`));
}

/**
 * @name listMembers
 * @description Every GitHub login on the allowlist with its role, projects and whether it has
 * signed in, oldest first. Owner only.
 *
 * @example
 * await listMembers(deps, caller);
 */
export async function listMembers(deps: AccessDeps, caller: Caller): Answer<Member[]> {
  const allowed = needOwner(caller);
  if (!allowed.ok) return allowed;
  const listed = await deps.members.list();
  return listed.ok ? ok(listed.value.map(memberShape)) : listed;
}

/**
 * @name lookupLogin
 * @description Checks a login on GitHub for the add form. A login GitHub does not know is
 * `NOT_FOUND`. Owner only.
 *
 * @example
 * await lookupLogin(github, caller, "octocat");
 */
export async function lookupLogin(
  github: GithubDirectory,
  caller: Caller,
  login: string,
): Answer<GithubProfile> {
  const allowed = needOwner(caller);
  if (!allowed.ok) return allowed;
  const found = await github.lookup(login);
  if (!found.ok) return found;
  return found.value ? ok(found.value) : err(engineError("NOT_FOUND", "GitHub has no such user"));
}

/**
 * @name addMember
 * @description Allows a GitHub login to sign in. The login is looked up on GitHub first, so a
 * typo or an organization is `VALIDATION_FAILED`; the entry is stored with GitHub's casing and
 * numeric id, and the role and projects apply from the first sign-in. A login already on the
 * list is `CONFLICT`, a project that does not exist is `VALIDATION_FAILED`. Owner only.
 *
 * @example
 * await addMember(deps, github, caller, { login: "octocat", role: "analyst", projectIds: ["docs"] });
 */
export async function addMember(
  deps: AccessDeps,
  github: GithubDirectory,
  caller: Caller,
  input: AddMember,
): Answer<Member> {
  const allowed = needOwner(caller);
  if (!allowed.ok) return allowed;
  const projects = await checkProjects(deps, input.projectIds);
  if (!projects.ok) return projects;
  const profile = await github.lookup(input.login);
  if (!profile.ok) return profile;
  if (!profile.value) {
    return err(engineError("VALIDATION_FAILED", `GitHub has no user ${input.login}`));
  }
  const added = await deps.members.allow({
    login: profile.value.login,
    githubId: profile.value.id,
    role: input.role,
    projectIds: input.projectIds === undefined ? [] : input.projectIds,
  });
  if (!added.ok) return added;
  if (!added.value)
    return err(engineError("CONFLICT", `${profile.value.login} is already allowed`));
  const stored = await deps.members.find(profile.value.login);
  if (!stored.ok) return stored;
  return stored.value
    ? ok(memberShape(stored.value))
    : err(engineError("INTERNAL", "The member was not stored"));
}

/**
 * @name updateMember
 * @description Changes the role or projects of a login, on the allowlist and on the account when
 * it has signed in. An unknown login is `NOT_FOUND` and the owner's entry is `FORBIDDEN`. Owner
 * only.
 *
 * @example
 * await updateMember(deps, caller, "octocat", { role: "viewer" });
 */
export async function updateMember(
  deps: AccessDeps,
  caller: Caller,
  login: string,
  patch: UpdateMember,
): Answer<Member> {
  const allowed = needOwner(caller);
  if (!allowed.ok) return allowed;
  const current = await deps.members.find(login);
  if (!current.ok) return current;
  if (!current.value) return err(engineError("NOT_FOUND", "Member not found"));
  if (current.value.role === "owner") {
    return err(engineError("FORBIDDEN", "The owner's role and projects cannot be changed"));
  }
  const projects = await checkProjects(deps, patch.projectIds);
  if (!projects.ok) return projects;
  const changed = await deps.members.change(login, patch);
  if (!changed.ok) return changed;
  return changed.value
    ? ok(memberShape(changed.value))
    : err(engineError("NOT_FOUND", "Member not found"));
}

/**
 * @name removeMember
 * @description Takes a login off the allowlist and deletes its account and sessions, so it is
 * signed out at once. An unknown login is `NOT_FOUND` and the owner is `FORBIDDEN`. Owner only.
 *
 * @example
 * await removeMember(deps, caller, "octocat");
 */
export async function removeMember(deps: AccessDeps, caller: Caller, login: string): Answer<null> {
  const allowed = needOwner(caller);
  if (!allowed.ok) return allowed;
  const current = await deps.members.find(login);
  if (!current.ok) return current;
  if (!current.value) return err(engineError("NOT_FOUND", "Member not found"));
  if (current.value.role === "owner") {
    return err(engineError("FORBIDDEN", "The owner cannot be removed"));
  }
  const removed = await deps.members.remove(login);
  return removed.ok ? ok(null) : removed;
}
