import { beforeAll, describe, expect, test } from "bun:test";

import { PGlite } from "@electric-sql/pglite";
import { AdminMetrics, JobResult } from "@remcostoeten/analytics-contract";
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
import { Value } from "@sinclair/typebox/value";

import { createApp } from "../src/app";
import { openGeo } from "../src/geo";

type Json = { [key: string]: unknown };

const now = new Date("2026-09-27T16:40:00.000Z");
const clock = fixedClock(now);
const database = new PGlite();
const hasher = webCryptoHasher();
const geo = openGeo([], []);
const stores = pgliteAccess(database);
const cron = { authorization: "Bearer cron-secret-for-tests" };
const admin = { authorization: "Bearer at_test_admin" };
const reader = { authorization: "Bearer at_test_reader" };
const cruxCalls: { url: string; init: RequestInit }[] = [];

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
  access: {
    ...stores,
    sessions: async () => null,
    hasher,
    clock: () => clock.now(),
    cronSecret: "cron-secret-for-tests",
  },
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
    perMinute: 30,
  },
  authHandler: null,
  ops: stores.ops,
  crux: {
    key: "crux-key-for-tests",
    send: async (url, init) => {
      cruxCalls.push({ url, init });
      if (typeof init.body !== "string") throw new Error("the body is not a string");
      const origin = (JSON.parse(init.body) as { origin: string }).origin;
      if (origin !== "https://alpha.test") return new Response(null, { status: 404 });
      return Response.json({
        record: {
          metrics: {
            largest_contentful_paint: { percentiles: { p75: 2000 } },
            cumulative_layout_shift: { percentiles: { p75: "0.05" } },
          },
        },
      });
    },
  },
});

function post(path: string, headers: { [name: string]: string } = cron) {
  return api.handle(new Request(`http://localhost/v2${path}`, { method: "POST", headers }));
}

async function metrics() {
  const response = await api.handle(
    new Request("http://localhost/v2/admin/metrics", { headers: admin }),
  );
  expect(response.status).toBe(200);
  const json: unknown = await response.json();
  if (!Value.Check(AdminMetrics, json)) {
    const [first] = Value.Errors(AdminMetrics, json);
    throw new Error(`metrics do not match the schema: ${first?.path} ${first?.message}`);
  }
  return json.data;
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
    `INSERT INTO projects (id, name, domain, public_key, secret_key_hash, allowed_origins, retention_days) VALUES
      ('alpha', 'alpha', 'alpha.test', 'pk_test_alpha', 'x', '{https://alpha.test}', 90),
      ('beta', 'beta', 'beta.test', 'pk_test_beta', 'y', '{https://beta.test}', 90)`,
  );
  await database.query(
    "INSERT INTO api_tokens (id, name, token_hash, scope, project_ids) VALUES ('tok_admin', 'admin', $1, 'admin', NULL), ('tok_reader', 'reader', $2, 'read', NULL)",
    [await hasher.sha256("at_test_admin"), await hasher.sha256("at_test_reader")],
  );
  for (let index = 0; index < 20; index += 1) {
    await database.query(
      `INSERT INTO web_vitals (id, project_id, ts, metric, value, rating, path, device)
       VALUES ($1, 'alpha', $2, 'lcp', $3, 'good', '/', 'mobile')`,
      [`lcp-${index}`, "2026-09-20T10:00:00Z", 2000 + index * 100],
    );
  }
  await database.query(
    `INSERT INTO events (project_id, type, name, ts, path, bot_score, bot_reasons) VALUES
      ('alpha', 'pageview', 'pageview', '2026-01-01T00:00:00Z', '/old', 0, '{}'),
      ('alpha', 'pageview', 'pageview', '2026-09-27T12:00:00Z', '/bot', 80, '{ua_crawler}'),
      ('alpha', 'pageview', 'pageview', '2026-09-27T12:00:00Z', '/new', 0, '{}')`,
  );
});

