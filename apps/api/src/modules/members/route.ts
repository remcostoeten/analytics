import { AddMember, GithubLookup, MemberList, MemberResponse, UpdateMember } from "@spoar/contract";
import type { EngineError } from "@spoar/engine";
import { Elysia, t } from "elysia";

import type { AccessDeps } from "../../access/types";
import { access } from "../../plugins/access";
import { failure } from "../../plugins/error-handler";
import { errorResponses } from "../../plugins/error-responses";
import type { GithubDirectory } from "./github";
import { addMember, listMembers, lookupLogin, removeMember, updateMember } from "./service";

const tags = ["Members"];
const loginParams = t.Object({
  login: t.String({ description: "A GitHub login from `GET /v2/members`." }),
});

/**
 * @name membersModule
 * @description `/v2/members` for the organization owner: the GitHub logins that may sign in, adding
 * one after GitHub confirms it exists, changing its role and projects, removing it, and the
 * GitHub lookup the add form uses.
 *
 * @example
 * app.use(membersModule(deps, github, docsBase));
 */
export function membersModule(deps: AccessDeps, github: GithubDirectory, docsBase: string) {
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
      async ({ caller, set }) => {
        const listed = await listMembers(deps, caller);
        return listed.ok ? { data: listed.value, nextCursor: null } : reject(listed.error, set);
      },
      {
        access: "admin",
        response: { 200: MemberList, ...errorResponses },
        detail: {
          summary: "List members",
          description:
            "Owner only. Every GitHub login on the sign-in allowlist, with its role, projects and whether it has signed in.",
          tags,
        },
      },
    )
    .get(
      "/members/lookup/:login",
      async ({ caller, params, set }) => {
        const found = await lookupLogin(github, caller, params.login);
        return found.ok ? { data: found.value } : reject(found.error, set);
      },
      {
        params: loginParams,
        access: "admin",
        response: { 200: GithubLookup, ...errorResponses },
        detail: {
          summary: "Look a GitHub login up",
          description:
            "Owner only. Asks GitHub whether the login exists and answers with its canonical casing, numeric id, name and avatar. `404` when GitHub has no such user, `503` when GitHub cannot be reached or its rate limit is reached.",
          tags,
        },
      },
    )
    .post(
      "/members",
      async ({ body, caller, set, status }) => {
        const added = await addMember(deps, github, caller, body);
        return added.ok ? status(201, { data: added.value }) : reject(added.error, set);
      },
      {
        access: "admin",
        body: AddMember,
        response: { 201: MemberResponse, ...errorResponses },
        detail: {
          summary: "Allow a GitHub login",
          description:
            "Owner only. The login must exist on GitHub; it is stored with GitHub's casing and numeric id, and only that account may sign in with it. The role and projects apply from its first sign-in. `409` when the login is already allowed.",
          tags,
        },
      },
    )
    .patch(
      "/members/:login",
      async ({ body, caller, params, set }) => {
        const changed = await updateMember(deps, caller, params.login, body);
        return changed.ok ? { data: changed.value } : reject(changed.error, set);
      },
      {
        params: loginParams,
        access: "admin",
        body: UpdateMember,
        response: { 200: MemberResponse, ...errorResponses },
        detail: {
          summary: "Change a member's role or projects",
          description:
            "Owner only. Applies to the allowlist entry and to the account once it has signed in. The owner's own entry cannot be changed.",
          tags,
        },
      },
    )
    .delete(
      "/members/:login",
      async ({ caller, params, set, status }) => {
        const removed = await removeMember(deps, caller, params.login);
        return removed.ok ? status(204, undefined) : reject(removed.error, set);
      },
      {
        params: loginParams,
        access: "admin",
        response: { 204: t.Void(), ...errorResponses },
        detail: {
          summary: "Remove a member",
          description:
            "Owner only. Takes the login off the allowlist and deletes its account and sessions, so it is signed out at once. The owner cannot be removed.",
          tags,
        },
      },
    );
}
