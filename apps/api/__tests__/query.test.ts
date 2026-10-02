import { beforeAll, describe, expect, test } from "bun:test";

import { PGlite } from "@electric-sql/pglite";
import {
  QueryHistory,
  QueryPlan,
  QueryResult,
  QuerySchema,
  SavedQueryList,
  SavedQueryResponse,
} from "@spoar/contract";
import { createEngine, defaultEnrichers, defaultSignals, defaultStages } from "@spoar/engine";
import { fixedClock, memoryLogger } from "@spoar/engine/adapters/memory";
import { pgliteAccess, pgliteAdapters } from "@spoar/engine/adapters/pglite";
import { webCryptoHasher } from "@spoar/engine/adapters/system";
import { runMigrations } from "@spoar/engine/db/migrate";
import { migrationsDirectory, readMigrations } from "@spoar/engine/db/migration-files";
import type { TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

import type { SignedIn } from "../src/access/types";
import { createApp } from "../src/app";
import { openGeo } from "../src/geo";

type Json = { [key: string]: unknown };
type Headers = { [name: string]: string };

const now = new Date("2026-09-28T12:00:00.000Z");
const clock = fixedClock(now);
const database = new PGlite();
const hasher = webCryptoHasher();
const geo = openGeo([], []);
const stores = pgliteAccess(database);
const users: { [id: string]: SignedIn } = {};
const countByProject = "select project_id, count(*) as n from events group by 1 order by 1";

async function sessions(headers: globalThis.Headers) {
  const match = /ra\.session_token=([\w-]+)/.exec(headers.get("cookie") ?? "");
  return match?.[1] ? (users[match[1]] ?? null) : null;
}

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
  dashboardOrigin: null,
  docsBase: "https://api.example.test/v2/openapi",
  geo: { city: geo.city, asn: geo.asn, loadMs: geo.loadMs },
  access: { ...stores, sessions, hasher, clock: () => clock.now(), cronSecret: null },
  reads: {
    store: stores.reads,
    details: stores.details,
    feed: stores.feed,
    speed: stores.speed,
    issues: stores.issues,
    live: { waitMs: 50, streamMs: 200 },
    limiter: pgliteAdapters(database, clock).limiter,
    hasher,
    ipSecret: "x".repeat(48),
    publicLimit: 1000,
    clock: () => clock.now(),
  },
  query: {
    runner: stores.queries,
    log: stores.queryLog,
    saved: stores.savedQueries,
    limiter: pgliteAdapters(database, clock).limiter,
    perMinute: 10,
  },
  annotations: stores.annotations,
  authHandler: null,
});

function as(user: string): Headers {
  return { cookie: `ra.session_token=${user}` };
}

function bearer(name: string): Headers {
  return { authorization: `Bearer at_test_${name}` };
}

function post(path: string, body: Json, headers: Headers = {}) {
  return api.handle(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

function send(method: string, path: string, body: Json | null, headers: Headers = {}) {
  return api.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: { "content-type": "application/json", ...headers },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
  );
}

function get(path: string, headers: Headers = {}) {
  return api.handle(new Request(`http://localhost${path}`, { headers }));
}

async function valid(response: Response, schema: TSchema) {
  expect(response.status).toBe(200);
  const json: unknown = await response.json();
  if (!Value.Check(schema, json)) {
    const [first] = Value.Errors(schema, json);
    throw new Error(`Response does not match its schema: ${first?.path} ${first?.message}`);
  }
  return json as Json;
}

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

async function addToken(name: string, scope: string, projectIds: string[] | null) {
  await database.query(
    "INSERT INTO api_tokens (id, name, token_hash, scope, project_ids) VALUES ($1, $1, $2, $3, $4)",
    [`tok_${name}`, await hasher.sha256(`at_test_${name}`), scope, projectIds],
  );
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
  await database.exec(`
    INSERT INTO auth_organization (id, name, slug) VALUES ('org_main', 'main', 'main');
    INSERT INTO projects (id, name, domain, visibility, sql_enabled, public_key, secret_key_hash, org_id) VALUES
      ('site', 'site', 'site.test', 'public', true, 'pk_test_site', 'x', 'org_main'),
      ('closed', 'closed', 'closed.test', 'private', true, 'pk_test_closed', 'y', 'org_main'),
      ('nosql', 'nosql', 'nosql.test', 'private', false, 'pk_test_nosql', 'z', 'org_main');
    INSERT INTO events (project_id, type, name, ts, path, host, visitor_id, session_id, fingerprint, meta) VALUES
      ('site', 'pageview', 'pageview', '2026-09-20T10:00:00Z', '/', 'site.test', 'v1', 's1', 'a1', '{}'),
      ('site', 'pageview', 'pageview', '2026-09-26T10:00:00Z', '/pricing', 'site.test', 'v1', 's2', 'a2', '{}'),
      ('closed', 'pageview', 'pageview', '2026-09-26T10:00:00Z', '/', 'closed.test', 'v2', 's3', 'b1', '{}'),
      ('nosql', 'pageview', 'pageview', '2026-09-26T10:00:00Z', '/', 'nosql.test', 'v3', 's4', 'c1', '{}');
  `);
  await addUser("owner", "owner", null);
  await addUser("analyst", "analyst", ["site", "closed"]);
  await addUser("viewer", "viewer", ["site"]);
  await addUser("limited", "analyst", ["nosql"]);
  await addToken("sql", "sql", ["site"]);
  await addToken("read", "read", null);
  await addToken("burst", "sql", ["site"]);
});

