import { and, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";

import { authMember, authOrganization, invites } from "../db/schema";
import type { InviteRecord, InviteStore } from "../ports";
import type { Database } from "./drizzle";
import { attempt } from "./drizzle-rows";

const inviteColumns = {
  id: invites.id,
  role: invites.role,
  projectIds: invites.projectIds,
  email: invites.email,
  acceptedBy: invites.acceptedBy,
  acceptedAt: invites.acceptedAt,
  expiresAt: invites.expiresAt,
  createdAt: invites.createdAt,
};

function sameEmail(email: string) {
  return sql`lower(${invites.email}) = ${email.toLowerCase()}`;
}

/**
 * @name drizzleInvites
 * @description The `InviteStore` on `invites`. An invite is looked up by its token's sha256 hash
 * and used once: `claim` reserves an open invite for an email, `admit` turns the claim into a
 * membership of `organization` with the invite's role and projects, and `release` frees a claim
 * whose sign-up failed.
 *
 * @example
 * const invites = drizzleInvites(db, "org_main");
 * const claimed = await invites.claim(await hasher.sha256(token), "ada@example.com", new Date());
 */
export function drizzleInvites(db: Database, organization: string): InviteStore {
  function usable(at: Date) {
    return and(isNull(invites.acceptedBy), gt(invites.expiresAt, at));
  }

  return {
    list: () =>
      attempt("Could not list invites", async (): Promise<InviteRecord[]> =>
        db.select(inviteColumns).from(invites).orderBy(invites.createdAt),
      ),
    create: (invite) =>
      attempt("Could not create the invite", async () => {
        const [row] = await db.insert(invites).values(invite).returning(inviteColumns);
        if (!row) throw new Error("The insert returned no row");
        return row;
      }),
    revoke: (id) =>
      attempt("Could not revoke the invite", async () => {
        const rows = await db
          .delete(invites)
          .where(eq(invites.id, id))
          .returning({ id: invites.id });
        return rows.length > 0;
      }),
    open: (hash, at) =>
      attempt("Could not read the invite", async () => {
        const [row] = await db
          .select(inviteColumns)
          .from(invites)
          .where(and(eq(invites.tokenHash, hash), isNull(invites.email), usable(at)));
        return row ?? null;
      }),
    claim: (hash, email, at) =>
      attempt("Could not claim the invite", async () => {
        const [row] = await db
          .update(invites)
          .set({ email: email.toLowerCase(), updatedAt: at })
          .where(and(eq(invites.tokenHash, hash), isNull(invites.email), usable(at)))
          .returning(inviteColumns);
        return row ?? null;
      }),
    release: (id) =>
      attempt("Could not release the invite", async () => {
        await db
          .update(invites)
          .set({ email: null })
          .where(and(eq(invites.id, id), isNull(invites.acceptedBy)));
      }),
    claimed: (email, at) =>
      attempt("Could not read the invite", async () => {
        const [row] = await db
          .select(inviteColumns)
          .from(invites)
          .where(and(sameEmail(email), isNotNull(invites.email), usable(at)));
        return row ?? null;
      }),
    admit: (id, userId, at) =>
      attempt("Could not accept the invite", async () => {
        const [invite] = await db
          .update(invites)
          .set({ acceptedBy: userId, acceptedAt: at, updatedAt: at })
          .where(and(eq(invites.id, id), isNotNull(invites.email), usable(at)))
          .returning(inviteColumns);
        if (!invite) throw new Error("The invite is no longer open");
        await db
          .insert(authOrganization)
          .values({ id: organization, name: "Analytics", slug: "main" })
          .onConflictDoNothing();
        await db
          .insert(authMember)
          .values({
            id: `mem_${crypto.randomUUID()}`,
            organizationId: organization,
            userId,
            role: invite.role,
            projectIds: invite.projectIds,
          })
          .onConflictDoNothing();
        const [membership] = await db
          .select({
            userId: authMember.userId,
            orgId: authMember.organizationId,
            role: authMember.role,
            projectIds: authMember.projectIds,
          })
          .from(authMember)
          .where(eq(authMember.userId, userId));
        if (!membership) throw new Error("The membership was not stored");
        return membership;
      }),
  };
}
