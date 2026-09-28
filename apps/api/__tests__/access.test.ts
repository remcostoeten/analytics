import { beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import {
  createEngine,
  defaultEnrichers,
  defaultSignals,
  defaultStages,
} from "@remcostoeten/analytics-engine";
import { fixedClock, memoryLogger } from "@remcostoeten/analytics-engine/adapters/memory";
import { pgliteAccess, pgliteAdapters } from "@remcostoeten/analytics-engine/adapters/pglite";
import { webCryptoHasher } from "@remcostoeten/analytics-engine/adapters/system";
import { runMigrations } from "@remcostoeten/analytics-engine/db/migrate";
import {
  migrationsDirectory,
  readMigrations,
} from "@remcostoeten/analytics-engine/db/migration-files";
import { Elysia } from "elysia";

import type { AccessDeps, SignedIn } from "../src/access/types";
import { createApp } from "../src/app";
import { openGeo } from "../src/geo";
import { access } from "../src/plugins/access";
import { errorHandler } from "../src/plugins/error-handler";

type Json = { [key: string]: unknown };

const now = new Date("2026-09-28T12:00:00.000Z");
const clock = fixedClock(now);
const database = new PGlite();
const hasher = webCryptoHasher();
const docsBase = "https://api.example.test/v2/openapi";
const geo = openGeo([], []);
const cronSecret = "cron-secret-for-tests";

const users: { [id: string]: SignedIn } = {};
const fixture = JSON.parse(
  readFileSync(
    join(
      import.meta.dir,
      "../../../packages/contract/fixtures/IngestEnvelope/valid/browser-batch.json",
    ),
    "utf8",
  ),
) as { events: Json[] };

async function sessions(headers: Headers) {
  const match = /ra\.session_token=([\w-]+)/.exec(headers.get("cookie") ?? "");
  return match?.[1] ? (users[match[1]] ?? null) : null;
}

const deps: AccessDeps = {
  ...pgliteAccess(database),
  sessions,
  hasher,
  clock: () => clock.now(),
  cronSecret,
};

const api = createApp({
  engine: (logger) =>
    createEngine(
      { ...pgliteAdapters(database, clock), geo: geo.lookup, hasher, clock, logger },
      {
        stages: defaultStages,
        signals: defaultSignals,
        enrichers: defaultEnrichers,
        dimensions: [],
      },
      { ipSecret: "x".repeat(48), rateLimit: { limit: 1000, windowSeconds: 60 } },
    ),
  logger: () => memoryLogger(),
  clock: () => clock.now(),
  dashboardOrigin: "https://dashboard.example.test",
  docsBase,
  geo: { city: geo.city, asn: geo.asn, loadMs: geo.loadMs },
  access: deps,
  reads: {
    store: pgliteAccess(database).reads,
    details: pgliteAccess(database).details,
    limiter: pgliteAdapters(database, clock).limiter,
    hasher: webCryptoHasher(),
    ipSecret: "x".repeat(48),
    publicLimit: 1000,
    clock: () => clock.now(),
  },
  authHandler: null,
});

const probe = new Elysia({ prefix: "/v2" })
  .use(errorHandler({ docsBase, logger: () => memoryLogger() }))
  .use(access(deps, docsBase))
  .get("/projects/:project/visitors", ({ caller }) => ({ caller: caller.kind }), {
    access: "detail",
  })
  .post("/admin/jobs/rollup", () => ({ ran: true }), { access: "cron" });

type Caller = { cookie?: string; token?: string };

function headersFor(caller: Caller, extra: { [name: string]: string } = {}) {
  const headers: { [name: string]: string } = { ...extra };
  if (caller.cookie) headers.cookie = `ra.session_token=${caller.cookie}`;
  if (caller.token) headers.authorization = `Bearer ${caller.token}`;
  return headers;
}

function call(
  target: { handle: (request: Request) => Promise<Response> },
  method: string,
  path: string,
  caller: Caller = {},
  body?: Json,
) {
  return target.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: headersFor(caller, body ? { "content-type": "application/json" } : {}),
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
}

async function status(method: string, path: string, caller: Caller = {}, body?: Json) {
  return (await call(api, method, path, caller, body)).status;
}

async function json(response: Response): Promise<Json> {
  return (await response.json()) as Json;
}

const anonymous: Caller = {};
const owner: Caller = { cookie: "usr_owner" };
const admin: Caller = { cookie: "usr_admin" };
const analyst: Caller = { cookie: "usr_analyst" };
const viewer: Caller = { cookie: "usr_viewer" };
const outsider: Caller = { cookie: "usr_outsider" };

async function addUser(id: string, role: string, projectIds: string[] | null) {
  users[id] = {
    userId: id,
    name: id,
    login: id,
    image: null,
    expiresAt: new Date("2026-10-28T12:00:00.000Z"),
  };
  await database.query(
    "INSERT INTO auth_user (id, name, email, github_login) VALUES ($1, $1, $2, $1)",
    [id, `${id}@example.test`],
  );
  await database.query(
    "INSERT INTO auth_member (id, organization_id, user_id, role, project_ids) VALUES ($1, 'org_main', $2, $3, $4)",
    [`mem_${id}`, id, role, projectIds],
  );
}

async function addProject(id: string, visibility: string, publicVisitorData: boolean) {
  await database.query(
    "INSERT INTO projects (id, name, domain, visibility, public_visitor_data, public_key, secret_key_hash, org_id) VALUES ($1, $1, $2, $3, $4, $5, $6, 'org_main')",
    [
      id,
      `${id}.example.test`,
      visibility,
      publicVisitorData,
      `pk_test_${id}`,
      await hasher.sha256(`sk_test_${id}`),
    ],
  );
}

async function addToken(
  name: string,
  scope: string,
  projectIds: string[] | null,
  expiresAt: Date | null = null,
) {
  const token = `at_test_${name}`;
  await database.query(
    "INSERT INTO api_tokens (id, name, token_hash, scope, project_ids, expires_at) VALUES ($1, $1, $2, $3, $4, $5)",
    [`tok_${name}`, await hasher.sha256(token), scope, projectIds, expiresAt],
  );
}

function token(name: string): Caller {
  return { token: `at_test_${name}` };
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
    "INSERT INTO auth_organization (id, name, slug) VALUES ('org_main', 'main', 'main')",
  );
  await addProject("open", "public", false);
  await addProject("open-detail", "public", true);
  await addProject("closed", "private", false);
  await addUser("usr_owner", "owner", null);
  await addUser("usr_admin", "admin", ["closed"]);
  await addUser("usr_analyst", "analyst", ["closed"]);
  await addUser("usr_viewer", "viewer", ["closed"]);
  await addUser("usr_outsider", "viewer", []);
  await addToken("read", "read", ["closed"]);
  await addToken("sql", "sql", ["closed"]);
  await addToken("admin", "admin", null);
  await addToken("admin-closed", "admin", ["closed"]);
  await addToken("expired", "read", null, new Date("2026-09-01T00:00:00.000Z"));
});

