import { beforeAll, describe, expect, test } from "bun:test";

import { PGlite } from "@electric-sql/pglite";
import { createEngine, defaultEnrichers, defaultSignals, defaultStages } from "@spoar/engine";
import { fixedClock, memoryLogger } from "@spoar/engine/adapters/memory";
import { pgliteAccess, pgliteAdapters } from "@spoar/engine/adapters/pglite";
import { webCryptoHasher } from "@spoar/engine/adapters/system";
import { runMigrations } from "@spoar/engine/db/migrate";
import { migrationsDirectory, readMigrations } from "@spoar/engine/db/migration-files";

import { createApp } from "../src/app";
import { openGeo } from "../src/geo";
import { setupPrompt } from "../src/modules/mcp/prompts";

type Json = { [key: string]: any };

const now = new Date("2026-09-27T16:40:00.000Z");
const clock = fixedClock(now);
const database = new PGlite();
const hasher = webCryptoHasher();
const geo = openGeo([], []);
const stores = pgliteAccess(database);
const adapters = pgliteAdapters(database, clock);

const api = createApp({
  engine: (logger) =>
    createEngine(
      { ...adapters, geo: geo.lookup, hasher, clock, logger },
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
  access: {
    ...stores,
    sessions: async () => null,
    hasher,
    clock: () => clock.now(),
    cronSecret: null,
  },
  reads: {
    store: stores.reads,
    details: stores.details,
    feed: stores.feed,
    speed: stores.speed,
    issues: stores.issues,
    live: { waitMs: 50, streamMs: 200 },
    limiter: adapters.limiter,
    hasher,
    ipSecret: "x".repeat(48),
    publicLimit: 1000,
    clock: () => clock.now(),
  },
  query: {
    runner: stores.queries,
    log: stores.queryLog,
    saved: stores.savedQueries,
    limiter: adapters.limiter,
    perMinute: 30,
  },
  annotations: stores.annotations,
  authHandler: null,
});

let counter = 0;

async function rpc(method: string, params: Json = {}, token: string | null = "at_test_admin") {
  const headers: { [name: string]: string } = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await api.handle(
    new Request("http://localhost/v2/mcp", {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: ++counter, method, params }),
    }),
  );
  return { status: response.status, json: (await response.json()) as Json };
}

async function call(name: string, args: Json = {}, token = "at_test_admin") {
  const { json } = await rpc("tools/call", { name, arguments: args }, token);
  return json;
}

async function listed(token: string) {
  const { json } = await rpc("tools/list", {}, token);
  return (json.result.tools as Json[]).map((tool) => tool.name as string);
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
  await database.query(
    "INSERT INTO projects (id, name, domain, visibility, public_key, secret_key_hash) VALUES ('site', 'site', 'site.test', 'public', 'pk_test_site', $1)",
    [await hasher.sha256("sk_test_site")],
  );
  await database.query(
    "INSERT INTO api_tokens (id, name, token_hash, scope, project_ids) VALUES ('tok_admin', 'admin', $1, 'admin', NULL), ('tok_read', 'read', $2, 'read', NULL), ('tok_sql', 'sql', $3, 'sql', NULL)",
    [
      await hasher.sha256("at_test_admin"),
      await hasher.sha256("at_test_read"),
      await hasher.sha256("at_test_sql"),
    ],
  );
  await database.query(
    "INSERT INTO events (project_id, type, name, ts, path, country, visitor_id, session_id, fingerprint, meta) VALUES ('site', 'pageview', 'pageview', '2026-09-27T15:00:00Z', '/', 'NL', 'ada', 's1', 'f1', '{}')",
  );
});

