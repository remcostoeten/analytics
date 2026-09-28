import type { MemberStore } from "@remcostoeten/analytics-engine";
import type { Database } from "@remcostoeten/analytics-engine/adapters/access";
import {
  authAccount,
  authInvitation,
  authMember,
  authOrganization,
  authSession,
  authUser,
  authVerification,
} from "@remcostoeten/analytics-engine/db/schema";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { adminAc, memberAc, ownerAc } from "better-auth/plugins/organization/access";

import type { SessionReader } from "../access/types";

export type AuthOptions = {
  db: Database;
  members: MemberStore;
  secret: string;
  baseURL: string;
  github: { clientId: string; clientSecret: string };
  cookieDomain: Nullable<string>;
  trustedOrigins: string[];
  secure: boolean;
};

async function allowed(members: MemberStore, login: unknown) {
  if (typeof login !== "string" || login === "") return false;
  const result = await members.allowedLogin(login);
  return result.ok && result.value;
}

/**
 * @name createAuth
 * @description Better Auth under `/v2/auth`: GitHub sign-in, sessions in the `auth_*` tables and
 * the organization plugin with the owner, admin, analyst and viewer roles. Only GitHub logins in
 * `dashboard_users` may create an account or a session, and each new account joins the single
 * organization. The session cookie is httpOnly, `SameSite=Lax`, Secure in production, and set on
 * `cookieDomain` so every subdomain, ingest included, receives it.
 *
 * @example
 * const auth = createAuth({ db, members, secret, baseURL: "https://api.remcostoeten.nl", github, cookieDomain: ".remcostoeten.nl", trustedOrigins, secure: true });
 */
export function createAuth(options: AuthOptions) {
  const { members } = options;
  return betterAuth({
    appName: "Analytics",
    baseURL: options.baseURL,
    basePath: "/v2/auth",
    secret: options.secret,
    trustedOrigins: options.trustedOrigins,
    database: drizzleAdapter(options.db, {
      provider: "pg",
      schema: {
        user: authUser,
        session: authSession,
        account: authAccount,
        verification: authVerification,
        organization: authOrganization,
        member: authMember,
        invitation: authInvitation,
      },
    }),
    user: {
      additionalFields: { githubLogin: { type: "string", required: false, input: false } },
    },
    socialProviders: {
      github: {
        clientId: options.github.clientId,
        clientSecret: options.github.clientSecret,
        mapProfileToUser: (profile) => ({ githubLogin: profile.login }),
      },
    },
    plugins: [
      organization({
        allowUserToCreateOrganization: false,
        creatorRole: "owner",
        roles: { owner: ownerAc, admin: adminAc, analyst: memberAc, viewer: memberAc },
      }),
    ],
    advanced: {
      cookiePrefix: "ra",
      useSecureCookies: options.secure,
      crossSubDomainCookies: options.cookieDomain
        ? { enabled: true, domain: options.cookieDomain }
        : { enabled: false },
      defaultCookieAttributes: { httpOnly: true, secure: options.secure, sameSite: "lax" },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) =>
            (await allowed(members, user.githubLogin)) ? { data: user } : false,
          after: async (user) => {
            const login = typeof user.githubLogin === "string" ? user.githubLogin : user.name;
            const joined = await members.join(user.id, login);
            if (!joined.ok) throw new Error(joined.error.message);
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const login = await members.loginOf(session.userId);
            return login.ok && (await allowed(members, login.value)) ? { data: session } : false;
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

/**
 * @name betterAuthSessions
 * @description Reads the signed-in user from Better Auth's session cookie, or null when there is
 * no valid session. The login is checked against the allowlist on every read, so removing it from
 * `dashboard_users` ends existing sessions too.
 *
 * @example
 * const sessions = betterAuthSessions(auth, members);
 * const signedIn = await sessions(request.headers);
 */
export function betterAuthSessions(auth: Auth, members: MemberStore): SessionReader {
  return async (headers) => {
    if (!headers.get("cookie")?.includes("session_token")) return null;
    const found = await auth.api.getSession({ headers });
    if (!found) return null;
    const { user, session } = found;
    const login = typeof user.githubLogin === "string" ? user.githubLogin : null;
    if (!(await allowed(members, login))) return null;
    return {
      userId: user.id,
      name: user.name,
      login,
      image: user.image ?? null,
      expiresAt: session.expiresAt,
    };
  };
}
