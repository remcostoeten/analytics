import { beforeAll, describe, expect, test } from "bun:test";

import { PGlite } from "@electric-sql/pglite";
import {
  EventList,
  SessionEvents,
  SessionList,
  UpdatedVisitor,
  VisitList,
  VisitorDetail,
  VisitorList,
} from "@spoar/contract";
import { createEngine, defaultEnrichers, defaultSignals, defaultStages } from "@spoar/engine";
import { fixedClock, memoryLogger } from "@spoar/engine/adapters/memory";
import { pgliteAccess, pgliteAdapters } from "@spoar/engine/adapters/pglite";
import { webCryptoHasher } from "@spoar/engine/adapters/system";
import { runMigrations } from "@spoar/engine/db/migrate";
import { migrationsDirectory, readMigrations } from "@spoar/engine/db/migration-files";
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
const visitor = "8c4e1f0a-2b3c-4d5e-8f60-718293a4b5c6";
const read = { authorization: "Bearer at_test_read" };
const admin = { authorization: "Bearer at_test_admin" };
const week = "from=2026-09-21T00:00:00.000Z&to=2026-09-28T00:00:00.000Z";

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
    cronSecret: null,
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
  authHandler: null,
});

type Init = { method?: string; body?: string; headers?: { [name: string]: string } };

function call(path: string, headers: { [name: string]: string } = read, init: Init = {}) {
  return api.handle(
    new Request(`http://localhost${path}`, {
      method: init.method,
      body: init.body,
      headers: { ...headers, ...init.headers },
    }),
  );
}

async function body(path: string, schema: TSchema, headers: { [name: string]: string } = read) {
  const response = await call(path, headers);
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  const json: unknown = await response.json();
  if (!Value.Check(schema, json)) {
    const [first] = Value.Errors(schema, json);
    throw new Error(`${path} does not match its schema: ${first?.path} ${first?.message}`);
  }
  return json as Json;
}

type Seed = {
  id: string;
  session: string;
  ts: string;
  path: string;
  name?: string;
  meta?: Json;
  who?: string;
};

const seeds: Seed[] = [
  {
    id: "01928c3a-0000-7000-8000-000000000001",
    session: "s0",
    ts: "2026-09-25T16:38:00.000Z",
    path: "/",
  },
  {
    id: "01928c3d-0f10-7b00-8a00-000000000001",
    session: "s1",
    ts: "2026-09-27T16:38:10.000Z",
    path: "/",
  },
  {
    id: "01928c3d-3000-7b00-8a00-000000000002",
    session: "s1",
    ts: "2026-09-27T16:38:30.000Z",
    path: "/",
    name: "scroll_depth",
    meta: { depth: 60 },
  },
  {
    id: "01928c3d-4f00-7b00-8a00-000000000003",
    session: "s1",
    ts: "2026-09-27T16:39:01.200Z",
    path: "/",
    name: "click",
    meta: { element: "nav-projects" },
  },
  {
    id: "01928c3d-5a20-7b00-8a00-000000000004",
    session: "s1",
    ts: "2026-09-27T16:39:02.000Z",
    path: "/projects",
  },
  {
    id: "01928c3e-7a4b-7c1d-9f00-2b7c1e5d8a11",
    session: "s1",
    ts: "2026-09-27T16:39:58.412Z",
    path: "/blog/rebuilding-analytics",
  },
  {
    id: "01928c3e-7a4c-7a02-8b11-3c8d2f6e9b22",
    session: "s1",
    ts: "2026-09-27T16:39:59.901Z",
    path: "/blog/rebuilding-analytics",
    name: "signup",
    meta: { plan: "pro", eventName: "signup", browser: "Firefox" },
  },
  {
    id: "01928c3e-9999-7000-8000-000000000009",
    session: "t1",
    ts: "2026-09-26T10:00:00.000Z",
    path: "/",
    who: "other",
  },
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
    "INSERT INTO projects (id, name, domain, visibility, public_key, secret_key_hash) VALUES ('remcostoeten.nl', 'remcostoeten.nl', 'remcostoeten.nl', 'public', 'pk_test_site', 'x')",
  );
  await database.query(
    "INSERT INTO api_tokens (id, name, token_hash, scope, project_ids) VALUES ('tok_read', 'read', $1, 'read', NULL), ('tok_admin', 'admin', $2, 'admin', NULL)",
    [await hasher.sha256("at_test_read"), await hasher.sha256("at_test_admin")],
  );
  await database.query(
    `INSERT INTO visitors (project_id, fingerprint, first_seen, last_seen, meta)
     VALUES ('remcostoeten.nl', $1, '2026-09-02T08:11:00Z', '2026-09-27T16:39:59.901Z', $2)`,
    [
      visitor,
      JSON.stringify({
        identity: { userId: "user_123", plan: "pro" },
        experiments: { "hero-copy": "b" },
      }),
    ],
  );
  await database.query(
    "INSERT INTO sessions (project_id, session_id, visitor_id) VALUES ('remcostoeten.nl', 's0', $1), ('remcostoeten.nl', 's1', $1)",
    [visitor],
  );
  for (const seed of seeds) {
    await database.query(
      `INSERT INTO events (project_id, type, name, ts, path, referrer, referrer_domain, channel, host, country, region, city,
        device_type, lang, visitor_id, session_id, fingerprint, meta)
       VALUES ('remcostoeten.nl', $1, $2, $3, $4, $5, $6, 'social', 'remcostoeten.nl', 'NL', 'Friesland', 'Leeuwarden',
        'desktop', 'nl-NL', $7, $8, $9, $10)`,
      [
        seed.name ? "event" : "pageview",
        seed.name ?? "pageview",
        seed.ts,
        seed.path,
        seed.session === "s1" ? "https://news.ycombinator.com/" : null,
        seed.session === "s1" ? "news.ycombinator.com" : null,
        seed.who ?? visitor,
        seed.session,
        seed.id,
        JSON.stringify({ utmSource: seed.session === "s1" ? "hn" : undefined, ...seed.meta }),
      ],
    );
  }
});

