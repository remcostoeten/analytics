import type { Member, UpdateMember } from "@remcostoeten/analytics-contract";
import { engineError } from "@remcostoeten/analytics-engine";
import type { EngineError, MemberRecord } from "@remcostoeten/analytics-engine";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";
import type { UserID } from "@remcostoeten/analytics-shared/semantic";

import type { AccessDeps, Caller } from "../../access/types";

const missing = engineError("NOT_FOUND", "Member not found");

function memberShape(member: MemberRecord): Member {
  return {
    id: member.userId,
    name: member.name,
    email: member.email,
    login: member.login,
    avatarUrl: member.image,
    signIn: member.login === null ? "password" : "github",
    role: member.role,
    projectIds: member.projectIds,
    joinedAt: member.joinedAt.toISOString(),
  };
}

async function changeable(
  deps: AccessDeps,
  caller: Caller,
  id: UserID,
): Promise<Result<MemberRecord, EngineError>> {
  if (caller.kind === "user" && caller.signedIn.userId === id) {
    return err(engineError("FORBIDDEN", "You cannot change or remove yourself"));
  }
  const found = await deps.members.find(id);
  if (!found.ok) return found;
  if (!found.value) return err(missing);
  if (found.value.role === "owner") {
    return err(engineError("FORBIDDEN", "The owner cannot be changed or removed"));
  }
  return ok(found.value);
}

/**
 * @name listMembers
 * @description Every member of the organization, oldest first, with how they sign in.
 *
 * @example
 * await listMembers(deps);
 */
export async function listMembers(deps: AccessDeps): Promise<Result<Member[], EngineError>> {
  const found = await deps.members.list();
  return found.ok ? ok(found.value.map(memberShape)) : found;
}

/**
 * @name updateMember
 * @description Changes a member's role to `admin` or `viewer` and their projects, null for all.
 * The owner and the caller themselves are `FORBIDDEN`; an unknown id is `NOT_FOUND`.
 *
 * @example
 * await updateMember(deps, caller, "usr_01J8Z9", { role: "admin", projectIds: null });
 */
export async function updateMember(
  deps: AccessDeps,
  caller: Caller,
  id: UserID,
  patch: UpdateMember,
): Promise<Result<Member, EngineError>> {
  const allowed = await changeable(deps, caller, id);
  if (!allowed.ok) return allowed;
  const updated = await deps.members.update(id, patch);
  if (!updated.ok) return updated;
  return updated.value ? ok(memberShape(updated.value)) : err(missing);
}

/**
 * @name removeMember
 * @description Removes a member: their account and sessions end at once, and a GitHub login leaves
 * the allowlist, so coming back takes a new invite or allowlist entry. The owner and the caller
 * themselves are `FORBIDDEN`; an unknown id is `NOT_FOUND`.
 *
 * @example
 * await removeMember(deps, caller, "usr_01J8Z9");
 */
export async function removeMember(
  deps: AccessDeps,
  caller: Caller,
  id: UserID,
): Promise<Result<void, EngineError>> {
  const allowed = await changeable(deps, caller, id);
  if (!allowed.ok) return allowed;
  const removed = await deps.members.remove(id);
  if (!removed.ok) return removed;
  return removed.value ? ok(undefined) : err(missing);
}
