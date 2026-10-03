import type {
  AssignableRole,
  CreatedInvite,
  InviteList,
  Member,
  MemberList,
  MemberResponse,
} from "@remcostoeten/analytics-contract";
import type { Json } from "@remcostoeten/analytics-shared/http";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

import type { AdminResult, AdminSend } from "./types";

export type InviteInput<Projects extends string> = {
  role: AssignableRole;
  projectIds?: Nullable<Projects[]>;
  expiresAt?: Date | string;
};

export type MemberChanges<Projects extends string> =
  | { role: AssignableRole; projectIds?: Nullable<Projects[]> }
  | { role?: AssignableRole; projectIds: Nullable<Projects[]> };

export type InvitesAdmin<Projects extends string> = {
  list: () => AdminResult<InviteList>;
  create: (invite: InviteInput<Projects>) => AdminResult<CreatedInvite["data"]>;
  revoke: (id: string) => AdminResult<null>;
};

export type MembersAdmin<Projects extends string> = {
  list: () => AdminResult<MemberList>;
  update: (id: string, changes: MemberChanges<Projects>) => AdminResult<Member>;
  remove: (id: string) => AdminResult<null>;
};

async function nothing(answer: AdminResult<Json>): AdminResult<null> {
  const result = await answer;
  return result.ok ? { ok: true, value: null } : result;
}

/**
 * @name invitesAdmin
 * @description The `admin.invites` methods: `create` a single-use link for `admin` or `viewer` on
 * some projects or all of them, whose `token` and `url` come back once; `list` them with their
 * status; `revoke` one by id. Needs an `admin` token that lists no projects.
 *
 * @example
 * const invites = invitesAdmin<"skriuw">(send);
 * const created = await invites.create({ role: "viewer", projectIds: ["skriuw"] });
 */
export function invitesAdmin<Projects extends string>(send: AdminSend): InvitesAdmin<Projects> {
  return {
    list: () => send<InviteList>({ method: "GET", path: "/v2/invites" }),
    create: async (invite) => {
      const body: { [key: string]: Json } = { role: invite.role };
      if (invite.projectIds !== undefined) body.projectIds = invite.projectIds;
      if (invite.expiresAt !== undefined) {
        body.expiresAt =
          invite.expiresAt instanceof Date ? invite.expiresAt.toISOString() : invite.expiresAt;
      }
      const result = await send<CreatedInvite>({ method: "POST", path: "/v2/invites", body });
      return result.ok ? { ok: true, value: result.value.data } : result;
    },
    revoke: (id) =>
      nothing(send<Json>({ method: "DELETE", path: `/v2/invites/${encodeURIComponent(id)}` })),
  };
}

/**
 * @name membersAdmin
 * @description The `admin.members` methods: `list` the organization's members, `update` a
 * member's role or projects, and `remove` one, which ends their sessions at once. The owner and
 * the caller themselves answer `FORBIDDEN`. Needs an `admin` token that lists no projects.
 *
 * @example
 * const members = membersAdmin<"skriuw">(send);
 * await members.update("usr_01J8Z9", { role: "admin", projectIds: null });
 */
export function membersAdmin<Projects extends string>(send: AdminSend): MembersAdmin<Projects> {
  function path(id: string) {
    return `/v2/members/${encodeURIComponent(id)}`;
  }

  return {
    list: () => send<MemberList>({ method: "GET", path: "/v2/members" }),
    update: async (id, changes) => {
      const body: { [key: string]: Json } = {};
      if (changes.role !== undefined) body.role = changes.role;
      if (changes.projectIds !== undefined) body.projectIds = changes.projectIds;
      const result = await send<MemberResponse>({ method: "PATCH", path: path(id), body });
      return result.ok ? { ok: true, value: result.value.data } : result;
    },
    remove: (id) => nothing(send<Json>({ method: "DELETE", path: path(id) })),
  };
}