describe("public", () => {
  test("anyone lists public projects without their settings", async () => {
    const body = await json(await call(api, "GET", "/v2/projects"));
    expect(body.data).toEqual([
      {
        id: "open",
        name: "open",
        domain: "open.example.test",
        visibility: "public",
        createdAt: expect.any(String),
      },
      {
        id: "open-detail",
        name: "open-detail",
        domain: "open-detail.example.test",
        visibility: "public",
        createdAt: expect.any(String),
      },
    ]);
  });

  test("a listed viewer also sees their private project; the owner sees every setting", async () => {
    const listed = await json(await call(api, "GET", "/v2/projects", viewer));
    expect((listed.data as Json[]).map((project) => project.id)).toEqual([
      "closed",
      "open",
      "open-detail",
    ]);
    const privateOnly = await json(
      await call(api, "GET", "/v2/projects?visibility=private", owner),
    );
    expect(privateOnly.data).toEqual([
      expect.objectContaining({ id: "closed", publicKey: "pk_test_closed", sqlEnabled: true }),
    ]);
  });

  test("the session route answers signed out and signed in", async () => {
    expect(await json(await call(api, "GET", "/v2/auth/session"))).toEqual({
      user: null,
      session: null,
      role: null,
      isAdmin: false,
    });
    expect(await json(await call(api, "GET", "/v2/auth/session", owner))).toMatchObject({
      user: { id: "usr_owner", login: "usr_owner" },
      session: { expiresAt: "2026-10-28T12:00:00.000Z" },
      role: "owner",
      isAdmin: true,
    });
    expect(await json(await call(api, "GET", "/v2/auth/session", analyst))).toMatchObject({
      role: "analyst",
      isAdmin: false,
    });
  });
});

