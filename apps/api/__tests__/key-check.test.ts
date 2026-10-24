import { beforeAll, describe, expect, test } from "bun:test";

import { PGlite } from "@electric-sql/pglite";
import { ApiError, KeyStatus } from "@spoar/contract";
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

const now = new Date("2026-10-03T14:02:00.000Z");
const clock = fixedClock(now);
const database = new PGlite();
const hasher = webCryptoHasher();
const geo = openGeo([], []);
const stores = pgliteAccess(database);
const adapters = pgliteAdapters(database, clock);
const site = "https://noorderlicht.example";
const project = "noorderlicht";
const visitor = "8c4e1f0a-2b3c-4d5e-8f60-718293a4b5c6";
const session = "f1a2b3c4-d5e6-4f70-8a91-b2c3d4e5f607";
const read = { authorization: "Bearer at_test_read" };
const admin = { authorization: "Bearer at_test_admin" };
const chrome =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

const users: { [cookie: string]: SignedIn } = {};

async function sessions(headers: globalThis.Headers) {
  const match = /ra\.session_token=([\w-]+)/.exec(headers.get("cookie") ?? "");
  return match?.[1] ? (users[match[1]] ?? null) : null;
}

const api = createApp({
  engine: (logger) =>
    createEngine(
      { ...adapters, geo: geo.lookup, hasher, clock, logger, logs: stores.logs },
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
  ops: stores.ops,
  widget: {
    store: stores.widget,
    logs: stores.logs,
    keys: adapters.projects,
    limiter: adapters.limiter,
    reportsPerMinute: 1000,
  },
});

function call(path: string, headers: Headers = {}, init: { method?: string; body?: string } = {}) {
  return api.handle(new Request(`http://localhost${path}`, { ...init, headers }));
}

function post(path: string, body: Json, headers: Headers = admin) {
  return call(
    path,
    { ...headers, "content-type": "application/json" },
    { method: "POST", body: JSON.stringify(body) },
  );
}

function checked(path: string, schema: TSchema, json: unknown) {
  if (!Value.Check(schema, json)) {
    const [first] = Value.Errors(schema, json);
    throw new Error(`${path} does not match its schema: ${first?.path} ${first?.message}`);
  }
  return json as Json;
}

async function status(response: Response) {
  expect(response.status).toBe(200);
  const json = checked("key status", KeyStatus, await response.json());
  return json.data as Json;
}

async function failed(response: Response, code: number) {
  expect(response.status).toBe(code);
  checked("error", ApiError, await response.json());
}

function ingest() {
  return api.handle(
    new Request("http://localhost/v2/events", {
      method: "POST",
      headers: {
        "content-type": "text/plain;charset=UTF-8",
        origin: site,
        "user-agent": chrome,
        "x-forwarded-for": "81.2.69.160",
        "x-project-key": "pk_test_noord",
      },
      body: JSON.stringify({
        v: 1,
        sentAt: now.toISOString(),
        events: [
          {
            id: "01928c3e-0000-7000-8000-000000000001",
            name: "pageview",
            ts: "2026-10-03T14:01:30.000Z",
            visitor,
            session,
            page: { path: "/pricing", referrer: "https://www.google.com/" },
            props: {},
            context: { lang: "nl-NL", release: "2026.10.03-a1" },
            signals: 0,
          },
        ],
      }),
    }),
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
  await database.query(
    `INSERT INTO projects (id, name, domain, visibility, allowed_origins, public_key, secret_key_hash, public_key_created_at, secret_key_created_at)
     VALUES ($1, 'Noorderlicht', 'noorderlicht.example', 'public', $2, 'pk_test_noord', $3, '2026-10-01T09:00:00Z', '2026-09-20T09:00:00Z')`,
    [project, [site], await hasher.sha256("sk_test_noord")],
  );
  await database.query(
    "INSERT INTO api_tokens (id, name, token_hash, scope, project_ids) VALUES ('tok_read', 'read', $1, 'read', NULL), ('tok_admin', 'admin', $2, 'admin', NULL)",
    [await hasher.sha256("at_test_read"), await hasher.sha256("at_test_admin")],
  );
}, 20_000);

describe("key check", () => {
  test("a project never checked reports when its keys were generated and no check", async () => {
    const data = await status(await call(`/v2/projects/${project}/keys`, admin));
    expect(data).toEqual({
      publicKeyCreatedAt: "2026-10-01T09:00:00.000Z",
      secretKeyCreatedAt: "2026-09-20T09:00:00.000Z",
      check: null,
    });
  });

  test("a check with no events since the key was generated is waiting", async () => {
    const data = await status(await post(`/v2/projects/${project}/keys/check`, {}));
    expect(data.check).toEqual({
      checkedAt: now.toISOString(),
      state: "waiting",
      accepted: 0,
      rejected: 0,
      since: "2026-10-01T09:00:00.000Z",
      secretKey: "not-tested",
    });
  });

  test("accepted events make it connected and a secret key is compared by hash", async () => {
    expect((await ingest()).status).toBe(202);
    const matching = await status(
      await post(`/v2/projects/${project}/keys/check`, { secretKey: "sk_test_noord" }),
    );
    expect(matching.check).toMatchObject({ state: "connected", accepted: 1, secretKey: "matches" });
    const wrong = await status(
      await post(`/v2/projects/${project}/keys/check`, { secretKey: "sk_test_other" }),
    );
    expect(wrong.check).toMatchObject({ state: "connected", secretKey: "mismatch" });
  });

  test("the last check is stored and never holds the secret key", async () => {
    const data = await status(await call(`/v2/projects/${project}/keys`, admin));
    expect(data.check).toMatchObject({ state: "connected", secretKey: "mismatch" });
    expect(JSON.stringify(data)).not.toContain("sk_test");
    const stored = await database.query<{ key_check: Json }>(
      "SELECT key_check FROM projects WHERE id = $1",
      [project],
    );
    expect(JSON.stringify(stored.rows[0]?.key_check)).not.toContain("sk_test");
  });

  test("rotating a key stamps its creation time and clears the check", async () => {
    const rotated = await post(`/v2/projects/${project}/keys`, { kind: "public" });
    expect(rotated.status).toBe(200);
    const data = await status(await call(`/v2/projects/${project}/keys`, admin));
    expect(data.check).toBeNull();
    expect(data.secretKeyCreatedAt).toBe("2026-09-20T09:00:00.000Z");
    expect(Date.parse(String(data.publicKeyCreatedAt))).toBeGreaterThan(
      Date.parse("2026-10-01T09:00:00.000Z"),
    );
  });

  test("only admins may read or run a check, and an unknown project is 404", async () => {
    await failed(await call(`/v2/projects/${project}/keys`), 401);
    await failed(await call(`/v2/projects/${project}/keys`, read), 403);
    await failed(await post(`/v2/projects/${project}/keys/check`, {}, read), 403);
    await failed(await post("/v2/projects/missing/keys/check", {}), 404);
  });
});
