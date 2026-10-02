import { beforeAll, describe, expect, test } from "bun:test";

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

import { createApp } from "../src/app";
import { openGeo } from "../src/geo";

const now = new Date("2026-09-27T16:40:00.000Z");
const clock = fixedClock(now);
const database = new PGlite();
const hasher = webCryptoHasher();
const geo = openGeo([], []);
const stores = pgliteAccess(database);
const internalSecret = "sk_test_internal";

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
  geo: geo.status,
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
  annotations: stores.annotations,
  authHandler: async () => {
    throw new Error("Session store exploded");
  },
  internalSecret,
});

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