describe("GET /v2/admin/metrics", () => {
  test("needs an admin", async () => {
    const response = await api.handle(
      new Request("http://localhost/v2/admin/metrics", { headers: reader }),
    );
    expect(response.status).toBe(403);
  });

  test("counts ingest requests and bot events over the last day", async () => {
    const ingested = await api.handle(
      new Request("http://localhost/v2/events", {
        method: "POST",
        headers: {
          "content-type": "text/plain;charset=UTF-8",
          origin: "https://alpha.test",
          "user-agent": "curl/8.4.0",
          "x-project-key": "pk_test_alpha",
        },
        body: JSON.stringify({
          v: 1,
          sentAt: "2026-09-27T16:39:00.000Z",
          events: [
            {
              id: "01928c3e-7a4b-7c1d-9f00-000000000001",
              name: "pageview",
              ts: "2026-09-27T16:39:00.000Z",
              visitor: "v1",
              session: "s1",
              page: { path: "/" },
              props: {},
            },
            { name: "broken" },
          ],
        }),
      }),
    );
    expect(ingested.status).toBe(202);
    const data = await metrics();
    expect(data.ingest.last24h).toEqual({
      requests: 1,
      accepted: 1,
      duplicates: 0,
      rejected: 1,
      rateLimited: 0,
    });
    expect(data.bots.last24h.scoredAbove50).toBe(2);
    expect(data.bots.last24h.topReasons.map((row) => row.reason)).toContain("ua_crawler");
  });
});

describe("jobs", () => {
  test("rollup runs the session bot signals over the previous UTC day, once", async () => {
    for (let index = 0; index < 12; index += 1) {
      await database.query(
        `INSERT INTO events (project_id, type, name, ts, path, visitor_id, session_id, bot_score, bot_reasons)
         VALUES ('alpha', 'pageview', 'pageview', $1, '/', 'fast', 'fast-session', 0, '{}')`,
        [new Date(Date.parse("2026-09-26T10:00:00Z") + index * 700).toISOString()],
      );
    }
    const first = await post("/admin/jobs/rollup");
    expect(first.status).toBe(200);
    const again = await post("/admin/jobs/rollup");
    expect(again.status).toBe(200);
    const rows = await database.query<{ bot_score: number; bot_reasons: string[] }>(
      "SELECT DISTINCT bot_score, bot_reasons FROM events WHERE session_id = 'fast-session'",
    );
    expect(rows.rows).toEqual([{ bot_score: 50, bot_reasons: ["session_velocity"] }]);
    const data = await metrics();
    expect(data.jobs).toContainEqual(
      expect.objectContaining({ job: "rollup", status: "ok", rowsWritten: 12 }),
    );
  });

  test("cleanup deletes events past the project's retention and is recorded", async () => {
    const response = await post("/admin/jobs/cleanup");
    expect(response.status).toBe(200);
    const json: unknown = await response.json();
    expect(Value.Check(JobResult, json)).toBe(true);
    expect((json as { data: Json }).data).toMatchObject({ job: "cleanup", rowsDeleted: 1 });
    const left = await database.query<{ path: string }>(
      "SELECT path FROM events WHERE path IN ('/old', '/new') ORDER BY path",
    );
    expect(left.rows).toEqual([{ path: "/new" }]);
    const data = await metrics();
    expect(data.jobs).toContainEqual(
      expect.objectContaining({ job: "cleanup", status: "ok", rowsDeleted: 1 }),
    );
  });

  test("crux compares p75 with the Chrome UX Report and flags gaps over 25%", async () => {
    const response = await post("/admin/jobs/crux");
    expect(response.status).toBe(200);
    expect(((await response.json()) as { data: Json }).data).toMatchObject({
      job: "crux",
      rowsWritten: 8,
    });
    const [call] = cruxCalls;
    if (!call) throw new Error("the Chrome UX Report was not called");
    expect((call.init.headers as { [name: string]: string })["x-goog-api-key"]).toBe(
      "crux-key-for-tests",
    );
    const data = await metrics();
    expect(data.speedChecks[0]).toEqual({
      project: "alpha",
      metric: "lcp",
      checkedAt: now.toISOString(),
      ours: 3425,
      crux: 2000,
      gap: 0.713,
      flagged: true,
    });
    expect(data.speedChecks).toContainEqual(
      expect.objectContaining({ project: "beta", metric: "lcp", crux: null, flagged: false }),
    );
    expect(data.speedChecks).toContainEqual(
      expect.objectContaining({ project: "alpha", metric: "cls", ours: null, crux: 0.05 }),
    );
  });

  test("a job that cannot run answers 503 and is recorded as failed", async () => {
    expect((await post("/admin/jobs/alerts")).status).toBe(503);
    const data = await metrics();
    expect(data.jobs).toContainEqual(
      expect.objectContaining({
        job: "alerts",
        status: "failed",
        message: "Alerts are off: alerts() is not in analytics.config.ts",
      }),
    );
  });
});
