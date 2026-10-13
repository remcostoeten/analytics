import { beforeAll, describe, expect, test } from "bun:test";

import { pgliteAccess } from "../src/adapters/pglite";
import { runMigrations } from "../src/db/migrate";
import { migrationsDirectory, readMigrations } from "../src/db/migration-files";
import { createClient, createDatabase } from "./pglite-client";

const database = createDatabase();
const access = pgliteAccess(database);

function value<Value>(
  result: { ok: true; value: Value } | { ok: false; error: { message: string } },
) {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

async function addUser(id: string, login: string) {
  await database.query(
    "INSERT INTO auth_user (id, name, email, github_login) VALUES ($1, $2, $3, $4)",
    [id, login, `${login}@example.test`, login],
  );
}

const project = {
  id: "docs",
  name: "Docs",
  domain: "docs.remcostoeten.nl",
  visibility: "public" as const,
  publicVisitorData: false,
  allowedOrigins: ["https://docs.remcostoeten.nl"],
  retentionDays: 90,
  publicKey: "pk_test_docs",
  secretKeyHash: "hash-of-secret",
  orgId: null,
};

beforeAll(async () => {
  const report = await runMigrations(createClient(database), readMigrations(migrationsDirectory), {
    dryRun: false,
    baseline: null,
  });
  if (!report.ok) throw new Error(report.error.message);
  await database.query("INSERT INTO dashboard_users (github_login) VALUES ('RemcoStoeten')");
  await addUser("usr_owner", "remcostoeten");
  await addUser("usr_guest", "guest");
});

describe("members", () => {
  test("the allowlist ignores case", async () => {
    expect(value(await access.members.allowedLogin("remcostoeten", null))).toBe(true);
    expect(value(await access.members.allowedLogin("someone-else", null))).toBe(false);
    expect(value(await access.members.loginOf("usr_owner"))).toBe("remcostoeten");
  });

  test("the first member creates the organization as owner and later ones join as viewers", async () => {
    value(await access.projects.create(project));
    const owner = value(await access.members.join("usr_owner", "remcostoeten", "1"));
    expect(owner).toEqual({
      userId: "usr_owner",
      orgId: "org_main",
      role: "owner",
      projectIds: null,
    });
    expect(value(await access.members.join("usr_owner", "remcostoeten", "1"))).toEqual(owner);
    const guest = value(await access.members.join("usr_guest", "guest", null));
    expect(guest).toMatchObject({ role: "viewer", projectIds: [] });
    expect(value(await access.projects.find("docs"))?.orgId).toBe("org_main");
  });

  test("the first sign-in stores the GitHub id and later ids must match it", async () => {
    expect(value(await access.members.allowedLogin("remcostoeten", "1"))).toBe(true);
    expect(value(await access.members.allowedLogin("remcostoeten", "2"))).toBe(false);
    expect(value(await access.members.find("remcostoeten"))).toMatchObject({
      githubId: "1",
      role: "owner",
      joined: true,
    });
  });

  test("the last sign-in is the newest session, and null before any", async () => {
    expect(value(await access.members.find("remcostoeten"))?.lastSignInAt).toBeNull();
    await database.query(
      "INSERT INTO auth_session (id, user_id, token, expires_at, created_at) VALUES ('ses_1', 'usr_owner', 't1', now() + interval '1 day', '2026-10-01T10:00:00Z'), ('ses_2', 'usr_owner', 't2', now() + interval '1 day', '2026-10-02T10:00:00Z')",
    );
    expect(value(await access.members.find("remcostoeten"))?.lastSignInAt).toEqual(
      new Date("2026-10-02T10:00:00Z"),
    );
  });

  test("allow stores a grant that the member's first sign-in turns into a membership", async () => {
    const grant = {
      login: "Analyst",
      githubId: "7",
      role: "analyst" as const,
      projectIds: ["docs"],
    };
    expect(value(await access.members.allow(grant))).toBe(true);
    expect(value(await access.members.allow({ ...grant, login: "analyst" }))).toBe(false);
    expect(value(await access.members.find("analyst"))).toMatchObject({
      login: "Analyst",
      role: "analyst",
      projectIds: ["docs"],
      joined: false,
    });
    await addUser("usr_analyst", "analyst");
    const joined = value(await access.members.join("usr_analyst", "analyst", "7"));
    expect(joined).toMatchObject({ role: "analyst", projectIds: ["docs"] });
    expect(value(await access.members.allowedLogin("analyst", "8"))).toBe(false);
  });

  test("change updates the entry and the joined member, and remove deletes the account", async () => {
    const changed = value(
      await access.members.change("ANALYST", { role: "viewer", projectIds: null }),
    );
    expect(changed).toMatchObject({ role: "viewer", projectIds: null, joined: true });
    expect(value(await access.members.membership("usr_analyst"))).toMatchObject({
      role: "viewer",
      projectIds: null,
    });
    expect(value(await access.members.change("nobody", { role: "admin" }))).toBeNull();
    expect(value(await access.members.list()).map((member) => member.login)).toEqual([
      "RemcoStoeten",
      "Analyst",
    ]);
    expect(value(await access.members.remove("analyst"))).toBe(true);
    expect(value(await access.members.remove("analyst"))).toBe(false);
    expect(value(await access.members.membership("usr_analyst"))).toBeNull();
    expect(value(await access.members.allowedLogin("analyst", null))).toBe(false);
  });
});

describe("projects", () => {
  test("create refuses a taken id, update patches and rotate replaces keys", async () => {
    expect(value(await access.projects.create(project))).toBeNull();
    const updated = value(
      await access.projects.update("docs", { visibility: "private", sqlEnabled: false }),
    );
    expect(updated).toMatchObject({ visibility: "private", sqlEnabled: false });
    expect(value(await access.projects.update("missing", { name: "x" }))).toBeNull();
    expect(value(await access.projects.list("private")).map((row) => row.id)).toEqual(["docs"]);
    expect(value(await access.projects.list("public"))).toEqual([]);
    expect(value(await access.projects.rotate("docs", "public", "pk_test_rotated"))).toBeInstanceOf(
      Date,
    );
    expect(value(await access.projects.find("docs"))?.publicKey).toBe("pk_test_rotated");
    expect(value(await access.projects.rotate("missing", "secret", "hash"))).toBeNull();
  });
});

describe("tokens", () => {
  test("create, find by hash, touch, list and revoke", async () => {
    const created = value(
      await access.tokens.create({
        id: "tok_1",
        kind: "api",
        name: "CI report",
        scope: "sql",
        projectIds: ["docs"],
        expiresAt: null,
        tokenHash: "token-hash",
      }),
    );
    expect(created).toMatchObject({
      id: "tok_1",
      scope: "sql",
      projectIds: ["docs"],
      lastUsedAt: null,
    });
    value(await access.tokens.touch("tok_1", new Date("2026-09-28T12:00:00.000Z")));
    expect(value(await access.tokens.byHash("token-hash"))?.lastUsedAt).toEqual(
      new Date("2026-09-28T12:00:00.000Z"),
    );
    value(
      await access.tokens.create({
        id: "tok_widget",
        kind: "widget",
        name: "Widget",
        scope: "admin",
        projectIds: ["docs"],
        expiresAt: new Date("2026-09-28T12:15:00.000Z"),
        tokenHash: "widget-hash",
      }),
    );
    expect(value(await access.tokens.list("api")).map((token) => token.id)).toEqual(["tok_1"]);
    expect(value(await access.tokens.list("widget")).map((token) => token.id)).toEqual([
      "tok_widget",
    ]);
    expect(value(await access.tokens.revoke("tok_1"))).toBe(true);
    expect(value(await access.tokens.revoke("tok_1"))).toBe(false);
    expect(value(await access.tokens.byHash("token-hash"))).toBeNull();
  });
});
