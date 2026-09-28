import { beforeAll, describe, expect, test } from "bun:test";

import { PGlite } from "@electric-sql/pglite";
import {
  BreakdownResponse,
  RealtimeResponse,
  StatsResponse,
  TimeseriesResponse,
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

function app(publicLimit: number) {
  return createApp({
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
      cronSecret: null,
    },
    reads: {
      store: stores.reads,
      details: stores.details,
      limiter: pgliteAdapters(database, clock).limiter,
      hasher,
      ipSecret: "x".repeat(48),
      publicLimit,
      clock: () => clock.now(),
    },
    authHandler: null,
  });
}

const api = app(1000);

function get(path: string, headers: { [name: string]: string } = {}, target = api) {
  return target.handle(new Request(`http://localhost${path}`, { headers }));
}

async function body(path: string, schema: TSchema, headers: { [name: string]: string } = {}) {
  const response = await get(path, headers);
  expect(response.status).toBe(200);
  const json: unknown = await response.json();
  if (!Value.Check(schema, json)) {
    const [first] = Value.Errors(schema, json);
    throw new Error(`${path} does not match its schema: ${first?.path} ${first?.message}`);
  }
  return json as Json;
}

type Seed = [id: string, visitor: string, session: string, ts: string, path: string, name?: string];

const seeds: Seed[] = [
  ["p1", "ada", "s1", "2026-09-21T10:00:00Z", "/"],
  ["p2", "ada", "s1", "2026-09-21T10:01:00Z", "/blog/rebuilding-analytics"],
  ["p3", "ada", "s1", "2026-09-21T10:02:00Z", "/blog/rebuilding-analytics", "signup"],
  ["p4", "bo", "s2", "2026-09-22T09:00:00Z", "/"],
  ["p5", "cy", "s3", "2026-09-24T12:00:00Z", "/projects"],
  ["p6", "ada", "s4", "2026-09-14T12:00:00Z", "/"],
  ["p7", "live", "s5", "2026-09-27T16:38:00Z", "/blog/rebuilding-analytics"],
];

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
    "INSERT INTO projects (id, name, domain, visibility, public_key, secret_key_hash) VALUES ('site', 'site', 'site.test', 'public', 'pk_test_site', 'x'), ('closed', 'closed', 'closed.test', 'private', 'pk_test_closed', 'y')",
  );
  await database.query(
    "INSERT INTO api_tokens (id, name, token_hash, scope, project_ids) VALUES ('tok_read', 'read', $1, 'read', '{closed}')",
    [await hasher.sha256("at_test_read")],
  );
  for (const [id, visitor, session, ts, path, name] of seeds) {
    await database.query(
      "INSERT INTO events (project_id, type, name, ts, path, country, visitor_id, session_id, fingerprint, meta) VALUES ('site', $1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [
        name ? "event" : "pageview",
        name ?? "pageview",
        ts,
        path,
        visitor === "bo" ? "DE" : "NL",
        visitor,
        session,
        id,
        JSON.stringify(name ? { eventName: name, plan: "pro", revenue: 49 } : {}),
      ],
    );
  }
});

describe("GET /v2/projects/:project/stats", () => {
  test("headline numbers with the previous period, as in the API reference", async () => {
    const stats = await body("/v2/projects/site/stats?period=7d", StatsResponse);
    expect(stats).toEqual({
      data: {
        visitors: { value: 3, previous: 1, change: 2 },
        sessions: { value: 3, previous: 1, change: 2 },
        pageviews: { value: 4, previous: 1, change: 3 },
        pagesPerSession: { value: 1.33, previous: 1, change: 0.33 },
        bounceRate: { value: 0.667, previous: 1, change: -0.333 },
        sessionDurationMs: { value: 40000, previous: 0, change: null },
      },
      range: { from: "2026-09-20T00:00:00.000Z", to: "2026-09-27T00:00:00.000Z" },
      previousRange: { from: "2026-09-13T00:00:00.000Z", to: "2026-09-20T00:00:00.000Z" },
      traffic: "human",
      filters: {},
    });
  });

  test("public projects are cacheable; private ones are not", async () => {
    expect((await get("/v2/projects/site/stats")).headers.get("cache-control")).toBe(
      "public, s-maxage=60",
    );
    const closed = await get("/v2/projects/closed/stats", { authorization: "Bearer at_test_read" });
    expect(closed.status).toBe(200);
    expect(closed.headers.get("cache-control")).toBe("private, no-store");
    expect((await get("/v2/projects/closed/stats")).status).toBe(404);
  });

  test("bad parameters are VALIDATION_FAILED", async () => {
    expect((await get("/v2/projects/site/stats?period=3w")).status).toBe(400);
    expect((await get("/v2/projects/site/stats?from=2026-09-01T00:00:00Z")).status).toBe(400);
    expect((await get("/v2/projects/site/stats?traffic=robots")).status).toBe(400);
    expect((await get("/v2/projects/site/stats?filter[shoe_size]=42")).status).toBe(400);
  });
});