describe("GET /v2/projects/:project/events", () => {
  test("newest first, filtered by name, as in the API reference", async () => {
    const list = await body(
      `/v2/projects/remcostoeten.nl/events?name=signup&limit=1&${week}`,
      EventList,
    );
    expect(list.data).toEqual([
      {
        id: "01928c3e-7a4c-7a02-8b11-3c8d2f6e9b22",
        name: "signup",
        ts: "2026-09-27T16:39:59.901Z",
        visitor,
        session: "s1",
        page: {
          path: "/blog/rebuilding-analytics",
          route: null,
          title: null,
          referrer: "https://news.ycombinator.com/",
        },
        props: { plan: "pro" },
        groups: {},
        geo: {
          country: "NL",
          region: "Friesland",
          city: "Leeuwarden",
          postalCode: null,
          timezone: null,
          latitude: null,
          longitude: null,
        },
        device: {
          type: "desktop",
          browser: "Firefox",
          browserVersion: null,
          os: null,
          osVersion: null,
          screen: null,
          viewport: null,
          language: "nl-NL",
          connection: null,
        },
        bot: { score: 0, reasons: [] },
        isInternal: false,
      },
    ]);
    expect(list.nextCursor).toBeNull();
  });

  test("the cursor pages through every event exactly once", async () => {
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const page: Json = await body(
        `/v2/projects/remcostoeten.nl/events?${week}&limit=3${cursor ? `&cursor=${cursor}` : ""}`,
        EventList,
      );
      seen.push(...(page.data as Json[]).map((event) => String(event.id)));
      cursor = typeof page.nextCursor === "string" ? page.nextCursor : null;
    } while (cursor);
    expect(seen).toHaveLength(8);
    expect(new Set(seen).size).toBe(8);
    expect((await call("/v2/projects/remcostoeten.nl/events?cursor=bm9wZQ")).status).toBe(400);
  });

  test("visitor-level reads need access", async () => {
    const response = await call("/v2/projects/remcostoeten.nl/events", {});
    expect(response.status).toBe(401);
  });
});

