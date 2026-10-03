import {
  AcceptedInvite,
  AcceptInvite,
  CreatedInvite,
  CreateInvite,
  InviteList,
  InvitePreview,
} from "@remcostoeten/analytics-contract";
import { clientIp, engineError, hashIp } from "@remcostoeten/analytics-engine";
import type { EngineError, Hasher, RateLimiter } from "@remcostoeten/analytics-engine";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";
import { Elysia, t } from "elysia";

import type { AccessDeps, Register } from "../../access/types";
import { access } from "../../plugins/access";
import { failure } from "../../plugins/error-handler";
import { errorResponses } from "../../plugins/error-responses";
import { acceptInvite, createInvite, listInvites, previewInvite, revokeInvite } from "./service";

type JoinLimit = {
  limiter: RateLimiter;
  hasher: Hasher;
  ipSecret: string;
  clock: () => Date;
};

export type InvitesOptions = {
  register: Nullable<Register>;
  dashboardOrigin: Nullable<string>;
  limit: Nullable<JoinLimit>;
};

const tags = ["Invites"];
const joinsPerMinute = 10;

/**
 * @name invitesModule
 * @description `/v2/invites` for organization admins: create a single-use invite link for a role
 * and projects, list invites with their status, and revoke one. `/v2/join/{token}` is public: it
 * shows what an invite grants and registers an email-and-password account with it, signed in at
 * once. Each IP may call `/v2/join` 10 times a minute. Without `register`, as in tests,
 * registering answers 503.
 *
 * @example
 * app.use(invitesModule(deps, { register: betterAuthRegister(auth), dashboardOrigin }, docsBase));
 */
export function invitesModule(deps: AccessDeps, options: InvitesOptions, docsBase: string) {
  function reject(
    error: EngineError,
    set: { status?: unknown; headers: { [name: string]: unknown } },
  ) {
    const failed = failure(error, set.headers, docsBase);
    set.status = failed.status;
    return failed.body;
  }

  async function limited(request: Request): Promise<Nullable<EngineError>> {
    const { limit } = options;
    if (!limit) return null;
    const now = limit.clock();
    const ipHash = await hashIp(
      limit.hasher,
      limit.ipSecret,
      clientIp(request.headers),
      now.toISOString(),
    );
    const decision = await limit.limiter.hit(`join:${ipHash ?? "unknown"}`, joinsPerMinute, 60);
    if (decision.allowed) return null;
    return {
      ...engineError("RATE_LIMITED", "Too many attempts; try again shortly"),
      details: { retryAfterSeconds: decision.retryAfterSeconds },
    };
  }

  return new Elysia({ name: "invites" })
    .use(access(deps, docsBase))
    .get(
      "/invites",
      async ({ set }) => {
        const listed = await listInvites(deps);
        return listed.ok ? { data: listed.value, nextCursor: null } : reject(listed.error, set);
      },
      {
        access: "admin",
        response: { 200: InviteList, ...errorResponses },
        detail: {
          summary: "List invites",
          description:
            "Each invite is `pending`, `accepted` or `expired`. Tokens are never returned.",
          tags,
        },
      },
    )
    .post(
      "/invites",
      async ({ body, set, status }) => {
        const created = await createInvite(deps, body, options.dashboardOrigin);
        return created.ok ? status(201, { data: created.value }) : reject(created.error, set);
      },
      {
        access: "admin",
        body: CreateInvite,
        response: { 201: CreatedInvite, ...errorResponses },
        detail: {
          summary: "Create an invite",
          description:
            "A single-use link to register with email and password as `admin` or `viewer`, limited to `projectIds` or all projects when null. Expires after 7 days by default, at most 30. The token and `url` are in this response only; `url` is null without a dashboard origin.",
          tags,
        },
      },
    )
    .delete(
      "/invites/:invite",
      async ({ params, set, status }) => {
        const revoked = await revokeInvite(deps, params.invite);
        return revoked.ok ? status(204, undefined) : reject(revoked.error, set);
      },
      {
        access: "admin",
        response: { 204: t.Void(), ...errorResponses },
        detail: {
          summary: "Revoke an invite",
          description: "The link stops working at once. Someone who already joined stays a member.",
          tags,
        },
      },
    )
    .get(
      "/join/:token",
      async ({ params, request, set }) => {
        const refused = await limited(request);
        if (refused) return reject(refused, set);
        const found = await previewInvite(deps, params.token);
        return found.ok ? { data: found.value } : reject(found.error, set);
      },
      {
        access: "public",
        response: { 200: InvitePreview, ...errorResponses },
        detail: {
          summary: "Show an invite",
          description:
            "The role, projects and expiry an open invite grants. A used, expired or unknown token answers 404.",
          tags,
        },
      },
    )
    .post(
      "/join/:token",
      async ({ params, body, request, set, status }) => {
        const { register } = options;
        if (!register) {
          return reject(engineError("UNAVAILABLE", "Registration is not configured"), set);
        }
        const refused = await limited(request);
        if (refused) return reject(refused, set);
        const accepted = await acceptInvite(deps, register, params.token, body, request.headers);
        if (!accepted.ok) return reject(accepted.error, set);
        set.headers["set-cookie"] = accepted.value.cookies;
        set.headers["cache-control"] = "private, no-store";
        return status(201, { data: accepted.value.body });
      },
      {
        access: "public",
        body: AcceptInvite,
        response: { 201: AcceptedInvite, ...errorResponses },
        detail: {
          summary: "Register with an invite",
          description:
            "Creates an email-and-password account with the invite's role and projects and signs it in with the session cookie. The invite is used up. A taken email answers 409 and leaves the invite open.",
          tags,
        },
      },
    );
}
