import { MemberList, MemberResponse, UpdateMember } from "@remcostoeten/analytics-contract";
import type { EngineError } from "@remcostoeten/analytics-engine";
import { Elysia, t } from "elysia";

import type { AccessDeps } from "../../access/types";
import { access } from "../../plugins/access";
import { failure } from "../../plugins/error-handler";
import { errorResponses } from "../../plugins/error-responses";
import { listMembers, removeMember, updateMember } from "./service";

const tags = ["Members"];

/**
 * @name membersModule
 * @description `/v2/members` for organization admins: list the members with their role, projects
 * and sign-in method, change a member's role or projects, and remove a member. The owner and the
 * caller themselves cannot be changed or removed. New members arrive through `/v2/invites`.
 *
 * @example
 * app.use(membersModule(deps, docsBase));
 */
export function membersModule(deps: AccessDeps, docsBase: string) {
  function reject(
    error: EngineError,
    set: { status?: unknown; headers: { [name: string]: unknown } },
  ) {
    const failed = failure(error, set.headers, docsBase);
    set.status = failed.status;
    return failed.body;
  }

  return new Elysia({ name: "members" })
    .use(access(deps, docsBase))
    .get(
      "/members",
      async ({ set }) => {
        const listed = await listMembers(deps);
        return listed.ok ? { data: listed.value, nextCursor: null } : reject(listed.error, set);
      },
      {
        access: "admin",
        response: { 200: MemberList, ...errorResponses },
        detail: {
          summary: "List members",
          description:
            "Everyone in the organization with their role, projects and whether they sign in with GitHub or a password.",
          tags,
        },
      },
    )
    .patch(
      "/members/:member",
      async ({ params, body, caller, set }) => {
        const updated = await updateMember(deps, caller, params.member, body);
        return updated.ok ? { data: updated.value } : reject(updated.error, set);
      },
      {
        access: "admin",
        body: UpdateMember,
        response: { 200: MemberResponse, ...errorResponses },
        detail: {
          summary: "Change a member",
          description:
            "Sets `role` to `admin` or `viewer` and `projectIds`, null for every project. The owner and you yourself answer 403.",
          tags,
        },
      },
    )
    .delete(
      "/members/:member",
      async ({ params, caller, set, status }) => {
        const removed = await removeMember(deps, caller, params.member);
        return removed.ok ? status(204, undefined) : reject(removed.error, set);
      },
      {
        access: "admin",
        response: { 204: t.Void(), ...errorResponses },
        detail: {
          summary: "Remove a member",
          description:
            "Deletes the account and its sessions at once; a GitHub login also leaves the allowlist. The owner and you yourself answer 403.",
          tags,
        },
      },
    );
}