describe("who may run SQL", () => {
  test("never anonymous callers, viewers or read tokens, even on a public project", async () => {
    const body = { sql: "select 1 as one" };
    expect((await post("/v2/projects/site/query", body)).status).toBe(401);
    expect((await post("/v2/projects/site/query", body, as("viewer"))).status).toBe(403);
    expect((await post("/v2/projects/site/query", body, bearer("read"))).status).toBe(403);
    expect((await post("/v2/projects/closed/query", body)).status).toBe(404);
    expect((await post("/v2/query", body)).status).toBe(401);
  });

  test("sqlEnabled off blocks everyone but the owner", async () => {
    const body = { sql: countByProject };
    expect((await post("/v2/projects/nosql/query", body, as("limited"))).status).toBe(403);
    expect((await post("/v2/query", body, as("limited"))).status).toBe(403);
    const owner = await valid(
      await post("/v2/projects/nosql/query", body, as("owner")),
      QueryResult,
    );
    expect(owner.rows).toEqual([["nosql", 1]]);
  });
});

describe("POST /v2/projects/:project/query", () => {
  test("runs against the views of that project only", async () => {
    const result = await valid(
      await post("/v2/projects/site/query", { sql: countByProject }, bearer("sql")),
      QueryResult,
    );
    expect(result).toMatchObject({
      columns: ["project_id", "n"],
      rows: [["site", 2]],
      rowCount: 1,
      truncated: false,
    });
  });

  test("binds :from, :to and :project from params", async () => {
    const result = await valid(
      await post(
        "/v2/projects/site/query",
        {
          sql: "select path, :project as project from events where ts >= :from and ts < :to",
          params: {
            from: "2026-09-25T00:00:00.000Z",
            to: "2026-09-28T00:00:00.000Z",
            project: "site",
          },
        },
        as("analyst"),
      ),
      QueryResult,
    );
    expect(result.rows).toEqual([["/pricing", "site"]]);
  });

  test("answers CSV for Accept: text/csv", async () => {
    const response = await post(
      "/v2/projects/site/query",
      { sql: "select path, 'a,b' as note from events order by ts" },
      { ...as("analyst"), accept: "text/csv" },
    );
    expect(response.headers.get("content-type")).toStartWith("text/csv");
    expect(await response.text()).toBe('path,note\n/,"a,b"\n/pricing,"a,b"\n');
  });

  test("a rejected or failing query is a 400 with the reason", async () => {
    const blocked = await post(
      "/v2/projects/site/query",
      { sql: "delete from events" },
      as("analyst"),
    );
    expect(blocked.status).toBe(400);
    expect(((await blocked.json()) as { error: Json }).error).toMatchObject({
      code: "VALIDATION_FAILED",
      message: "Only SELECT and WITH queries can run",
    });
    const failing = await post(
      "/v2/projects/site/query",
      { sql: "select nope from events" },
      as("analyst"),
    );
    expect(failing.status).toBe(400);
  });
});

