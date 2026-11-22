import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { PGlite } from "@electric-sql/pglite";
import {
  BreakdownResponse,
  EventList,
  EventNamesResponse,
  HeatmapResponse,
  LiveEvents,
  MapResponse,
  PathsResponse,
  PropKeysResponse,
  RetentionResponse,
  LifecycleResponse,
  StickinessResponse,
} from "@spoar/contract";
import { createEngine, defaultEnrichers, defaultSignals, defaultStages } from "@spoar/engine";
import { fixedClock, memoryLogger } from "@spoar/engine/adapters/memory";
import { pgliteAccess, pgliteAdapters } from "@spoar/engine/adapters/pglite";
import { webCryptoHasher } from "@spoar/engine/adapters/system";
import { runMigrations } from "@spoar/engine/db/migrate";
import { migrationsDirectory, readMigrations } from "@spoar/engine/db/migration-files";
import type { StickinessPeriod } from "@spoar/contract";
import type { TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

import { createApp } from "../src/app";
import { openGeo } from "../src/geo";

type Json = { [key: string]: unknown };

type Seeded = {
  project?: string;
  visitor: string;
  session: string;
  ts: string;
  path: string;
  place: [string, string, string, number, number];
  receivedAt?: string;
};

const now = new Date("2026-09-27T16:40:00.000Z");
const clock = fixedClock(now);
const database = new PGlite();
const hasher = webCryptoHasher();
const geo = openGeo([], []);
const stores = pgliteAccess(database);
const admin = { authorization: "Bearer at_test_admin" };
const month = "from=2026-09-01T00:00:00.000Z&to=2026-09-28T00:00:00.000Z";
const amsterdam: Seeded["place"] = ["NL", "Noord-Holland", "Amsterdam", 52.3676, 4.9041];
const utrecht: Seeded["place"] = ["NL", "Utrecht", "Utrecht", 52.0907, 5.1214];
const newYork: Seeded["place"] = ["US", "New York", "New York", 40.7128, -74.006];

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

let seeded = 0;

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

async function seed(event: Seeded) {
  seeded += 1;
  const [country, region, city, latitude, longitude] = event.place;
  await database.query(
    `INSERT INTO events (project_id, type, name, ts, received_at, path, host, channel, visitor_id, session_id, fingerprint, country, region, city, latitude, longitude, device_type, meta)
     VALUES ($1, 'pageview', 'pageview', $2, COALESCE($3::timestamptz, $2::timestamptz), $4, 'site.test', 'direct', $5, $6, $7, $8, $9, $10, $11, $12, 'desktop', '{}')`,
    [
      event.project ?? "site",
      event.ts,
      event.receivedAt ?? null,
      event.path,
      event.visitor,
      event.session,
      `f${seeded}`,
      country,
      region,
      city,
      latitude,
      longitude,
    ],
  );
}

function recent(secondsAgo: number) {
  return new Date(Date.now() - secondsAgo * 1000).toISOString();
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
      ('site', 'site', 'site.test', 'public', 'pk_test_site', 'x'),
      ('hidden', 'hidden', 'hidden.test', 'private', 'pk_test_hidden', 'y')`,
  );
  await database.query(
    "INSERT INTO api_tokens (id, name, token_hash, scope, project_ids) VALUES ('tok_admin', 'admin', $1, 'admin', NULL)",
    [await hasher.sha256("at_test_admin")],
  );
  const history: Seeded[] = [
    { visitor: "v1", session: "s1", ts: "2026-09-07T10:00:00Z", path: "/", place: amsterdam },
    {
      visitor: "v1",
      session: "s1",
      ts: "2026-09-07T10:01:00Z",
      path: "/pricing",
      place: amsterdam,
    },
    { visitor: "v1", session: "s1", ts: "2026-09-07T10:02:00Z", path: "/signup", place: amsterdam },
    { visitor: "v2", session: "s2", ts: "2026-09-08T14:00:00Z", path: "/", place: utrecht },
    { visitor: "v2", session: "s2", ts: "2026-09-08T14:01:00Z", path: "/blog", place: utrecht },
    { visitor: "v1", session: "s3", ts: "2026-09-15T10:00:00Z", path: "/", place: amsterdam },
    { visitor: "v3", session: "s4", ts: "2026-09-16T09:00:00Z", path: "/pricing", place: newYork },
    { visitor: "v3", session: "s4", ts: "2026-09-16T09:05:00Z", path: "/", place: newYork },
    {
      project: "hidden",
      visitor: "h1",
      session: "sh1",
      ts: "2026-09-16T09:00:00Z",
      path: "/",
      place: newYork,
    },
  ];
  for (const event of history) await seed(event);
  await database.query(
    `INSERT INTO events (project_id, type, name, ts, received_at, path, host, visitor_id, session_id, fingerprint, meta)
     VALUES ('site', 'custom', 'signup', '2026-09-15T10:00:30Z', '2026-09-15T10:00:30Z', '/', 'site.test', 'v1', 's3', 'signup1', '{}')`,
  );
});

describe("conversion_rate", () => {
  test("the share of each page's sessions that had the filtered event", async () => {
    const pages = await body(
      `/v2/projects/site/breakdown/page?${month}&metrics=sessions,conversion_rate&filter[event]=signup`,
      BreakdownResponse,
    );
    expect(pages.data).toEqual([
      { value: "/", sessions: 4, conversionRate: 0.25, share: 1 },
      { value: "/pricing", sessions: 2, conversionRate: 0, share: 0.667 },
      { value: "/blog", sessions: 1, conversionRate: 0, share: 0.333 },
      { value: "/signup", sessions: 1, conversionRate: 0, share: 0.333 },
    ]);
  });

  test("needs filter[event]", async () => {
    const response = await call(
      `/v2/projects/site/breakdown/page?${month}&metrics=conversion_rate`,
    );
    expect(response.status).toBe(400);
  });
});

describe("paths", () => {
  test("the pages viewed next, with drop-off", async () => {
    const paths = await body(`/v2/projects/site/paths?${month}&page=/`, PathsResponse);
    expect(paths).toMatchObject({
      data: [
        { path: "/blog", count: 1, share: 0.25 },
        { path: "/pricing", count: 1, share: 0.25 },
      ],
      page: "/",
      direction: "next",
      views: 4,
      dropOff: { count: 2, share: 0.5 },
      total: 2,
      nextCursor: null,
    });
  });

  test("the pages viewed before, and paging", async () => {
    const before = await body(
      `/v2/projects/site/paths?${month}&page=/&direction=previous`,
      PathsResponse,
    );
    expect(before).toMatchObject({
      data: [{ path: "/pricing", count: 1, share: 0.25 }],
      views: 4,
      dropOff: { count: 3, share: 0.75 },
    });
    const first = await body(`/v2/projects/site/paths?${month}&page=/&limit=1`, PathsResponse);
    expect(first.data).toEqual([{ path: "/blog", count: 1, share: 0.25 }]);
    const second = await body(
      `/v2/projects/site/paths?${month}&page=/&limit=1&cursor=${String(first.nextCursor)}`,
      PathsResponse,
    );
    expect(second.data).toEqual([{ path: "/pricing", count: 1, share: 0.25 }]);
  });

  test("page is required and direction is checked", async () => {
    expect((await call(`/v2/projects/site/paths?${month}`)).status).toBe(400);
    expect((await call(`/v2/projects/site/paths?${month}&page=/&direction=up`)).status).toBe(400);
  });
});

describe("retention", () => {
  test("weekly cohorts by first visit, zero-filled to the end of the range", async () => {
    const cohorts = await body(`/v2/projects/site/retention?${month}`, RetentionResponse);
    expect(cohorts).toMatchObject({
      interval: "week",
      data: [
        {
          cohort: "2026-09-07T00:00:00.000Z",
          visitors: 2,
          periods: [
            { offset: 0, visitors: 2, share: 1 },
            { offset: 1, visitors: 1, share: 0.5 },
            { offset: 2, visitors: 0, share: 0 },
          ],
        },
        {
          cohort: "2026-09-14T00:00:00.000Z",
          visitors: 1,
          periods: [
            { offset: 0, visitors: 1, share: 1 },
            { offset: 1, visitors: 0, share: 0 },
          ],
        },
      ],
    });
  });

  test("monthly cohorts", async () => {
    const cohorts = await body(
      `/v2/projects/site/retention?${month}&interval=month`,
      RetentionResponse,
    );
    expect(cohorts.data).toEqual([
      {
        cohort: "2026-09-01T00:00:00.000Z",
        visitors: 3,
        periods: [{ offset: 0, visitors: 3, share: 1 }],
      },
    ]);
    expect((await call(`/v2/projects/site/retention?${month}&interval=day`)).status).toBe(400);
  });
});

describe("lifecycle", () => {
  test("new, returning and dormant visitors per week, including the week before the range", async () => {
    const weeks = await body(`/v2/projects/site/lifecycle?${month}`, LifecycleResponse);
    expect(weeks.interval).toBe("week");
    expect(weeks.data).toEqual([
      { period: "2026-08-31T00:00:00.000Z", new: 0, returning: 0, resurrected: 0, dormant: 0 },
      { period: "2026-09-07T00:00:00.000Z", new: 2, returning: 0, resurrected: 0, dormant: 0 },
      { period: "2026-09-14T00:00:00.000Z", new: 1, returning: 1, resurrected: 0, dormant: 1 },
      { period: "2026-09-21T00:00:00.000Z", new: 0, returning: 0, resurrected: 0, dormant: 2 },
    ]);
  });

  test("a visitor back after a gap is resurrected, judged by their first visit ever", async () => {
    const days = await body(
      "/v2/projects/site/lifecycle?from=2026-09-15T00:00:00.000Z&to=2026-09-17T00:00:00.000Z&interval=day",
      LifecycleResponse,
    );
    expect(days.data).toEqual([
      { period: "2026-09-15T00:00:00.000Z", new: 0, returning: 0, resurrected: 1, dormant: 0 },
      { period: "2026-09-16T00:00:00.000Z", new: 1, returning: 0, resurrected: 0, dormant: 1 },
    ]);
    expect((await call(`/v2/projects/site/lifecycle?${month}&interval=year`)).status).toBe(400);
  });
});

describe("stickiness", () => {
  test("visitors by distinct active days, zero-filled, with shares and the average", async () => {
    const sticky = await body(`/v2/projects/site/stickiness?${month}`, StickinessResponse);
    expect(sticky).toMatchObject({
      data: [
        { days: 1, visitors: 2, share: 0.667 },
        { days: 2, visitors: 1, share: 0.333 },
      ],
      visitors: 3,
      averageDays: 1.33,
    });
    const everywhere = await body(`/v2/stickiness?${month}`, StickinessResponse, admin);
    expect(everywhere.visitors).toBe(4);
    expect(sticky.interval).toBeUndefined();
    expect(sticky.periods).toBeUndefined();
  });

  test("interval=week adds a seven-day histogram per week, keeping the whole range", async () => {
    const sticky = await body(
      `/v2/projects/site/stickiness?${month}&interval=week`,
      StickinessResponse,
    );
    expect(sticky).toMatchObject({ interval: "week", visitors: 3, averageDays: 1.33 });
    const periods = sticky.periods as StickinessPeriod[];
    expect(periods.map((period) => [period.period, period.visitors])).toEqual([
      ["2026-09-07T00:00:00.000Z", 2],
      ["2026-09-14T00:00:00.000Z", 2],
      ["2026-09-21T00:00:00.000Z", 0],
    ]);
    expect(periods.every((period) => period.data.length === 7)).toBe(true);
    expect(periods[0]?.data[0]).toEqual({ days: 1, visitors: 2, share: 1 });
    expect(periods[2]?.averageDays).toBe(0);
  });

  test("interval=month counts days per month, up to the days inside the range", async () => {
    const sticky = await body(
      `/v2/projects/site/stickiness?${month}&interval=month`,
      StickinessResponse,
    );
    const [september] = sticky.periods as StickinessPeriod[];
    expect(september).toMatchObject({
      period: "2026-09-01T00:00:00.000Z",
      visitors: 3,
      averageDays: 1.33,
    });
    expect(september?.data).toHaveLength(27);
    expect(september?.data[1]).toEqual({ days: 2, visitors: 1, share: 0.333 });
  });

  test("filters narrow the histograms and an unknown interval is rejected", async () => {
    const sticky = await body(
      `/v2/projects/site/stickiness?${month}&interval=week&filter[country]=US`,
      StickinessResponse,
    );
    expect(sticky).toMatchObject({ visitors: 1, filters: { country: "US" } });
    expect((sticky.periods as StickinessPeriod[]).map((period) => period.visitors)).toEqual([1, 0]);
    expect((await call(`/v2/projects/site/stickiness?${month}&interval=day`)).status).toBe(400);
  });
});

describe("discovery", () => {
  const insert = `INSERT INTO events (project_id, type, name, ts, received_at, path, host, fingerprint, bot_score, is_preview, meta)
    VALUES ('catalog', 'custom', $1, $2, $2, '/', 'catalog.test', $3, $4, $5, $6)`;

  beforeAll(async () => {
    await database.query(
      `INSERT INTO projects (id, name, domain, visibility, public_key, secret_key_hash)
       VALUES ('catalog', 'catalog', 'catalog.test', 'public', 'pk_test_catalog', 'z')`,
    );
    const rows: [string | null, string, number, boolean, string][] = [
      ["signup", "2026-09-20T10:00:00Z", 0, false, '{"plan":"pro","eventName":"signup"}'],
      ["signup", "2026-09-21T10:00:00Z", 0, false, '{"plan":"free","browser":"Firefox"}'],
      ["purchase", "2026-09-22T10:00:00Z", 0, false, '{"plan":"pro","amount":5}'],
      [null, "2026-09-23T10:00:00Z", 0, false, '{"eventName":"signup","source":"v1"}'],
      ["crawl", "2026-09-24T10:00:00Z", 90, false, '{"botOnly":true}'],
      ["staging", "2026-09-24T11:00:00Z", 0, true, '{"previewOnly":true}'],
      ["expired", "2026-08-01T10:00:00Z", 0, false, '{"oldKey":true}'],
    ];
    for (const [index, [name, ts, score, preview, meta]] of rows.entries()) {
      await database.query(insert, [name, ts, `catalog${index}`, score, preview, meta]);
    }
  });

  afterAll(async () => {
    await database.query("DELETE FROM events WHERE project_id = 'catalog'");
    await database.query("DELETE FROM projects WHERE id = 'catalog'");
  });

  test("event names of the last 30 days, human production traffic, most used first", async () => {
    const names = await body("/v2/projects/catalog/events/names", EventNamesResponse);
    expect(names).toMatchObject({
      data: [
        { name: "signup", count: 3 },
        { name: "purchase", count: 1 },
      ],
      total: 2,
      sampled: false,
      range: { from: "2026-08-28T16:40:00.000Z", to: "2026-09-27T16:40:00.000Z" },
    });
  });

  test("limit caps the rows but not the total", async () => {
    const names = await body("/v2/projects/catalog/events/names?limit=1", EventNamesResponse);
    expect(names.data).toEqual([{ name: "signup", count: 3 }]);
    expect(names.total).toBe(2);
    expect((await call("/v2/projects/catalog/events/names?limit=501")).status).toBe(400);
  });

  test("prop keys leave out the fields stored next to props", async () => {
    const keys = await body("/v2/projects/catalog/props/keys", PropKeysResponse);
    expect(keys).toMatchObject({
      data: [
        { key: "plan", count: 3 },
        { key: "amount", count: 1 },
        { key: "source", count: 1 },
      ],
      event: null,
      total: 3,
      sampled: false,
    });
  });

  test("prop keys for one event include its legacy rows without a name", async () => {
    const keys = await body("/v2/projects/catalog/props/keys?event=signup", PropKeysResponse);
    expect(keys).toMatchObject({
      data: [
        { key: "plan", count: 2 },
        { key: "source", count: 1 },
      ],
      event: "signup",
      total: 2,
    });
  });

  test("private projects answer 404 to anonymous callers and 200 to a token", async () => {
    for (const route of ["events/names", "props/keys"]) {
      expect((await call(`/v2/projects/hidden/${route}`)).status).toBe(404);
      expect((await call(`/v2/projects/hidden/${route}`, admin)).status).toBe(200);
    }
  });
});

describe("heatmap", () => {
  test("visitors per weekday and hour, all 168 cells, in UTC", async () => {
    const heat = await body(`/v2/projects/site/heatmap?${month}`, HeatmapResponse);
    const cells = heat.data as Json[];
    expect(cells).toHaveLength(168);
    expect(cells.filter((cell) => cell.value !== 0)).toEqual([
      { weekday: 1, hour: 10, value: 1 },
      { weekday: 2, hour: 10, value: 1 },
      { weekday: 2, hour: 14, value: 1 },
      { weekday: 3, hour: 9, value: 1 },
    ]);
  });

  test("pageviews in a given timezone", async () => {
    const heat = await body(
      `/v2/projects/site/heatmap?${month}&metric=pageviews&timezone=Europe/Amsterdam`,
      HeatmapResponse,
    );
    expect(heat.timezone).toBe("Europe/Amsterdam");
    expect((heat.data as Json[]).filter((cell) => cell.value !== 0)).toEqual([
      { weekday: 1, hour: 12, value: 3 },
      { weekday: 2, hour: 12, value: 1 },
      { weekday: 2, hour: 16, value: 2 },
      { weekday: 3, hour: 11, value: 2 },
    ]);
    expect((await call(`/v2/projects/site/heatmap?${month}&timezone=Mars/Base`)).status).toBe(400);
  });
});

describe("map", () => {
  test("visitors per country", async () => {
    const places = await body(`/v2/projects/site/map?${month}`, MapResponse);
    expect(places).toMatchObject({
      level: "country",
      total: 2,
      data: [
        { country: "NL", region: null, city: null, visitors: 2, share: 0.667 },
        { country: "US", region: null, city: null, visitors: 1, share: 0.333 },
      ],
    });
  });

  test("visitors per city with coordinates, paged", async () => {
    const places = await body(`/v2/projects/site/map?${month}&level=city&limit=2`, MapResponse);
    expect(places.data).toEqual([
      {
        country: "NL",
        region: "Noord-Holland",
        city: "Amsterdam",
        latitude: 52.37,
        longitude: 4.9,
        visitors: 1,
        share: 0.333,
      },
      {
        country: "NL",
        region: "Utrecht",
        city: "Utrecht",
        latitude: 52.09,
        longitude: 5.12,
        visitors: 1,
        share: 0.333,
      },
    ]);
    expect(places.total).toBe(3);
    expect(places.nextCursor).not.toBeNull();
    expect((await call(`/v2/projects/site/map?${month}&level=street`)).status).toBe(400);
  });

  test("across projects only counts readable ones", async () => {
    const anonymous = await body(`/v2/map?${month}`, MapResponse);
    expect(anonymous.data).toMatchObject([
      { country: "NL", visitors: 2 },
      { country: "US", visitors: 1 },
    ]);
    const everything = await body(`/v2/map?${month}`, MapResponse, admin);
    expect(everything.data).toMatchObject([
      { country: "NL", visitors: 2 },
      { country: "US", visitors: 2 },
    ]);
  });
});

describe("private projects", () => {
  test("answer 404 to anonymous callers on every exploration route", async () => {
    for (const route of ["paths?page=/", "retention", "heatmap", "map", "realtime/events"]) {
      expect((await call(`/v2/projects/hidden/${route}`)).status).toBe(404);
    }
  });
});

describe("live events", () => {
  test("without a cursor, the last five minutes at once; then long-polling after it", async () => {
    await seed({
      visitor: "v9",
      session: "s9",
      ts: recent(60),
      receivedAt: recent(60),
      path: "/live",
      place: amsterdam,
    });
    const first = await body("/v2/projects/site/realtime/events", LiveEvents);
    expect(first.data).toMatchObject([
      { project: "site", name: "pageview", path: "/live", country: "NL", device: "desktop" },
    ]);
    expect(first.data as Json[]).not.toContainEqual(expect.objectContaining({ visitor: "v9" }));
    const cursor = String(first.nextCursor);
    const idle = await body(`/v2/projects/site/realtime/events?after=${cursor}`, LiveEvents);
    expect(idle).toEqual({ data: [], nextCursor: cursor });
    await seed({
      visitor: "v10",
      session: "s10",
      ts: recent(1),
      receivedAt: recent(0),
      path: "/next",
      place: utrecht,
    });
    const next = await body(`/v2/projects/site/realtime/events?after=${cursor}`, LiveEvents, admin);
    expect(next.data).toMatchObject([{ path: "/next", visitor: "v10", session: "s10" }]);
    expect(next.nextCursor).not.toBe(cursor);
  });

  test("across projects, visitor ids only where the caller has detail access", async () => {
    const anonymous = await body("/v2/realtime/events", LiveEvents);
    expect((anonymous.data as Json[]).map((event) => event.visitor)).toEqual([
      undefined,
      undefined,
    ]);
    const signedIn = await body("/v2/realtime/events", LiveEvents, admin);
    expect((signedIn.data as Json[]).map((event) => event.visitor)).toEqual(["v9", "v10"]);
  });

  test("a bad cursor is a validation error", async () => {
    expect((await call("/v2/projects/site/realtime/events?after=nope")).status).toBe(400);
  });

  test("server-sent events on the same route, resuming from Last-Event-ID", async () => {
    const response = await call("/v2/projects/site/realtime/events", {
      accept: "text/event-stream",
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toStartWith("text/event-stream");
    const text = await response.text();
    expect(text).toStartWith("retry: 2000\n\n");
    const [frame] = text.split("\n\n").filter((part) => part.startsWith("id: "));
    const lines = (frame ?? "").split("\n");
    expect(lines[1]).toBe("event: events");
    const payload: unknown = JSON.parse((lines[2] ?? "").replace("data: ", ""));
    expect(Value.Check(LiveEvents, payload)).toBe(true);
    const id = (lines[0] ?? "").replace("id: ", "");
    const resumed = await call("/v2/projects/site/realtime/events", {
      accept: "text/event-stream",
      "last-event-id": id,
    });
    const rest = await resumed.text();
    expect(rest).not.toContain("event: events");
    expect(rest).toContain(": waiting");
  });
});

describe("exports", () => {
  test("format=csv streams every row with a header, nested fields as dotted columns", async () => {
    const response = await call(`/v2/projects/site/map?${month}&level=city&limit=1&format=csv`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toStartWith("text/csv");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="map.csv"');
    expect((await response.text()).split("\n")).toEqual([
      "country,region,city,latitude,longitude,visitors,share",
      "NL,Noord-Holland,Amsterdam,52.37,4.9,1,0.333",
      "NL,Utrecht,Utrecht,52.09,5.12,1,0.333",
      "US,New York,New York,40.71,-74.01,1,0.333",
      "",
    ]);
    const events = await call(`/v2/events?${month}`, { ...admin, accept: "text/csv" });
    const [header] = (await events.text()).split("\n");
    expect(header?.split(",")).toContain("page.path");
  });

  test("format=json is the normal response with all rows at once", async () => {
    const response = await call(`/v2/events?${month}&limit=2&format=json`, admin);
    const json = (await response.json()) as Json;
    expect(json.nextCursor).toBeNull();
    expect(json.data).toHaveLength(10);
    expect(Value.Check(EventList, json)).toBe(true);
  });

  test("format=sql pages past 1,000 rows and loads into Postgres", async () => {
    await database.query(
      "INSERT INTO projects (id, name, domain, visibility, public_key, secret_key_hash) VALUES ('bulk', 'bulk', 'bulk.test', 'private', 'pk_test_bulk', 'z')",
    );
    await database.query(
      `INSERT INTO events (project_id, type, name, ts, path, host, visitor_id, session_id, fingerprint, meta)
       SELECT 'bulk', 'pageview', 'pageview', timestamptz '2026-09-10T00:00:00Z' + g * interval '1 second',
         '/it''s-' || g, 'bulk.test', 'v' || (g % 7), 's' || (g % 50), 'bulk' || g, '{}'
       FROM generate_series(1, 1200) g`,
    );
    const response = await call(`/v2/projects/bulk/events?${month}&format=sql`, admin);
    expect(response.headers.get("content-type")).toStartWith("application/sql");
    const text = await response.text();
    expect(text).toStartWith('CREATE TABLE "events" (\n  "id" text,');
    const copy = new PGlite();
    await copy.exec(text);
    const loaded = await copy.query<{ n: number; quoted: number }>(
      `SELECT count(*)::int AS n, count(*) FILTER (WHERE "page.path" LIKE '/it''s-%')::int AS quoted FROM events`,
    );
    expect(loaded.rows).toEqual([{ n: 1200, quoted: 1200 }]);
  });
});
