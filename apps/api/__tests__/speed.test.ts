import { beforeAll, describe, expect, test } from "bun:test";

import { PGlite } from "@electric-sql/pglite";
import {
  JobResult,
  SpeedElementList,
  SpeedResponse,
  SpeedRouteList,
  SpeedTimeseries,
} from "@remcostoeten/analytics-contract";
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
import type { TSchema } from "@sinclair/typebox";
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
const admin = { authorization: "Bearer at_test_admin" };
const week = "from=2026-09-20T00:00:00.000Z&to=2026-09-28T00:00:00.000Z";
const cron = { authorization: "Bearer cron-secret-for-tests" };

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
});

function call(path: string, headers: { [name: string]: string } = {}) {
  return api.handle(new Request(`http://localhost${path}`, { headers }));
}

async function body(path: string, schema: TSchema, headers: { [name: string]: string } = {}) {
  const response = await call(path, headers);
  expect(response.status).toBe(200);
  const json: unknown = await response.json();
  if (!Value.Check(schema, json)) {
    const [first] = Value.Errors(schema, json);
    throw new Error(`${path} does not match its schema: ${first?.path} ${first?.message}`);
  }
  return json as Json;
}

async function vitals(
  project: string,
  metric: string,
  value: number,
  count: number,
  extra: { route?: string; device?: string; selector?: string; day?: string } = {},
) {
  const rating =
    metric === "lcp"
      ? value <= 2500
        ? "good"
        : value <= 4000
          ? "needs-improvement"
          : "poor"
      : "good";
  await database.query(
    `INSERT INTO web_vitals (id, project_id, ts, metric, value, rating, route, path, device, selector)
     SELECT $1 || g, $2, $3::timestamptz, $4, $5, $6, $7, $7, $8, $9 FROM generate_series(1, $10) g`,
    [
      `${project}-${metric}-${value}-${extra.route ?? "/"}-${extra.device ?? "mobile"}-`,
      project,
      `${extra.day ?? "2026-09-24"}T10:00:00Z`,
      metric,
      value,
      rating,
      extra.route ?? "/",
      extra.device ?? "mobile",
      extra.selector ?? null,
      count,
    ],
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
    `INSERT INTO projects (id, name, domain, visibility, public_key, secret_key_hash) VALUES
      ('alpha', 'alpha', 'alpha.test', 'public', 'pk_test_alpha', 'x'),
      ('closed', 'closed', 'closed.test', 'private', 'pk_test_closed', 'z')`,
  );
  await database.query(
    "INSERT INTO api_tokens (id, name, token_hash, scope, project_ids) VALUES ('tok_admin', 'admin', $1, 'admin', NULL)",
    [await hasher.sha256("at_test_admin")],
  );
  await vitals("alpha", "lcp", 2710, 20);
  await vitals("alpha", "inp", 140, 20);
  await vitals("alpha", "cls", 0.06, 20);
  await vitals("alpha", "fcp", 1520, 20);
  await vitals("alpha", "ttfb", 420, 20);
  await vitals("alpha", "lcp", 5000, 20, { route: "/slow", selector: "main>img.hero" });
  await vitals("alpha", "lcp", 900, 5, { device: "desktop" });
  await vitals("closed", "lcp", 1000, 20);
});