describe("POST /v2/query", () => {
  test("covers every project the caller may query", async () => {
    const analyst = await valid(
      await post("/v2/query", { sql: countByProject }, as("analyst")),
      QueryResult,
    );
    expect(analyst.rows).toEqual([
      ["closed", 1],
      ["site", 2],
    ]);
    const owner = await valid(
      await post("/v2/query", { sql: countByProject }, as("owner")),
      QueryResult,
    );
    expect(owner.rows).toEqual([
      ["closed", 1],
      ["nosql", 1],
      ["site", 2],
    ]);
  });

  test("explain estimates without running", async () => {
    const plan = await valid(
      await post("/v2/query/explain", { sql: "select * from events" }, as("analyst")),
      QueryPlan,
    );
    expect((plan.data as Json).totalCost).toBeGreaterThan(0);
  });

  test("is rate limited per caller", async () => {
    const statuses: number[] = [];
    for (let run = 0; run < 11; run += 1) {
      statuses.push((await post("/v2/query", { sql: "select 1" }, bearer("burst"))).status);
    }
    expect(statuses.slice(0, 10).every((status) => status === 200)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});

describe("GET /v2/query/schema", () => {
  test("lists the nine views for signed-in callers and tokens", async () => {
    expect((await get("/v2/query/schema")).status).toBe(401);
    const schema = await valid(await get("/v2/query/schema", bearer("sql")), QuerySchema);
    expect((schema.data as Json[]).map((view) => view.name)).toEqual([
      "events",
      "pageviews",
      "sessions",
      "visitors",
      "people",
      "web_vitals",
      "issues",
      "daily",
      "daily_vitals",
    ]);
  });
});

describe("GET /v2/queries/history", () => {
  test("your own runs, blocked ones included; the owner sees everyone's", async () => {
    expect((await get("/v2/queries/history")).status).toBe(401);
    const analyst = await valid(await get("/v2/queries/history", as("analyst")), QueryHistory);
    const runs = analyst.data as Json[];
    expect(runs.every((run) => (run.actor as Json).id === "analyst")).toBe(true);
    expect(runs).toContainEqual(
      expect.objectContaining({ sql: "delete from events", blocked: true, rowCount: null }),
    );
    expect(runs).toContainEqual(
      expect.objectContaining({
        sql: "select nope from events",
        blocked: false,
        error: 'column "nope" does not exist',
      }),
    );
    const owner = await valid(await get("/v2/queries/history", as("owner")), QueryHistory);
    const actors = new Set((owner.data as Json[]).map((run) => String((run.actor as Json).id)));
    expect([...actors].sort((a, b) => a.localeCompare(b))).toEqual([
      "analyst",
      "owner",
      "tok_burst",
      "tok_sql",
    ]);
  });
});

describe("saved queries", () => {
  test("shared by everyone who may run SQL, changed only by their creator or the owner", async () => {
    expect((await get("/v2/queries")).status).toBe(401);
    expect((await get("/v2/queries", as("viewer"))).status).toBe(403);
    const created = await send(
      "POST",
      "/v2/queries",
      { name: "Views per path", sql: "select path, count(*) from events group by 1", chart: "bar" },
      as("analyst"),
    );
    expect(created.status).toBe(201);
    expect(Value.Check(SavedQueryResponse, await created.json())).toBe(true);
    const list = await valid(await get("/v2/queries", bearer("sql")), SavedQueryList);
    const [first] = list.data as Json[];
    expect(first).toMatchObject({
      name: "Views per path",
      chart: "bar",
      description: null,
      createdBy: { kind: "user", id: "analyst" },
    });
    const id = String(first?.id);
    const one = await valid(await get(`/v2/queries/${id}`, as("owner")), SavedQueryResponse);
    expect((one.data as Json).id).toBe(id);
    expect((await send("PATCH", `/v2/queries/${id}`, { name: "x" }, bearer("sql"))).status).toBe(
      403,
    );
    const renamed = await valid(
      await send("PATCH", `/v2/queries/${id}`, { name: "Views by path" }, as("analyst")),
      SavedQueryResponse,
    );
    expect((renamed.data as Json).name).toBe("Views by path");
    expect((await send("DELETE", `/v2/queries/${id}`, null, as("owner"))).status).toBe(204);
    expect((await get(`/v2/queries/${id}`, as("owner"))).status).toBe(404);
  });

  test("the SQL passes the same checks as a run", async () => {
    const response = await send(
      "POST",
      "/v2/queries",
      { name: "Bad", sql: "drop table events" },
      as("analyst"),
    );
    expect(response.status).toBe(400);
  });
});
