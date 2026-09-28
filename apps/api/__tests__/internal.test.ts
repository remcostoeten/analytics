import { beforeAll, describe, expect, test } from "bun:test";

import { PGlite } from "@electric-sql/pglite";
import { JobResult } from "@remcostoeten/analytics-contract";
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
const internalSecret = "sk_test_internal";
const delivered: { url: string; init: RequestInit }[] = [];
let webhookStatus = 200;

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
  authHandler: async () => {
    throw new Error("Session store exploded");
  },
  alerts: {
    url: "https://hooks.example.test/alerts",
    secret: "whsec-for-tests",
    send: async (url, init) => {
      delivered.push({ url, init });
      return new Response(null, { status: webhookStatus });
    },
  },
  internalSecret,
});

function job() {
  return api.handle(
    new Request("http://localhost/v2/admin/jobs/alerts", { method: "POST", headers: cron }),
  );
}

async function sign(body: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode("whsec-for-tests"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
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
    `INSERT INTO projects (id, name, domain, public_key, secret_key_hash, allowed_origins) VALUES
      ('internal', 'internal', 'api.internal', 'pk_test_internal', $1, '{}')`,
    [await hasher.sha256(internalSecret)],
  );
});

describe("internal errors", () => {
  test("an INTERNAL error answers 500 and is captured into the internal project", async () => {
    const response = await api.handle(new Request("http://localhost/v2/auth/sign-in/social"));
    expect(response.status).toBe(500);
    const json = (await response.json()) as { error: { message: string } };
    expect(json.error.message).toBe("Internal error");
    const issues = await database.query<{ project_id: string; title: string }>(
      "SELECT project_id, title FROM issues",
    );
    expect(issues.rows).toEqual([
      { project_id: "internal", title: "Error: Session store exploded" },
    ]);
  });
});

describe("POST /v2/admin/jobs/alerts", () => {
  test("needs the cron secret", async () => {
    const denied = await api.handle(
      new Request("http://localhost/v2/admin/jobs/alerts", { method: "POST" }),
    );
    expect(denied.status).toBe(401);
  });

  test("a failed delivery keeps the alerts pending", async () => {
    webhookStatus = 502;
    expect((await job()).status).toBe(503);
    webhookStatus = 200;
    delivered.length = 0;
  });

  test("posts new issues once, signed, then nothing until a regression", async () => {
    const response = await job();
    expect(response.status).toBe(200);
    const json: unknown = await response.json();
    expect(Value.Check(JobResult, json)).toBe(true);
    expect((json as { data: Json }).data).toMatchObject({
      job: "alerts",
      status: "ok",
      rowsWritten: 1,
    });
    const [sent] = delivered;
    if (!sent) throw new Error("nothing delivered");
    expect(sent.url).toBe("https://hooks.example.test/alerts");
    const payload = sent.init.body;
    if (typeof payload !== "string") throw new Error("the body is not a string");
    const headers = sent.init.headers as { [name: string]: string };
    expect(headers["x-analytics-signature"]).toBe(`sha256=${await sign(payload)}`);
    expect(JSON.parse(payload)).toMatchObject({
      type: "issues.alert",
      alerts: [
        {
          kind: "new",
          project: "internal",
          issue: { title: "Error: Session store exploded", count: 1 },
        },
      ],
    });
    const again = await job();
    expect(((await again.json()) as { data: Json }).data).toMatchObject({ rowsWritten: 0 });
    expect(delivered).toHaveLength(1);
  });
});
