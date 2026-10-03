import { AuthSession } from "@remcostoeten/analytics-contract";
import { engineError } from "@remcostoeten/analytics-engine";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";
import { Elysia } from "elysia";

import { isSignedInAdmin } from "../../access/rules";
import type { AccessDeps } from "../../access/types";
import { access } from "../../plugins/access";
import { failure } from "../../plugins/error-handler";
import { errorResponses } from "../../plugins/error-responses";

export type AuthModuleOptions = {
  deps: AccessDeps;
  docsBase: string;
  handler: Nullable<(request: Request) => Promise<Response>>;
};

/**
 * @name authModule
 * @description `GET /v2/auth/session` for the dashboard, and every other `/v2/auth/*` path handed
 * to Better Auth unchanged: GitHub and email sign-in, the callback, sign-out and password changes.
 * Better Auth's organization routes answer 404, so members change only through `/v2/members` and
 * `/v2/invites` under this API's rules. Without a handler, as in tests, every path answers 404.
 *
 * @example
 * app.use(authModule({ deps, docsBase, handler: auth.handler }));
 */
export function authModule(options: AuthModuleOptions) {
  const { handler } = options;
  const module = new Elysia({ name: "auth" }).use(access(options.deps, options.docsBase)).get(
    "/auth/session",
    ({ caller }) => {
      if (caller.kind !== "user") return { user: null, session: null, role: null, isAdmin: false };
      const { signedIn } = caller;
      return {
        user: {
          id: signedIn.userId,
          login: signedIn.login ?? signedIn.name,
          name: signedIn.name,
          email: signedIn.email,
          avatarUrl: signedIn.image,
        },
        session: { expiresAt: signedIn.expiresAt.toISOString() },
        role: caller.role,
        isAdmin: isSignedInAdmin(caller),
      };
    },
    {
      access: "public",
      response: { 200: AuthSession, ...errorResponses },
      detail: {
        summary: "Current session",
        description: "Who is signed in, their role, and whether they may change settings.",
        tags: ["Sign-in"],
      },
    },
  );
  if (!handler) return module;
  return module.all(
    "/auth/*",
    ({ request, set }) => {
      if (!new URL(request.url).pathname.includes("/auth/organization/")) return handler(request);
      const failed = failure(engineError("NOT_FOUND", "Not found"), set.headers, options.docsBase);
      set.status = failed.status;
      return failed.body;
    },
    {
      parse: "none",
      detail: { hide: true },
    },
  );
}