describe("GET /v2/projects/:project/timeseries", () => {
  test("visitors per day with a filter, as in the API reference", async () => {
    const series = await body(
      "/v2/projects/site/timeseries?metric=visitors&interval=day&period=7d&filter[country]=NL",
      TimeseriesResponse,
    );
    expect(series.data).toEqual([
      { bucket: "2026-09-20T00:00:00.000Z", value: 0 },
      { bucket: "2026-09-21T00:00:00.000Z", value: 1 },
      { bucket: "2026-09-22T00:00:00.000Z", value: 0 },
      { bucket: "2026-09-23T00:00:00.000Z", value: 0 },
      { bucket: "2026-09-24T00:00:00.000Z", value: 1 },
      { bucket: "2026-09-25T00:00:00.000Z", value: 0 },
      { bucket: "2026-09-26T00:00:00.000Z", value: 0 },
    ]);
    expect(series).toMatchObject({
      metric: "visitors",
      interval: "day",
      filters: { country: "NL" },
    });
  });

  test("compare=previous adds the previous period per bucket", async () => {
    const series = await body(
      "/v2/projects/site/timeseries?metric=pageviews&period=7d&compare=previous",
      TimeseriesResponse,
    );
    expect((series.data as Json[]).map((point) => point.previous)).toEqual([0, 1, 0, 0, 0, 0, 0]);
    expect(series.previousRange).toEqual({
      from: "2026-09-13T00:00:00.000Z",
      to: "2026-09-20T00:00:00.000Z",
    });
  });

  test("metric is required and must be known", async () => {
    expect((await get("/v2/projects/site/timeseries")).status).toBe(400);
    expect((await get("/v2/projects/site/timeseries?metric=likes")).status).toBe(400);
  });
});

describe("GET /v2/projects/:project/breakdown/:dimension", () => {
  test("pages with bounce rate, time on page and share, paged, as in the API reference", async () => {
    const pages = await body(
      "/v2/projects/site/breakdown/page?period=7d&limit=2",
      BreakdownResponse,
    );
    expect(pages).toMatchObject({
      data: [
        { value: "/", visitors: 2, pageviews: 2, bounceRate: 0.5, avgTimeMs: 60000, share: 0.667 },
        {
          value: "/blog/rebuilding-analytics",
          visitors: 1,
          pageviews: 1,
          bounceRate: 0,
          avgTimeMs: 0,
          share: 0.333,
        },
      ],
      dimension: "page",
      total: 3,
      nextCursor: "eyJvIjoyfQ",
    });
    const next = await body(
      "/v2/projects/site/breakdown/page?period=7d&limit=2&cursor=eyJvIjoyfQ",
      BreakdownResponse,
    );
    expect((next.data as Json[]).map((row) => row.value)).toEqual(["/projects"]);
    expect(next.nextCursor).toBeNull();
  });

  test("custom metrics over props, filtered to an event", async () => {
    const revenue = await body(
      "/v2/projects/site/breakdown/prop:plan?period=7d&metrics=visitors,sum:prop.revenue&filter[event]=signup",
      BreakdownResponse,
    );
    expect(revenue.data).toEqual([{ value: "pro", visitors: 1, "sum:prop.revenue": 49, share: 1 }]);
    expect(revenue.filters).toEqual({ event: "signup" });
  });

  test("CSV on request, and unknown dimensions or metrics are refused", async () => {
    const csv = await get("/v2/projects/site/breakdown/country?period=7d", { accept: "text/csv" });
    expect(csv.headers.get("content-type")).toStartWith("text/csv");
    expect(await csv.text()).toBe("value,visitors,pageviews,share\nNL,2,3,0.667\nDE,1,1,0.333\n");
    expect((await get("/v2/projects/site/breakdown/shoe_size")).status).toBe(404);
    expect((await get("/v2/projects/site/breakdown/page?metrics=likes")).status).toBe(400);
  });
});

describe("GET /v2/projects/:project/realtime", () => {
  test("the last five minutes", async () => {
    expect(await body("/v2/projects/site/realtime", RealtimeResponse)).toEqual({
      data: {
        visitors: 1,
        pageviewsPerMinute: 0.2,
        pages: [{ value: "/blog/rebuilding-analytics", visitors: 1 }],
        countries: [{ value: "NL", visitors: 1 }],
      },
      window: { from: "2026-09-27T16:35:00.000Z", to: "2026-09-27T16:40:00.000Z" },
    });
  });
});

describe("public read rate limit", () => {
  test("anonymous callers are limited per IP hash; token callers are not", async () => {
    const limited = app(2);
    const headers = { "x-forwarded-for": "198.51.100.9" };
    expect((await get("/v2/projects/site/realtime", headers, limited)).status).toBe(200);
    expect((await get("/v2/projects/site/realtime", headers, limited)).status).toBe(200);
    const refused = await get("/v2/projects/site/realtime", headers, limited);
    expect(refused.status).toBe(429);
    expect(refused.headers.get("retry-after")).toBeString();
    const other = { "x-forwarded-for": "198.51.100.10" };
    expect((await get("/v2/projects/site/realtime", other, limited)).status).toBe(200);
    const token = { ...headers, authorization: "Bearer at_test_read" };
    expect((await get("/v2/projects/closed/realtime", token, limited)).status).toBe(200);
  });
});
