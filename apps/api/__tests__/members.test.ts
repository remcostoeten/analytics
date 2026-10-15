import { beforeAll, describe, expect, test } from "bun:test";

import { PGlite } from "@electric-sql/pglite";
import { fixedClock, memoryLogger } from "@spoar/engine/adapters/memory";
import { pgliteAccess } from "@spoar/engine/adapters/pglite";
import { webCryptoHasher } from "@spoar/engine/adapters/system";
import { runMigrations } from "@spoar/engine/db/migrate";
import { migrationsDirectory, readMigrations } from "@spoar/engine/db/migration-files";
import { ok } from "@spoar/shared/result";
import { Elysia } from "elysia";

import type { AccessDeps, SignedIn } from "../src/access/types";
import { githubDirectory } from "../src/modules/members/github";
import type { GithubDirectory } from "../src/modules/members/github";
import { membersModule } from "../src/modules/members/route";
import { errorHandler } from "../src/plugins/error-handler";
import { requestId } from "../src/plugins/request-id";

type Json = { [key: string]: unknown };

const database = new PGlite();
const docsBase = "https://api.example.test/v2/openapi";
const users: { [id: string]: SignedIn } = {};
const known: { [login: string]: { login: string; id: string } } = {
  octocat: { login: "octocat", id: "583231" },
  hubot: { login: "hubot", id: "480938" },
};

const github: GithubDirectory = {
  lookup: async (login) => {
    const found = known[login.toLowerCase()];
    return ok(
      found
        ? { ...found, name: null, avatarUrl: `https://avatars.example.test/${found.id}` }
        : null,
    );
  },
};

const deps: AccessDeps = {
  ...pgliteAccess(database),
  sessions: async (headers) => {
    const match = /ra\.session_token=([\w-]+)/.exec(headers.get("cookie") ?? "");
    return match?.[1] ? (users[match[1]] ?? null) : null;
  },
  hasher: webCryptoHasher(),
  clock: () => fixedClock(new Date("2026-10-13T12:00:00.000Z")).now(),
  cronSecret: null,
};

const api = new Elysia({ prefix: "/v2" })
  .use(requestId())
  .use(errorHandler({ docsBase, logger: () => memoryLogger() }))
  .use(membersModule(deps, github, docsBase));

async function addUser(id: string, role: string) {
  users[id] = {
    userId: id,
    name: id,
    login: id,
    image: null,
    expiresAt: new Date("2026-11-13T12:00:00.000Z"),
  };
  await database.query(
    "INSERT INTO auth_user (id, name, email, github_login) VALUES ($1, $1, $2, $1)",
    [id, `${id}@example.test`],
  );
  await database.query(
    "INSERT INTO auth_member (id, organization_id, user_id, role, project_ids) VALUES ($1, 'org_main', $2, $3, $4)",
    [`mem_${id}`, id, role, role === "owner" ? null : []],
  );
}

