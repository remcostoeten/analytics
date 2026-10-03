import type {
  AcceptedInvite,
  AcceptInvite,
  CreatedInvite,
  CreateInvite,
  Invite,
  InvitePreview,
} from "@remcostoeten/analytics-contract";
import { engineError } from "@remcostoeten/analytics-engine";
import type { EngineError, InviteRecord } from "@remcostoeten/analytics-engine";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

import { randomSecret } from "../../access/secrets";
import type { AccessDeps, Register } from "../../access/types";

const day = 24 * 60 * 60 * 1000;
const defaultDays = 7;
const maxDays = 30;

const gone = engineError("NOT_FOUND", "This invite does not exist, was used or has expired");

function iso(date: Nullable<Date>) {
  return date ? date.toISOString() : null;
}

function inviteShape(invite: InviteRecord, now: Date): Invite {
  const status = invite.acceptedBy ? "accepted" : invite.expiresAt <= now ? "expired" : "pending";
  return {
    id: invite.id,
    role: invite.role,
    projectIds: invite.projectIds,
    status,
    email: invite.email,
    acceptedAt: iso(invite.acceptedAt),
    expiresAt: invite.expiresAt.toISOString(),
    createdAt: invite.createdAt.toISOString(),
  };
}

/**
 * @name listInvites
 * @description Every invite, oldest first, with its status, without the token.
 *
 * @example
 * await listInvites(deps);
 */
export async function listInvites(deps: AccessDeps): Promise<Result<Invite[], EngineError>> {
  const found = await deps.invites.list();
  if (!found.ok) return found;
  const now = deps.clock();
  return ok(found.value.map((invite) => inviteShape(invite, now)));
}

/**
 * @name createInvite
 * @description Creates a single-use invite for `role` on `projectIds`, or every project when null.
 * The `join_` token and the dashboard link are returned once and the token is stored as its
 * sha256 hash. It expires after 7 days unless `expiresAt` says otherwise, at most 30 days out.
 *
 * @example
 * await createInvite(deps, { role: "viewer", projectIds: ["docs"] }, "https://analytics.remcostoeten.nl");
 */
export async function createInvite(
  deps: AccessDeps,
  input: CreateInvite,
  dashboardOrigin: Nullable<string>,
): Promise<Result<CreatedInvite["data"], EngineError>> {
  const now = deps.clock();
  const expiresAt = input.expiresAt
    ? new Date(input.expiresAt)
    : new Date(now.getTime() + defaultDays * day);
  if (expiresAt <= now) {
    return err(engineError("VALIDATION_FAILED", "expiresAt must be in the future"));
  }
  if (expiresAt.getTime() - now.getTime() > maxDays * day) {
    return err(engineError("VALIDATION_FAILED", `expiresAt must be within ${maxDays} days`));
  }
  const token = randomSecret("join_", 16);
  const created = await deps.invites.create({
    id: randomSecret("inv_", 8),
    role: input.role,
    projectIds: input.projectIds ?? null,
    expiresAt,
    tokenHash: await deps.hasher.sha256(token),
  });
  if (!created.ok) return created;
  const invite = created.value;
  return ok({
    id: invite.id,
    role: invite.role,
    projectIds: invite.projectIds,
    token,
    url: dashboardOrigin ? new URL(`/join/${token}`, dashboardOrigin).toString() : null,
    expiresAt: invite.expiresAt.toISOString(),
    createdAt: invite.createdAt.toISOString(),
  });
}

/**
 * @name revokeInvite
 * @description Deletes an invite so its link stops working. A member who already joined keeps
 * their membership. An unknown id is `NOT_FOUND`.
 *
 * @example
 * await revokeInvite(deps, "inv_3f9a1c2e");
 */
export async function revokeInvite(
  deps: AccessDeps,
  id: string,
): Promise<Result<void, EngineError>> {
  const revoked = await deps.invites.revoke(id);
  if (!revoked.ok) return revoked;
  return revoked.value ? ok(undefined) : err(engineError("NOT_FOUND", "Invite not found"));
}

/**
 * @name previewInvite
 * @description The role, projects and expiry of an open invite, for the join page. A used,
 * expired or unknown token is `NOT_FOUND`.
 *
 * @example
 * await previewInvite(deps, "join_7c2e9f1a4b6d8e0c7c2e9f1a4b6d8e0c");
 */
export async function previewInvite(
  deps: AccessDeps,
  token: string,
): Promise<Result<InvitePreview["data"], EngineError>> {
  const found = await deps.invites.open(await deps.hasher.sha256(token), deps.clock());
  if (!found.ok) return found;
  if (!found.value) return err(gone);
  const { role, projectIds, expiresAt } = found.value;
  return ok({ role, projectIds, expiresAt: expiresAt.toISOString() });
}

/**
 * @name acceptInvite
 * @description Claims an open invite for the address, creates the account through `register` and
 * returns the new user with the session cookies. A failed registration frees the invite again, so
 * the link keeps working. A used, expired or unknown token is `NOT_FOUND`.
 *
 * @example
 * await acceptInvite(deps, register, token, { name: "Ada", email: "ada@example.com", password }, request.headers);
 */
export async function acceptInvite(
  deps: AccessDeps,
  register: Register,
  token: string,
  input: AcceptInvite,
  headers: Headers,
): Promise<Result<{ body: AcceptedInvite["data"]; cookies: string[] }, EngineError>> {
  const hash = await deps.hasher.sha256(token);
  const claimed = await deps.invites.claim(hash, input.email, deps.clock());
  if (!claimed.ok) return claimed;
  if (!claimed.value) return err(gone);
  const invite = claimed.value;
  const registered = await register(input, headers);
  if (!registered.ok) {
    await deps.invites.release(invite.id);
    return registered;
  }
  const { user, cookies } = registered.value;
  return ok({ body: { user, role: invite.role, projectIds: invite.projectIds }, cookies });
}
