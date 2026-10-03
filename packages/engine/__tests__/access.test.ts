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
    expect(value(await access.members.allowedLogin("remcostoeten"))).toBe(true);
    expect(value(await access.members.allowedLogin("someone-else"))).toBe(false);
  });

  test("the first member creates the organization as owner and later ones join as viewers", async () => {
    value(await access.projects.create(project));
    const owner = value(await access.members.join("usr_owner", "remcostoeten"));
    expect(owner).toEqual({
      userId: "usr_owner",
      orgId: "org_main",
      role: "owner",
      projectIds: null,
    });
    expect(value(await access.members.join("usr_owner", "remcostoeten"))).toEqual(owner);
    const guest = value(await access.members.join("usr_guest", "guest"));
    expect(guest).toMatchObject({ role: "viewer", projectIds: [] });
    expect(value(await access.projects.find("docs"))?.orgId).toBe("org_main");
  });

  test("a GitHub user may sign in while allowlisted, an invited user while a member", async () => {
    expect(value(await access.members.allowed("usr_owner"))).toBe(true);
    expect(value(await access.members.allowed("usr_guest"))).toBe(false);
    expect(value(await access.members.allowed("usr_missing"))).toBe(false);
    await database.query(
      "INSERT INTO auth_user (id, name, email) VALUES ('usr_mail', 'Ada', 'ada@example.test')",
    );
    expect(value(await access.members.allowed("usr_mail"))).toBe(false);
    value(await access.members.join("usr_mail", "Ada"));
    expect(value(await access.members.allowed("usr_mail"))).toBe(true);
  });
});

describe("invites", () => {
  const at = new Date("2026-09-28T12:00:00.000Z");
  const later = new Date("2026-10-05T12:00:00.000Z");

  test("an invite is claimed once, released on a failed sign-up, and admitted as a membership", async () => {
    await database.query(
      "INSERT INTO auth_user (id, name, email) VALUES ('usr_invited', 'Grace', 'grace@example.test')",
    );
    const created = value(
      await access.invites.create({
        id: "inv_1",
        role: "viewer",
        projectIds: ["docs"],
        expiresAt: later,
        tokenHash: "invite-hash",
      }),
    );
    expect(created).toMatchObject({ id: "inv_1", email: null, acceptedBy: null });
    expect(value(await access.invites.open("invite-hash", at))?.id).toBe("inv_1");
    expect(value(await access.invites.open("invite-hash", later))).toBeNull();

    expect(value(await access.invites.claim("invite-hash", "Grace@Example.test", at))?.email).toBe(
      "grace@example.test",
    );
    expect(value(await access.invites.claim("invite-hash", "other@example.test", at))).toBeNull();
    expect(value(await access.invites.open("invite-hash", at))).toBeNull();
    expect(value(await access.invites.claimed("GRACE@example.test", at))?.id).toBe("inv_1");

    value(await access.invites.release("inv_1"));
    expect(value(await access.invites.claimed("grace@example.test", at))).toBeNull();
    value(await access.invites.claim("invite-hash", "grace@example.test", at));

    const membership = value(await access.invites.admit("inv_1", "usr_invited", at));
    expect(membership).toEqual({
      userId: "usr_invited",
      orgId: "org_main",
      role: "viewer",
      projectIds: ["docs"],
    });
    expect(value(await access.invites.claimed("grace@example.test", at))).toBeNull();
    expect((await access.invites.admit("inv_1", "usr_invited", at)).ok).toBe(false);
    expect(value(await access.invites.list())).toEqual([
      expect.objectContaining({ id: "inv_1", acceptedBy: "usr_invited", acceptedAt: at }),
    ]);
    expect(value(await access.invites.revoke("inv_1"))).toBe(true);
    expect(value(await access.invites.revoke("inv_1"))).toBe(false);
  });
});

describe("member admin", () => {
  test("list, update and remove members, never the owner", async () => {
    await database.query("INSERT INTO dashboard_users (github_login) VALUES ('Guest')");
    const listed = value(await access.members.list());
    expect(listed.map((member) => [member.userId, member.role])).toEqual([
      ["usr_owner", "owner"],
      ["usr_guest", "viewer"],
      ["usr_mail", "viewer"],
      ["usr_invited", "viewer"],
    ]);
    expect(listed[0]).toMatchObject({ name: "remcostoeten", login: "remcostoeten", image: null });
    expect(listed[2]).toMatchObject({ email: "ada@example.test", login: null });

    const updated = value(
      await access.members.update("usr_guest", { role: "admin", projectIds: null }),
    );
    expect(updated).toMatchObject({ userId: "usr_guest", role: "admin", projectIds: null });
    expect(value(await access.members.update("usr_owner", { role: "viewer" }))).toBeNull();
    expect(value(await access.members.update("usr_missing", { role: "viewer" }))).toBeNull();

    expect(value(await access.members.remove("usr_owner"))).toBe(false);
    expect(value(await access.members.remove("usr_guest"))).toBe(true);
    expect(value(await access.members.find("usr_guest"))).toBeNull();
    expect(value(await access.members.allowedLogin("guest"))).toBe(false);
    expect(value(await access.members.remove("usr_guest"))).toBe(false);
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
    expect(value(await access.tokens.list()).map((token) => token.id)).toEqual(["tok_1"]);
    expect(value(await access.tokens.revoke("tok_1"))).toBe(true);
    expect(value(await access.tokens.revoke("tok_1"))).toBe(false);
    expect(value(await access.tokens.byHash("token-hash"))).toBeNull();
  });
});