function call(method: string, path: string, user: string | null, body?: Json) {
  return api.handle(
    new Request(`http://localhost/v2${path}`, {
      method,
      headers: {
        ...(user ? { cookie: `ra.session_token=${user}` } : {}),
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
}

async function json(response: Response) {
  return (await response.json()) as Json;
}

beforeAll(async () => {
  await runMigrations(
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
  await database.query(
    "INSERT INTO auth_organization (id, name, slug) VALUES ('org_main', 'main', 'main')",
  );
  await database.query(
    "INSERT INTO projects (id, name, domain, public_key, secret_key_hash) VALUES ('docs', 'Docs', 'docs.test', 'pk', 'sk')",
  );
  await database.query("INSERT INTO dashboard_users (github_login) VALUES ('boss')");
  await addUser("boss", "owner");
  await addUser("deputy", "admin");
});

describe("members", () => {
  test("only the owner may use the routes", async () => {
    expect((await call("GET", "/members", null)).status).toBe(401);
    expect((await call("GET", "/members", "deputy")).status).toBe(403);
    expect(
      (await call("POST", "/members", "deputy", { login: "octocat", role: "viewer" })).status,
    ).toBe(403);
    expect((await call("GET", "/members/lookup/octocat", "deputy")).status).toBe(403);
  });

  test("a lookup answers with GitHub's profile or 404", async () => {
    const found = await call("GET", "/members/lookup/OctoCat", "boss");
    expect(found.status).toBe(200);
    expect(await json(found)).toEqual({
      data: {
        login: "octocat",
        id: "583231",
        name: null,
        avatarUrl: "https://avatars.example.test/583231",
      },
    });
    expect((await call("GET", "/members/lookup/ghost", "boss")).status).toBe(404);
  });

  test("adding stores GitHub's casing and id, refuses unknown logins, duplicates and unknown projects", async () => {
    const added = await call("POST", "/members", "boss", {
      login: "OCTOCAT",
      role: "analyst",
      projectIds: ["docs"],
    });
    expect(added.status).toBe(201);
    expect(await json(added)).toMatchObject({
      data: {
        login: "octocat",
        githubId: "583231",
        role: "analyst",
        projectIds: ["docs"],
        joined: false,
      },
    });
    expect(
      (await call("POST", "/members", "boss", { login: "octocat", role: "viewer" })).status,
    ).toBe(409);
    expect(
      (await call("POST", "/members", "boss", { login: "ghost", role: "viewer" })).status,
    ).toBe(400);
    expect(
      (
        await call("POST", "/members", "boss", {
          login: "hubot",
          role: "viewer",
          projectIds: ["nope"],
        })
      ).status,
    ).toBe(400);
    expect((await call("POST", "/members", "boss", { login: "hubot", role: "owner" })).status).toBe(
      400,
    );
    const stored = await database.query<{ github_id: string }>(
      "SELECT github_id FROM dashboard_users WHERE github_login = 'octocat'",
    );
    expect(stored.rows[0]?.github_id).toBe("583231");
  });

  test("a new member without projects starts with none", async () => {
    const added = await call("POST", "/members", "boss", { login: "hubot", role: "viewer" });
    expect(await json(added)).toMatchObject({ data: { projectIds: [] } });
  });

  test("the list holds the owner and every granted login", async () => {
    const listed = (await json(await call("GET", "/members", "boss"))).data as Json[];
    expect(listed.map((member) => [member.login, member.role, member.joined])).toEqual([
      ["boss", "owner", true],
      ["octocat", "analyst", false],
      ["hubot", "viewer", false],
    ]);
  });

  test("changing applies the patch, leaves absent fields alone and refuses the owner", async () => {
    const changed = await call("PATCH", "/members/octocat", "boss", { projectIds: null });
    expect(await json(changed)).toMatchObject({ data: { role: "analyst", projectIds: null } });
    expect((await call("PATCH", "/members/octocat", "boss", { role: "admin" })).status).toBe(200);
    expect((await call("PATCH", "/members/nobody", "boss", { role: "admin" })).status).toBe(404);
    expect((await call("PATCH", "/members/boss", "boss", { role: "viewer" })).status).toBe(403);
    expect((await call("PATCH", "/members/octocat", "boss", { projectIds: ["nope"] })).status).toBe(
      400,
    );
  });

  test("removing deletes the entry and refuses the owner", async () => {
    expect((await call("DELETE", "/members/hubot", "boss")).status).toBe(204);
    expect((await call("DELETE", "/members/hubot", "boss")).status).toBe(404);
    expect((await call("DELETE", "/members/boss", "boss")).status).toBe(403);
  });
});

describe("githubDirectory", () => {
  function directory(status: number, body: unknown) {
    return githubDirectory({
      send: async () => new Response(JSON.stringify(body), { status }),
      token: "ghp_test",
    });
  }

  const user = {
    id: 583231,
    login: "octocat",
    name: "The Octocat",
    avatar_url: "https://a.test/1",
    type: "User",
  };

  test("maps a user and sends the token", async () => {
    const seen: { authorization: string | null } = { authorization: null };
    const found = await githubDirectory({
      send: async (_url, init) => {
        seen.authorization = new Headers(init?.headers).get("authorization");
        return new Response(JSON.stringify(user));
      },
      token: "ghp_test",
    }).lookup("octocat");
    expect(found).toEqual({
      ok: true,
      value: { login: "octocat", id: "583231", name: "The Octocat", avatarUrl: "https://a.test/1" },
    });
    expect(seen.authorization).toBe("Bearer ghp_test");
  });

  test("unknown logins and organizations are null", async () => {
    expect(await directory(404, {}).lookup("ghost")).toEqual({ ok: true, value: null });
    expect(await directory(200, { ...user, type: "Organization" }).lookup("acme")).toEqual({
      ok: true,
      value: null,
    });
  });

  test("rate limits, other statuses and bad bodies are UNAVAILABLE", async () => {
    for (const [status, body] of [
      [403, {}],
      [429, {}],
      [500, {}],
      [200, { nope: true }],
    ] as const) {
      const found = await directory(status, body).lookup("octocat");
      expect(found.ok).toBe(false);
      expect(!found.ok && found.error.code).toBe("UNAVAILABLE");
    }
  });
});