describe("project", () => {
  test.each([
    ["anonymous on a public project", "open", anonymous, 200],
    ["anonymous on a private project", "closed", anonymous, 404],
    ["a viewer who does not list it", "closed", outsider, 404],
    ["a viewer who lists it", "closed", viewer, 200],
    ["a read token that lists it", "closed", token("read"), 200],
    ["the owner", "closed", owner, 200],
    ["anyone on a project that does not exist", "missing", owner, 404],
  ])("%s", async (_, project, caller, expected) => {
    expect(await status("GET", `/v2/projects/${project}`, caller)).toBe(expected);
  });

  test("a private project's 404 looks like a missing one", async () => {
    const hidden = await json(await call(api, "GET", "/v2/projects/closed"));
    const missing = await json(await call(api, "GET", "/v2/projects/missing"));
    expect(hidden).toMatchObject({ error: { code: "NOT_FOUND", message: "Project not found" } });
    expect((hidden.error as Json).message).toBe((missing.error as Json).message);
  });

  test("admins get settings, readers only the public fields", async () => {
    const forViewer = await json(await call(api, "GET", "/v2/projects/closed", viewer));
    const forAdmin = await json(await call(api, "GET", "/v2/projects/closed", admin));
    expect(forViewer.data).not.toHaveProperty("publicKey");
    expect(forAdmin.data).toHaveProperty("publicKey", "pk_test_closed");
  });

  test("unknown and expired tokens are refused, not treated as anonymous", async () => {
    expect(await status("GET", "/v2/projects/open", { token: "at_test_unknown" })).toBe(401);
    expect(await status("GET", "/v2/projects/open", token("expired"))).toBe(401);
  });
});

describe("detail", () => {
  test.each([
    ["anonymous on a public project with visitor data", "open-detail", anonymous, 200],
    ["anonymous on a public project without it", "open", anonymous, 401],
    ["anonymous on a private project", "closed", anonymous, 404],
    ["a viewer who lists the project", "closed", viewer, 403],
    ["an analyst who lists the project", "closed", analyst, 200],
    ["a read token that lists the project", "closed", token("read"), 200],
    ["a sql token that lists the project", "closed", token("sql"), 200],
  ])("%s", async (_, project, caller, expected) => {
    expect((await call(probe, "GET", `/v2/projects/${project}/visitors`, caller)).status).toBe(
      expected,
    );
  });
});

describe("admin", () => {
  test.each([
    ["anonymous on a private project", "closed", anonymous, 404],
    ["anonymous on a public project", "open", anonymous, 401],
    ["a viewer who lists it", "closed", viewer, 403],
    ["a read token that lists it", "closed", token("read"), 403],
    ["an admin who lists it", "closed", admin, 200],
    ["an admin who does not list it", "open", admin, 403],
    ["an admin token for it", "closed", token("admin-closed"), 200],
    ["the owner", "open", owner, 200],
  ])("PATCH a project: %s", async (_, project, caller, expected) => {
    expect(await status("PATCH", `/v2/projects/${project}`, caller, { retentionDays: 120 })).toBe(
      expected,
    );
  });

  test("PATCH answers only the changed fields", async () => {
    const body = await json(
      await call(api, "PATCH", "/v2/projects/open", owner, { sqlEnabled: false }),
    );
    expect(body.data).toEqual({ id: "open", sqlEnabled: false, updatedAt: expect.any(String) });
  });

  test.each([
    ["anonymous", anonymous, 401],
    ["an admin limited to listed projects", admin, 403],
    ["an admin token limited to listed projects", token("admin-closed"), 403],
  ])("organization routes refuse %s", async (_, caller, expected) => {
    expect(
      await status("POST", "/v2/projects", caller, {
        id: "refused",
        name: "Refused",
        domain: "refused.example.test",
      }),
    ).toBe(expected);
    expect(await status("GET", "/v2/tokens", caller)).toBe(expected);
  });

  test("creating a project returns the secret once; a taken id conflicts", async () => {
    const response = await call(api, "POST", "/v2/projects", owner, {
      id: "docs",
      name: "Docs",
      domain: "docs.example.test",
      visibility: "private",
    });
    expect(response.status).toBe(201);
    const created = (await json(response)).data as Json;
    expect(created).toMatchObject({
      id: "docs",
      visibility: "private",
      sqlEnabled: true,
      retentionDays: 90,
    });
    expect(String(created.secretKey)).toStartWith("sk_live_");
    expect(String(created.publicKey)).toStartWith("pk_live_");
    const again = await call(api, "POST", "/v2/projects", token("admin"), {
      id: "docs",
      name: "Docs",
      domain: "docs.example.test",
    });
    expect(again.status).toBe(409);
    const stored = await database.query<{ secret_key_hash: string }>(
      "SELECT secret_key_hash FROM projects WHERE id = 'docs'",
    );
    expect(stored.rows[0]?.secret_key_hash).toBe(await hasher.sha256(String(created.secretKey)));
  });

  test("rotating the secret key makes the old one stop working at ingest", async () => {
    const envelope = JSON.stringify(fixture);
    function ingest(secret: string) {
      return api.handle(
        new Request("http://localhost/v2/events", {
          method: "POST",
          headers: { authorization: `Bearer ${secret}` },
          body: envelope,
        }),
      );
    }
    const rotated = await json(
      await call(api, "POST", "/v2/projects/closed/keys", admin, { kind: "secret" }),
    );
    const key = String((rotated.data as Json).key);
    expect(key).toStartWith("sk_live_");
    expect((await ingest("sk_test_closed")).status).toBe(401);
    expect((await ingest(key)).status).not.toBe(401);
  });
});

