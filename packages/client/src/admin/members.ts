import type {
  AddMember,
  GithubLookup,
  MemberList,
  MemberResponse,
  UpdateMember,
} from "@spoar/contract";
import type { Json } from "@spoar/shared/http";

import { toBody } from "../body";
import type { ClientResult, Send } from "../types";

export type MembersAdmin = {
  list: () => ClientResult<MemberList>;
  lookup: (login: string) => ClientResult<GithubLookup>;
  add: (member: AddMember) => ClientResult<MemberResponse>;
  update: (login: string, changes: UpdateMember) => ClientResult<MemberResponse>;
  remove: (login: string) => ClientResult<null>;
};

/**
 * @name membersAdmin
 * @description The member routes, owner only: the GitHub logins that may sign in. `lookup` asks
 * GitHub whether a login exists, `add` stores it with GitHub's casing and id, `update` changes its
 * role or projects and `remove` signs it out and takes it off the list.
 *
 * @example
 * await membersAdmin(send).add({ login: "octocat", role: "analyst", projectIds: ["skriuw"] });
 */
export function membersAdmin(send: Send): MembersAdmin {
  function path(login: string) {
    return `/v2/members/${encodeURIComponent(login)}`;
  }

  return {
    list: () => send.json<MemberList>({ method: "GET", path: "/v2/members" }),
    lookup: (login) =>
      send.json<GithubLookup>({
        method: "GET",
        path: `/v2/members/lookup/${encodeURIComponent(login)}`,
      }),
    add: (member) =>
      send.json<MemberResponse>({ method: "POST", path: "/v2/members", body: toBody(member) }),
    update: (login, changes) =>
      send.json<MemberResponse>({ method: "PATCH", path: path(login), body: toBody(changes) }),
    remove: async (login) => {
      const result = await send.json<Json>({ method: "DELETE", path: path(login) });
      return result.ok ? { ok: true, value: null } : result;
    },
  };
}