describe("GET /v2/projects/:project/speed", () => {
  test("scores match the hand calculation", async () => {
    const speed = await body(
      `/v2/projects/alpha/speed?${week}&device=mobile&filter[route]=/`,
      SpeedResponse,
    );
    expect(speed).toMatchObject({
      data: {
        score: 94,
        rating: "good",
        samples: 20,
        metrics: {
          lcp: {
            value: 2710,
            rating: "needs-improvement",
            score: 86,
            samples: 20,
            shares: { good: 0, needsImprovement: 1, poor: 0 },
          },
          inp: { value: 140, rating: "good", score: 96 },
          cls: { value: 0.06, rating: "good", score: 98 },
          fcp: { value: 1520, rating: "good", score: 96 },
          ttfb: { value: 420, rating: "good", score: null },
        },
      },
      percentile: 75,
      device: "mobile",
      traffic: "human",
    });
  });

  test("hides values under 20 samples", async () => {
    const speed = await body(`/v2/projects/alpha/speed?${week}&device=desktop`, SpeedResponse);
    expect(speed.data).toMatchObject({
      score: null,
      rating: null,
      samples: 5,
      metrics: { lcp: { value: null, rating: null, score: null, samples: 5 } },
    });
  });

  test("checks its parameters and the project's visibility", async () => {
    expect((await call(`/v2/projects/alpha/speed?${week}&percentile=80`)).status).toBe(400);
    expect((await call(`/v2/projects/alpha/speed?${week}&device=watch`)).status).toBe(400);
    expect((await call(`/v2/projects/alpha/speed?${week}&filter[host]=x`)).status).toBe(400);
    expect((await call(`/v2/projects/closed/speed?${week}`)).status).toBe(404);
    await body(`/v2/projects/closed/speed?${week}`, SpeedResponse, admin);
  });
});

describe("speed routes, series and elements", () => {
  test("routes worst first", async () => {
    const routes = await body(
      `/v2/projects/alpha/speed/routes?${week}&device=mobile`,
      SpeedRouteList,
    );
    expect((routes.data as Json[]).map((row) => [row.route, row.score, row.lcp])).toEqual([
      ["/slow", 27, 5000],
      ["/", 94, 2710],
    ]);
  });

  test("one metric per day", async () => {
    const series = await body(
      `/v2/projects/alpha/speed/timeseries?from=2026-09-23T00:00:00.000Z&to=2026-09-26T00:00:00.000Z&metric=lcp&device=mobile`,
      SpeedTimeseries,
    );
    expect(series.data).toEqual([
      { bucket: "2026-09-23T00:00:00.000Z", value: null, samples: 0 },
      { bucket: "2026-09-24T00:00:00.000Z", value: 5000, samples: 40 },
      { bucket: "2026-09-25T00:00:00.000Z", value: null, samples: 0 },
    ]);
    expect((await call(`/v2/projects/alpha/speed/timeseries?${week}`)).status).toBe(400);
  });

  test("the selectors behind slow values", async () => {
    const elements = await body(
      `/v2/projects/alpha/speed/elements?${week}&metric=lcp`,
      SpeedElementList,
    );
    expect(elements.data).toEqual([
      { selector: "main>img.hero", route: "/slow", samples: 20, value: 5000 },
    ]);
  });

  test("across projects, only the readable ones", async () => {
    const anonymous = await body(`/v2/speed?${week}&device=mobile&filter[route]=/`, SpeedResponse);
    expect((anonymous.data as Json).samples).toBe(20);
    const everything = await body(
      `/v2/speed?${week}&device=mobile&filter[route]=/`,
      SpeedResponse,
      admin,
    );
    expect(((everything.data as Json).metrics as Json).lcp).toMatchObject({ samples: 40 });
  });
});

describe("POST /v2/admin/jobs/rollup", () => {
  test("needs the cron secret, then rolls up and trims raw rows", async () => {
    const denied = await api.handle(
      new Request("http://localhost/v2/admin/jobs/rollup", { method: "POST" }),
    );
    expect(denied.status).toBe(401);
    const response = await api.handle(
      new Request("http://localhost/v2/admin/jobs/rollup?days=30", {
        method: "POST",
        headers: cron,
      }),
    );
    expect(response.status).toBe(200);
    const json: unknown = await response.json();
    expect(Value.Check(JobResult, json)).toBe(true);
    expect((json as { data: Json }).data).toMatchObject({
      job: "rollup",
      status: "ok",
      startDay: "2026-08-29",
      days: 30,
      rowsWritten: 8,
      rowsDeleted: 0,
    });
  });
});
