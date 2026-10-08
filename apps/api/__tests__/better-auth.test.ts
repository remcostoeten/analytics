import { beforeAll, describe, expect, test } from "bun:test";

import { PGlite } from "@electric-sql/pglite";
import { pgliteAccess } from "@spoar/engine/adapters/pglite";
import { runMigrations } from "@spoar/engine/db/migrate";
import { migrationsDirectory, readMigrations } from "@spoar/engine/db/migration-files";
import { makeSignature } from "better-auth/crypto";
import { parseAdditionalUserInputFromProviderProfile } from "better-auth/db";

import { betterAuthSessions, createAuth } from "../src/auth/better-auth";

const database = new PGlite();
const stores = pgliteAccess(database);
const secret = "x".repeat(40);
const auth = createAuth({
  db: stores.db,
  members: stores.members,
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
  const fromProfile = parseAdditionalUserInputFromProviderProfile(
    auth.options,
    { githubLogin: login },
    "create",
  );
  try {
    return await context.internalAdapter.createUser(
      { name: login, email: `${login}@example.test`, emailVerified: true, ...fromProfile },
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

  test("the GitHub login reaches the allowlist hook through the profile filter, and cannot be changed later", async () => {
    expect(
      parseAdditionalUserInputFromProviderProfile(auth.options, { githubLogin: "x" }, "create"),
    ).toEqual({ githubLogin: "x" });
    const context = await auth.$context;
    const owner = await context.internalAdapter.findUserByEmail("remcostoeten@example.test");
    const session = await context.internalAdapter.createSession(owner?.user.id ?? "");
    await auth.handler(
      new Request("http://localhost:3100/v2/auth/update-user", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          cookie: await cookieFor(session.token),
        },
        body: JSON.stringify({ githubLogin: "someone-else" }),
      }),
    );
    const [row] = (
      await database.query<{ github_login: string }>(
        "SELECT github_login FROM auth_user WHERE email = 'remcostoeten@example.test'",
      )
    ).rows;
    expect(row?.github_login).toBe("remcostoeten");
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
});
