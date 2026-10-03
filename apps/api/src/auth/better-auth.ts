import { engineError } from "@remcostoeten/analytics-engine";
import type { InviteStore, MemberStore } from "@remcostoeten/analytics-engine";
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
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";
import { betterAuth } from "better-auth";
import { isAPIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { adminAc, memberAc, ownerAc } from "better-auth/plugins/organization/access";

import type { Register, SessionReader } from "../access/types";

export type AuthOptions = {
  db: Database;
  members: MemberStore;
  invites: InviteStore;
  clock: () => Date;
  secret: string;
  baseURL: string;
  github: { clientId: string; clientSecret: string };
  cookieDomain: Nullable<string>;
  trustedOrigins: string[];
  secure: boolean;
};

async function allowed(members: MemberStore, login: string) {
  if (login === "") return false;
  const result = await members.allowedLogin(login);
  return result.ok && result.value;
}

async function invited(invites: InviteStore, email: string, at: Date) {
  const claimed = await invites.claimed(email, at);
  return claimed.ok ? claimed.value : null;
}

/**
 * @name createAuth
 * @description Better Auth under `/v2/auth`: GitHub and email-and-password sign-in, sessions in
 * the `auth_*` tables and the organization plugin with the owner, admin, analyst and viewer roles.
 * A GitHub account needs its login in `dashboard_users`; an email account needs an invite claimed
 * for its address, so Better Auth's own sign-up is off and registration goes through
 * `POST /v2/join/{token}`. A GitHub account joins the single organization, the first one as owner;
 * an email account joins with its invite's role and projects. The session cookie is httpOnly, `SameSite=Lax`, Secure in production, and set on
 * `cookieDomain` so every subdomain, ingest included, receives it.
 *
 * @example
 * const auth = createAuth({ db, members, secret, baseURL: "https://api.analytics.remcostoeten.nl", github, cookieDomain: ".remcostoeten.nl", trustedOrigins, secure: true });
 */
export function createAuth(options: AuthOptions) {
  const { members } = options;
  return betterAuth({
    appName: "Analytics",
    baseURL: options.baseURL,
    basePath: "/v2/auth",
    secret: options.secret,
    trustedOrigins: options.trustedOrigins,
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
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
          before: async (user) => {
            if (typeof user.githubLogin === "string") {
              return (await allowed(members, user.githubLogin)) ? { data: user } : false;
            }
            return (await invited(options.invites, user.email, options.clock()))
              ? { data: user }
              : false;
          },
          after: async (user) => {
            if (typeof user.githubLogin === "string") {
              const joined = await members.join(user.id, user.githubLogin);
              if (!joined.ok) throw new Error(joined.error.message);
              return;
            }
            const invite = await invited(options.invites, user.email, options.clock());
            if (!invite) throw new Error("The invite is no longer open");
            const admitted = await options.invites.admit(invite.id, user.id, options.clock());
            if (!admitted.ok) throw new Error(admitted.error.message);
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const result = await members.allowed(session.userId);
            return result.ok && result.value ? { data: session } : false;
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
 * no valid session. Access is checked on every read, so removing a GitHub login from
 * `dashboard_users`, or an invited user's membership, ends existing sessions too.
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
    const access = await members.allowed(user.id);
    if (!access.ok || !access.value) return null;
    return {
      userId: user.id,
      name: user.name,
      login,
      image: user.image ?? null,
      expiresAt: session.expiresAt,
    };
  };
}

/**
 * @name betterAuthRegister
 * @description Creates an email-and-password account and signs it in. The caller claims an invite
 * for the address first; the user hooks check that claim and turn it into a membership before the
 * sign-in, which Better Auth's sign-up route would do the other way round. A taken address is
 * `CONFLICT`, a refused account or sign-in `VALIDATION_FAILED`, and the session cookies come back
 * for the response.
 *
 * @example
 * const register = betterAuthRegister(auth);
 * const registered = await register({ name: "Ada", email: "ada@example.com", password }, request.headers);
 */
export function betterAuthRegister(auth: Auth): Register {
  return async (input, headers) => {
    const context = await auth.$context;
    const email = input.email.toLowerCase();
    if (await context.internalAdapter.findUserByEmail(email)) {
      return err(engineError("CONFLICT", "An account with this email already exists"));
    }
    const hash = await context.password.hash(input.password);
    const user = await context.internalAdapter.createUser(
      { name: input.name, email, emailVerified: false },
      { method: "email-password" },
    );
    if (!user) return err(engineError("VALIDATION_FAILED", "This invite cannot create an account"));
    await context.internalAdapter.linkAccount({
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: hash,
    });
    try {
      const signedIn = await auth.api.signInEmail({
        body: { email, password: input.password },
        headers,
        returnHeaders: true,
      });
      return ok({
        user: { id: user.id, name: user.name, email: user.email },
        cookies: signedIn.headers.getSetCookie(),
      });
    } catch (error) {
      if (!isAPIError(error)) throw error;
      return err(engineError("VALIDATION_FAILED", error.body?.message ?? error.message));
    }
  };
}