describe("visitors", () => {
  test("the list, as in the API reference", async () => {
    const list = await body(`/v2/projects/remcostoeten.nl/visitors?${week}&limit=1`, VisitorList);
    expect(list.data).toEqual([
      {
        id: visitor,
        firstSeen: "2026-09-02T08:11:00.000Z",
        lastSeen: "2026-09-27T16:39:59.901Z",
        sessions: 2,
        pageviews: 4,
        country: null,
        device: "unknown",
        browser: null,
        isInternal: false,
        identified: true,
      },
    ]);
    expect(list.nextCursor).toBe("eyJvIjoxfQ");
  });

  test("one visitor in full, as in the API reference", async () => {
    const detail = await body(`/v2/projects/remcostoeten.nl/visitors/${visitor}`, VisitorDetail);
    expect(detail.data).toMatchObject({
      id: visitor,
      firstSeen: "2026-09-02T08:11:00.000Z",
      lastSeen: "2026-09-27T16:39:59.901Z",
      sessions: 2,
      pageviews: 4,
      events: 3,
      visitCount: 2,
      daysActive: 2,
      medianDaysBetweenVisits: 2,
      returnedWithin: { day: false, week: true, month: true },
      identity: { userId: "user_123", traits: { plan: "pro" } },
      experiments: { "hero-copy": "b" },
      geo: { country: "NL", region: "Friesland", city: "Leeuwarden" },
      device: { type: "desktop", browser: "Firefox", language: "nl-NL" },
      topPages: [
        { value: "/", pageviews: 2 },
        { value: "/blog/rebuilding-analytics", pageviews: 1 },
        { value: "/projects", pageviews: 1 },
      ],
      recentSessions: [
        {
          id: "s1",
          startedAt: "2026-09-27T16:38:10.000Z",
          durationMs: 109901,
          pageviews: 3,
          entryPage: "/",
          exitPage: "/blog/rebuilding-analytics",
          referrer: "https://news.ycombinator.com/",
        },
        expect.objectContaining({ id: "s0" }),
      ],
    });
    expect((await call("/v2/projects/remcostoeten.nl/visitors/nobody")).status).toBe(404);
  });

  test("visits, oldest first and numbered, as in the API reference", async () => {
    const visits = await body(
      `/v2/projects/remcostoeten.nl/visitors/${visitor}/visits?limit=1&cursor=eyJvIjoxfQ`,
      VisitList,
    );
    expect(visits.data).toEqual([
      {
        visitNumber: 2,
        sessionId: "s1",
        startedAt: "2026-09-27T16:38:10.000Z",
        endedAt: "2026-09-27T16:39:59.901Z",
        sincePreviousVisitMs: 172810000,
        entryUrl: "https://remcostoeten.nl/",
        exitPath: "/blog/rebuilding-analytics",
        source: {
          referrer: "https://news.ycombinator.com/",
          referrerDomain: "news.ycombinator.com",
          channel: "social",
          utm: { source: "hn", medium: null, campaign: null, term: null, content: null },
        },
        pages: [
          { path: "/", at: "2026-09-27T16:38:10.000Z", timeOnPageMs: 52000, scrollDepth: 0.6 },
          {
            path: "/projects",
            at: "2026-09-27T16:39:02.000Z",
            timeOnPageMs: 56412,
            scrollDepth: null,
          },
          {
            path: "/blog/rebuilding-analytics",
            at: "2026-09-27T16:39:58.412Z",
            timeOnPageMs: 0,
            scrollDepth: null,
          },
        ],
        actions: [
          { at: "2026-09-27T16:39:01.200Z", name: "click", props: { element: "nav-projects" } },
          { at: "2026-09-27T16:39:59.901Z", name: "signup", props: { plan: "pro" } },
        ],
      },
    ]);
    expect(visits.nextCursor).toBeNull();
  });

  test("an admin marks a visitor internal everywhere; a read token may not", async () => {
    const path = `/v2/projects/remcostoeten.nl/visitors/${visitor}`;
    const patch = {
      method: "PATCH",
      body: JSON.stringify({ isInternal: true }),
      headers: { "content-type": "application/json" },
    };
    expect((await call(path, read, patch)).status).toBe(403);
    const response = await call(path, admin, patch);
    expect(response.status).toBe(200);
    const updated: unknown = await response.json();
    expect(Value.Check(UpdatedVisitor, updated)).toBe(true);
    expect(updated).toEqual({
      data: { id: visitor, isInternal: true, eventsUpdated: 7, sessionsUpdated: 2 },
    });
    const human = await body(`/v2/projects/remcostoeten.nl/visitors?${week}`, VisitorList);
    expect((human.data as Json[]).map((row) => row.id)).toEqual(["other"]);
    await call(path, admin, { ...patch, body: JSON.stringify({ isInternal: false }) });
  });
});

describe("sessions", () => {
  test("the list with source, geo and device", async () => {
    const list = await body(`/v2/projects/remcostoeten.nl/sessions?${week}&limit=1`, SessionList);
    expect(list.data).toEqual([
      expect.objectContaining({
        id: "s1",
        visitorId: visitor,
        durationMs: 109901,
        pageviews: 3,
        events: 6,
        isBounce: false,
        entryPath: "/",
        exitPath: "/blog/rebuilding-analytics",
        source: expect.objectContaining({
          referrerDomain: "news.ycombinator.com",
          channel: "social",
        }),
      }),
    ]);
  });

  test("one session's events in order, as in the API reference", async () => {
    const trail = await body("/v2/projects/remcostoeten.nl/sessions/s1/events", SessionEvents);
    expect(trail.session).toEqual({
      id: "s1",
      visitor,
      startedAt: "2026-09-27T16:38:10.000Z",
      durationMs: 109901,
      bot: { score: 0, reasons: [] },
    });
    expect((trail.data as Json[]).map((event) => event.name)).toEqual([
      "pageview",
      "scroll_depth",
      "click",
      "pageview",
      "pageview",
      "signup",
    ]);
    expect((await call("/v2/projects/remcostoeten.nl/sessions/nope/events")).status).toBe(404);
  });
});
