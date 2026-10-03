import { beforeAll, describe, expect, test } from "bun:test";

import { PGlite } from "@electric-sql/pglite";
import { pgliteAccess } from "@remcostoeten/analytics-engine/adapters/pglite";
import { runMigrations } from "@remcostoeten/analytics-engine/db/migrate";
import {
  migrationsDirectory,
  readMigrations,
} from "@remcostoeten/analytics-engine/db/migration-files";
import { makeSignature } from "better-auth/crypto";

import { betterAuthRegister, betterAuthSessions, createAuth } from "../src/auth/better-auth";

const database = new PGlite();
const stores = pgliteAccess(database);
const secret = "x".repeat(40);
const now = new Date("2026-09-28T12:00:00.000Z");
const auth = createAuth({
  db: stores.db,
  members: stores.members,
  invites: stores.invites,
  clock: () => now,
  secret,
  baseURL: "http://localhost:3100",
  github: { clientId: "github-client", clientSecret: "github-client-secret" },
  cookieDomain: null,
  trustedOrigins: ["http://localhost:3000"],
  secure: false,
});

async function cookieFor(token: string) {
  return `ra.session_token=${encodeURIComponent(`${token}.${await makeSignature(token, secret)}`)}`;
}

async function createUser(login: string) {
  const context = await auth.$context;
  try {
    return await context.internalAdapter.createUser(
      { name: login, email: `${login}@example.test`, emailVerified: true, githubLogin: login },
      { method: "oauth", oauth: { providerId: "github", profile: { login } } },
    );
  } catch {
    return null;
  }
}

beforeAll(async () => {
  const report = await runMigrations(
    {
      execute: async (statement) => {
        await database.exec(statement);
      },
      applied: async () => [],
      record: async () => {},
    },
    readMigrations(migrationsDirectory),
    { dryRun: false, baseline: null },
  );
  if (!report.ok) throw new Error(report.error.message);
  await database.query(
    "INSERT INTO dashboard_users (github_login) VALUES ('remcostoeten'), ('helper')",
  );
});

describe("Better Auth", () => {
  test("only allowlisted GitHub logins get an account; the first one owns the organization", async () => {
    expect(await createUser("stranger")).toBeNull();
    const owner = await createUser("remcostoeten");
    const helper = await createUser("helper");
    expect(owner?.id).toBeString();
    const roles = await database.query<{ github_login: string; role: string }>(
      "SELECT u.github_login, m.role FROM auth_member m JOIN auth_user u ON u.id = m.user_id ORDER BY u.github_login",
    );
    expect(roles.rows).toEqual([
      { github_login: "helper", role: "viewer" },
      { github_login: "remcostoeten", role: "owner" },
    ]);
    expect(helper?.id).toBeString();
  });

  test("a signed session cookie is read back; a login removed from the allowlist loses its sessions and cannot sign in again", async () => {
    const context = await auth.$context;
    const user = await context.internalAdapter.findUserByEmail("remcostoeten@example.test");
    const userId = user?.user.id ?? "";
    const session = await context.internalAdapter.createSession(userId);
    const sessions = betterAuthSessions(auth, stores.members);
    const signedIn = await sessions(new Headers({ cookie: await cookieFor(session.token) }));
    expect(signedIn).toMatchObject({ userId, login: "remcostoeten" });
    expect(await sessions(new Headers({ cookie: "ra.session_token=forged.value" }))).toBeNull();
    expect(await sessions(new Headers())).toBeNull();

    const helper = await context.internalAdapter.findUserByEmail("helper@example.test");
    const helperSession = await context.internalAdapter.createSession(helper?.user.id ?? "");
    const helperCookie = await cookieFor(helperSession.token);
    expect(await sessions(new Headers({ cookie: helperCookie }))).toMatchObject({
      login: "helper",
    });
    await database.query("DELETE FROM dashboard_users WHERE github_login = 'helper'");
    expect(await context.internalAdapter.createSession(helper?.user.id ?? "")).toBeNull();
    expect(await sessions(new Headers({ cookie: helperCookie }))).toBeNull();
  });

  test("the GitHub sign-in starts at the API under /v2/auth", async () => {
    const response = await auth.handler(
      new Request("http://localhost:3100/v2/auth/sign-in/social", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ provider: "github", callbackURL: "http://localhost:3000/" }),
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { url: string };
    expect(new URL(body.url).host).toBe("github.com");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")?.toLowerCase()).toContain("samesite=lax");
  });

  test("email sign-up is closed to the public and needs a claimed invite", async () => {
    const response = await auth.handler(
      new Request("http://localhost:3100/v2/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ name: "Eve", email: "eve@example.test", password: "password-123" }),
      }),
    );
    expect(response.status).toBe(400);
    const register = betterAuthRegister(auth);
    const refused = await register(
      { name: "Eve", email: "eve@example.test", password: "password-123" },
      new Headers({ origin: "http://localhost:3000" }),
    );
    expect(refused.ok).toBe(false);
  });

  test("an invited address registers, signs in with its password and loses access with its membership", async () => {
    await stores.invites.create({
      id: "inv_ada",
      role: "viewer",
      projectIds: null,
      expiresAt: new Date("2026-10-05T12:00:00.000Z"),
      tokenHash: "ada-hash",
    });
    await stores.invites.claim("ada-hash", "ada@example.test", now);
    const register = betterAuthRegister(auth);
    const headers = new Headers({ origin: "http://localhost:3000" });
    const input = { name: "Ada", email: "ada@example.test", password: "password-123" };
    const registered = await register(input, headers);
    if (!registered.ok) throw new Error(registered.error.message);
    const cookie = registered.value.cookies.find((line) => line.startsWith("ra.session_token="));
    expect(cookie).toBeString();
    const member = await stores.members.membership(registered.value.user.id);
    expect(member.ok && member.value).toMatchObject({ role: "viewer", projectIds: null });

    const sessions = betterAuthSessions(auth, stores.members);
    const pair = cookie?.split(";")[0] ?? "";
    expect(await sessions(new Headers({ cookie: pair }))).toMatchObject({
      name: "Ada",
      login: null,
    });

    const again = await register(input, headers);
    expect(again.ok ? null : again.error.code).toBe("CONFLICT");

    const signIn = await auth.handler(
      new Request("http://localhost:3100/v2/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ email: "ada@example.test", password: "password-123" }),
      }),
    );
    expect(signIn.status).toBe(200);

    const changed = await auth.handler(
      new Request("http://localhost:3100/v2/auth/change-password", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: pair,
        },
        body: JSON.stringify({ currentPassword: "password-123", newPassword: "password-456" }),
      }),
    );
    expect(changed.status).toBe(200);
    const signInAgain = await auth.handler(
      new Request("http://localhost:3100/v2/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ email: "ada@example.test", password: "password-456" }),
      }),
    );
    expect(signInAgain.status).toBe(200);

    await database.query("DELETE FROM auth_member WHERE user_id = $1", [registered.value.user.id]);
    expect(await sessions(new Headers({ cookie: pair }))).toBeNull();
  });
});