describe("tokens", () => {
  test("create returns the token once, list never does, and revoke stops it", async () => {
    const created = await call(api, "POST", "/v2/tokens", owner, {
      name: "CI",
      scope: "read",
      projectIds: ["closed"],
    });
    expect(created.status).toBe(201);
    const data = (await json(created)).data as Json;
    const value = String(data.token);
    expect(value).toStartWith("at_live_");
    expect(await status("GET", "/v2/projects/closed", { token: value })).toBe(200);
    const listed = await json(await call(api, "GET", "/v2/tokens", owner));
    expect(JSON.stringify(listed)).not.toContain(value);
    expect((listed.data as Json[]).find((item) => item.id === data.id)).toMatchObject({
      lastUsedAt: now.toISOString(),
    });
    const deleted = await call(api, "DELETE", `/v2/tokens/${String(data.id)}`, owner);
    expect(deleted.status).toBe(204);
    expect(await status("GET", "/v2/projects/closed", { token: value })).toBe(401);
    expect(await status("DELETE", `/v2/tokens/${String(data.id)}`, owner)).toBe(404);
  });

  test("an expiry in the past is refused", async () => {
    expect(
      await status("POST", "/v2/tokens", owner, {
        name: "old",
        scope: "read",
        expiresAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toBe(400);
  });
});

describe("cron", () => {
  test.each([
    ["no secret", anonymous, 401],
    ["the wrong secret", { token: "not-the-cron-secret" }, 401],
    ["an admin session", owner, 401],
    ["the cron secret", { token: cronSecret }, 200],
  ])("%s", async (_, caller, expected) => {
    expect((await call(probe, "POST", "/v2/admin/jobs/rollup", caller)).status).toBe(expected);
  });
});

describe("ingest", () => {
  const envelope = fixture;

  function send(caller: Caller, visitor: string, seed: string) {
    const events = envelope.events.map((event, index) => ({
      ...event,
      visitor,
      session: `session-${visitor}`,
      id: `01928c3e-7a4b-7c1d-9f00-${seed.padStart(10, "0")}${String(index).padStart(2, "0")}`,
    }));
    return api.handle(
      new Request("http://localhost/v2/events", {
        method: "POST",
        headers: headersFor(caller, {
          "x-project-key": "pk_test_open",
          origin: "https://open.example.test",
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
          "accept-language": "en-GB",
        }),
        body: JSON.stringify({ ...envelope, events }),
      }),
    );
  }

  test("a signed-in admin's events and visitor are internal; an analyst's are not", async () => {
    expect((await send(owner, "visitor-owner", "91")).status).toBe(202);
    expect((await send(analyst, "visitor-analyst", "92")).status).toBe(202);
    const rows = await database.query<{ visitor_id: string; is_internal: boolean }>(
      "SELECT DISTINCT visitor_id, is_internal FROM events WHERE visitor_id IN ('visitor-owner', 'visitor-analyst') ORDER BY visitor_id",
    );
    expect(rows.rows).toEqual([
      { visitor_id: "visitor-analyst", is_internal: false },
      { visitor_id: "visitor-owner", is_internal: true },
    ]);
    const visitors = await database.query<{ is_internal: boolean }>(
      "SELECT is_internal FROM visitors WHERE fingerprint = 'visitor-owner'",
    );
    expect(visitors.rows).toEqual([{ is_internal: true }]);
  });
});