describe("POST /v2/mcp", () => {
  test("refuses anonymous callers with the error envelope", async () => {
    const { status, json } = await rpc("initialize", {}, null);
    expect(status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  test("refuses GET", async () => {
    const response = await api.handle(new Request("http://localhost/v2/mcp"));
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
  });

  test("initializes with the protocol version and capabilities", async () => {
    const { status, json } = await rpc("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test", version: "0" },
    });
    expect(status).toBe(200);
    expect(json.result.protocolVersion).toBe("2025-06-18");
    expect(json.result.serverInfo.name).toBe("spoar");
    expect(Object.keys(json.result.capabilities)).toEqual(["tools", "prompts"]);
  });

  test("answers notifications with an empty 202", async () => {
    const response = await api.handle(
      new Request("http://localhost/v2/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer at_test_admin" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
      }),
    );
    expect(response.status).toBe(202);
  });

  test("refuses a batch", async () => {
    const response = await api.handle(
      new Request("http://localhost/v2/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer at_test_admin" },
        body: JSON.stringify([{ jsonrpc: "2.0", id: 1, method: "ping" }]),
      }),
    );
    expect(response.status).toBe(400);
    const json = (await response.json()) as Json;
    expect(json.error.code).toBe(-32600);
    expect(json.id).toBeNull();
  });

  test("pages a breakdown with cursor", async () => {
    const first = await call("breakdown", { project: "site", dimension: "page", limit: 1 });
    expect(first.result.structuredContent.data).toHaveLength(1);
    expect(first.result.structuredContent).toHaveProperty("nextCursor");
  });

  test("lists tools by token scope", async () => {
    const reads = [
      "list_projects",
      "get_project",
      "stats",
      "timeseries",
      "breakdown",
      "speed",
      "issues",
      "realtime",
      "key_status",
    ];
    expect(await listed("at_test_read")).toEqual(reads);
    expect(await listed("at_test_sql")).toEqual([...reads, "sql"]);
    expect(await listed("at_test_admin")).toEqual([
      ...reads,
      "create_project",
      "update_project",
      "add_origins",
      "rotate_key",
      "check_keys",
      "key_usage",
      "list_tokens",
      "revoke_token",
      "create_token",
    ]);
  });

  test("never lists a delete tool", async () => {
    const names = await listed("at_test_admin");
    expect(names.some((name) => /remove|delete/.test(name))).toBe(false);
  });

  test("tool schemas are JSON Schema objects without TypeBox symbols", async () => {
    const { json } = await rpc("tools/list");
    const tool = (json.result.tools as Json[]).find((entry) => entry.name === "create_project")!;
    expect(tool.inputSchema.type).toBe("object");
    expect(tool.inputSchema.required).toEqual(expect.arrayContaining(["id", "name", "domain"]));
    expect(tool.annotations.readOnlyHint).toBe(false);
  });

  test("reads stats through the stats route", async () => {
    const json = await call("stats", { project: "site", period: "7d" }, "at_test_read");
    expect(json.result.isError).toBeUndefined();
    expect(json.result.structuredContent.pageviews.value).toBe(1);
    expect(JSON.parse(json.result.content[0].text).pageviews.value).toBe(1);
  });

  test("passes filters as filter[dimension]", async () => {
    const hit = await call("breakdown", {
      project: "site",
      dimension: "country",
      filter: { country: "NL" },
    });
    const miss = await call("breakdown", {
      project: "site",
      dimension: "country",
      filter: { country: "DE" },
    });
    expect(hit.result.structuredContent.data).toHaveLength(1);
    expect(miss.result.structuredContent.data).toHaveLength(0);
  });

  test("refuses an unlisted tool as invalid params", async () => {
    const json = await call("rotate_key", { project: "site", kind: "public" }, "at_test_read");
    expect(json.error.code).toBe(-32602);
    expect(json.error.message).toContain("Unknown tool");
  });

  test("validates arguments against the contract schema", async () => {
    const json = await call("rotate_key", { project: "site", kind: "both" });
    expect(json.error.code).toBe(-32602);
    expect(json.error.message).toContain("kind");
  });

  test("turns an API error into an error result", async () => {
    const json = await call("get_project", { project: "nope" });
    expect(json.result.isError).toBe(true);
    expect(json.result.content[0].text).toContain("NOT_FOUND");
  });

  test("create_project adds localhost origins and says so", async () => {
    const json = await call("create_project", {
      id: "blog",
      name: "Blog",
      domain: "blog.test",
      devPort: 4321,
    });
    const data = json.result.structuredContent;
    expect(data.allowedOrigins).toEqual([
      "https://blog.test",
      "https://www.blog.test",
      "http://localhost:4321",
      "http://127.0.0.1:4321",
    ]);
    expect(data.secretKey).toStartWith("sk_live_");
    expect(data.note).toContain("http://localhost:4321");
  });

  test("create_project keeps given origins and adds the default dev ports", async () => {
    const json = await call("create_project", {
      id: "shop",
      name: "Shop",
      domain: "shop.test",
      allowedOrigins: ["https://shop.test"],
    });
    expect(json.result.structuredContent.allowedOrigins).toEqual([
      "https://shop.test",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:4321",
      "http://127.0.0.1:4321",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ]);
  });

  test("rotate_key warns that the old key stopped working", async () => {
    const json = await call("rotate_key", { project: "blog", kind: "secret" });
    expect(json.result.structuredContent.key).toStartWith("sk_live_");
    expect(json.result.structuredContent.note).toContain("stopped working now");
    expect(json.result.structuredContent.note).toContain("SPOAR_SECRET");
  });

  test("check_keys explains waiting and verifies the secret by hash", async () => {
    const json = await call("check_keys", { project: "blog", secretKey: "sk_live_wrong" });
    expect(json.result.structuredContent.check.state).toBe("waiting");
    expect(json.result.structuredContent.check.secretKey).toBe("mismatch");
    expect(json.result.structuredContent.note).toContain("no pageview has arrived");
  });

  test("sql runs for the sql scope only", async () => {
    const ok = await call(
      "sql",
      { project: "site", sql: "SELECT count(*) AS views FROM events" },
      "at_test_sql",
    );
    expect(ok.result.structuredContent.rows).toEqual([[1]]);
    const refused = await call("sql", { project: "site", sql: "SELECT 1" }, "at_test_admin");
    expect(refused.error.message).toContain("Unknown tool");
  });

  test("timeseries reads one metric per day", async () => {
    const json = await call("timeseries", { project: "site", period: "7d", metric: "pageviews" });
    const points = json.result.structuredContent.data as Json[];
    expect(points.reduce((sum, point) => sum + point.value, 0)).toBe(1);
  });

  test("add_origins merges with the existing list", async () => {
    const json = await call("add_origins", {
      project: "shop",
      origins: ["https://preview.shop.test", "https://shop.test"],
    });
    expect(json.result.structuredContent.allowedOrigins).toEqual([
      "https://shop.test",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:4321",
      "http://127.0.0.1:4321",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://preview.shop.test",
    ]);
    expect(json.result.structuredContent.note).toBeUndefined();
  });

  test("add_origins warns when the project allowed every origin", async () => {
    const json = await call("add_origins", { project: "site", origins: ["https://site.test"] });
    expect(json.result.structuredContent.allowedOrigins).toEqual(["https://site.test"]);
    expect(json.result.structuredContent.note).toContain("every origin");
  });

  test("key_usage shows a fresh project has not sent yet", async () => {
    const json = await call("key_usage", { project: "blog" });
    expect(json.result.structuredContent.public.lastUsedAt).toBeNull();
    expect(json.result.structuredContent.note).toContain("add_origins");
  });

  test("create_token answers with the value once, list_tokens never shows it, revoke_token stops it", async () => {
    const created = await call("create_token", { name: "ci", scope: "read" });
    const token = created.result.structuredContent.token as string;
    const id = created.result.structuredContent.id as string;
    expect(token).toStartWith("at_live_");
    const list = await call("list_tokens");
    const entry = (list.result.structuredContent.data as Json[]).find((row) => row.id === id)!;
    expect(entry.name).toBe("ci");
    expect(JSON.stringify(list)).not.toContain(token);
    expect(await listed(token)).toContain("stats");
    const revoked = await call("revoke_token", { token: id });
    expect(revoked.result.structuredContent.ok).toBe(true);
    expect(revoked.result.structuredContent.note).toContain("stopped working");
    const after = await rpc("tools/list", {}, token);
    expect(after.status).toBe(401);
  });

  test("serves the setup prompt", async () => {
    const list = await rpc("prompts/list");
    expect(list.json.result.prompts.map((prompt: Json) => prompt.name)).toEqual(["setup"]);
    const { json } = await rpc("prompts/get", {
      name: "setup",
      arguments: { domain: "blog.test" },
    });
    const text = json.result.messages[0].content.text as string;
    expect(text).toContain("blog.test");
    expect(text).toContain("NEXT_PUBLIC_SPOAR_CONFIG");
    expect(text).toContain("PUBLIC_SPOAR_CONFIG");
    expect(text).toContain("VITE_SPOAR_CONFIG");
    expect(text).toContain("check_keys");
    expect(text).toBe(setupPrompt.render({ domain: "blog.test" }));
  });

  test("answers an unknown method with -32601", async () => {
    const { json } = await rpc("resources/list");
    expect(json.error.code).toBe(-32601);
  });
});
