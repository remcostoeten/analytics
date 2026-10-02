import { beforeAll, describe, expect, test } from "bun:test";

import { PGlite } from "@electric-sql/pglite";
import {
  EventList,
  PeopleList,
  PersonResponse,
  ProjectBreakdownResponse,
  StatsResponse,
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
const readClosed = { authorization: "Bearer at_test_closed" };
const week = "from=2026-09-20T00:00:00.000Z&to=2026-09-28T00:00:00.000Z";

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

async function seed(
  project: string,
  id: string,
  visitor: string,
  session: string,
  ts: string,
  path: string,
) {
  await database.query(
    `INSERT INTO events (project_id, type, name, ts, path, host, referrer_domain, channel, visitor_id, session_id, fingerprint, meta)
     VALUES ($1, 'pageview', 'pageview', $2, $3, $4, $5, $6, $7, $8, $9, '{}')`,
    [
      project,
      ts,
      path,
      `${project}.test`,
      id === "a1" ? "news.ycombinator.com" : null,
      id === "a1" ? "social" : "direct",
      visitor,
      session,
      id,
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
      ('beta', 'beta', 'beta.test', 'public', 'pk_test_beta', 'y'),
      ('closed', 'closed', 'closed.test', 'private', 'pk_test_closed', 'z')`,
  );
  await database.query(
    "INSERT INTO api_tokens (id, name, token_hash, scope, project_ids) VALUES ('tok_admin', 'admin', $1, 'admin', NULL), ('tok_closed', 'closed', $2, 'read', '{closed}')",
    [await hasher.sha256("at_test_admin"), await hasher.sha256("at_test_closed")],
  );
  const identity = JSON.stringify({ identity: { userId: "user_123", plan: "pro" } });
  await database.query(
    `INSERT INTO visitors (project_id, fingerprint, first_seen, last_seen, meta) VALUES
      ('alpha', 'va', '2026-09-21T08:00:00Z', '2026-09-26T08:00:00Z', $1),
      ('beta', 'vb', '2026-09-24T08:00:00Z', '2026-09-27T09:00:00Z', $1)`,
    [identity],
  );
  await seed("alpha", "a1", "va", "sa1", "2026-09-21T08:00:00Z", "/");
  await seed("alpha", "a2", "va", "sa2", "2026-09-26T08:00:00Z", "/pricing");
  await seed("beta", "b1", "vb", "sb1", "2026-09-24T08:00:00Z", "/notes");
  await seed("beta", "b2", "vb", "sb2", "2026-09-27T09:00:00Z", "/notes");
  await seed("closed", "c1", "vc", "sc1", "2026-09-25T08:00:00Z", "/secret");
  await seed("alpha", "a0", "vo", "sa0", "2026-09-15T08:00:00Z", "/");
  await database.query(
    `INSERT INTO web_vitals (id, project_id, ts, metric, value, rating, path, device)
     SELECT 'lcp-' || g, 'alpha', '2026-09-24T10:00:00Z', 'lcp', 2710, 'needs-improvement', '/', 'mobile'
     FROM generate_series(1, 20) g`,
  );
  await database.query(
    `INSERT INTO issues (project_id, fingerprint, title, status, first_seen, last_seen) VALUES
      ('alpha', 'f1', 'TypeError', 'open', '2026-09-21T08:00:00Z', '2026-09-26T08:00:00Z'),
      ('alpha', 'f2', 'RangeError', 'open', '2026-09-21T08:00:00Z', '2026-09-26T08:00:00Z'),
      ('alpha', 'f3', 'SyntaxError', 'resolved', '2026-09-21T08:00:00Z', '2026-09-26T08:00:00Z'),
      ('closed', 'f4', 'TypeError', 'open', '2026-09-25T08:00:00Z', '2026-09-25T08:00:00Z')`,
  );
});

describe("aggregate reads across projects", () => {
  test("anonymous callers get the public projects, cacheable", async () => {
    const response = await call(`/v2/stats?${week}`);
    expect(response.headers.get("cache-control")).toBe("public, s-maxage=60");
    const stats = await body(`/v2/stats?${week}`, StatsResponse);
    expect((stats.data as Json).pageviews).toMatchObject({ value: 4 });
  });

  test("an admin also gets private projects, not cacheable", async () => {
    const response = await call(`/v2/stats?${week}`, admin);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const stats = await body(`/v2/stats?${week}`, StatsResponse, admin);
    expect((stats.data as Json).pageviews).toMatchObject({ value: 5 });
  });

  test("filter[project] narrows to a set of projects, never beyond what the caller may read", async () => {
    const one = await body(`/v2/stats?${week}&filter[project]=alpha`, StatsResponse);
    expect((one.data as Json).pageviews).toMatchObject({ value: 2 });
    const hidden = await body(`/v2/stats?${week}&filter[project]=closed`, StatsResponse);
    expect((hidden.data as Json).pageviews).toMatchObject({ value: 0 });
  });

  test("breakdown/project has one row per readable project", async () => {
    const anonymous = await body(`/v2/breakdown/project?${week}`, ProjectBreakdownResponse);
    expect((anonymous.data as Json[]).map((row) => row.value)).toEqual(["alpha", "beta"]);
    const everything = await body(`/v2/breakdown/project?${week}`, ProjectBreakdownResponse, admin);
    expect((everything.data as Json[]).map((row) => row.value)).toEqual([
      "alpha",
      "beta",
      "closed",
    ]);
  });

  test("breakdown/project adds change, speed score, open issues and visibility", async () => {
    const anonymous = await body(`/v2/breakdown/project?${week}`, ProjectBreakdownResponse);
    expect(anonymous.previousRange).toEqual({
      from: "2026-09-12T00:00:00.000Z",
      to: "2026-09-20T00:00:00.000Z",
    });
    expect(anonymous.data).toEqual([
      {
        value: "alpha",
        visitors: 1,
        pageviews: 2,
        share: 0.5,
        name: "alpha",
        visibility: "public",
        change: { visitors: 0, pageviews: 1 },
        speedScore: 86,
        openIssues: null,
      },
      {
        value: "beta",
        visitors: 1,
        pageviews: 2,
        share: 0.5,
        name: "beta",
        visibility: "public",
        change: { visitors: null, pageviews: null },
        speedScore: null,
        openIssues: null,
      },
    ]);
    const everything = await body(`/v2/breakdown/project?${week}`, ProjectBreakdownResponse, admin);
    expect(
      (everything.data as Json[]).map((row) => [row.value, row.visibility, row.openIssues]),
    ).toEqual([
      ["alpha", "public", 2],
      ["beta", "public", 0],
      ["closed", "private", 1],
    ]);
  });
});

describe("visitor-level reads across projects", () => {
  test("only projects whose visitor-level data the caller may see", async () => {
    const anonymous = await body(`/v2/events?${week}`, EventList);
    expect(anonymous.data).toEqual([]);
    const closed = await body(`/v2/events?${week}`, EventList, readClosed);
    expect((closed.data as Json[]).map((event) => event.id)).toEqual(["c1"]);
    const all = await body(`/v2/events?${week}`, EventList, admin);
    expect(all.data).toHaveLength(5);
  });
});

describe("people", () => {
  test("need a signed-in member or a token", async () => {
    expect((await call("/v2/people")).status).toBe(401);
    expect((await call("/v2/people/user_123")).status).toBe(401);
  });

  test("one row per userId across projects", async () => {
    const people = await body("/v2/people", PeopleList, admin);
    expect(people.data).toEqual([
      {
        userId: "user_123",
        traits: { plan: "pro" },
        firstSeen: "2026-09-21T08:00:00.000Z",
        lastSeen: "2026-09-27T09:00:00.000Z",
        firstProject: "alpha",
        projects: 2,
        visits: 4,
      },
    ]);
  });

  test("one person: where they came in, and every visit in time order, as in the API reference", async () => {
    const person = await body("/v2/people/user_123", PersonResponse, admin);
    expect(person.data).toMatchObject({
      userId: "user_123",
      traits: { plan: "pro" },
      firstProject: "alpha",
      firstSource: { referrerDomain: "news.ycombinator.com", channel: "social" },
      projects: [
        { projectId: "alpha", visitorId: "va", firstSeen: "2026-09-21T08:00:00.000Z", visits: 2 },
        { projectId: "beta", visitorId: "vb", firstSeen: "2026-09-24T08:00:00.000Z", visits: 2 },
      ],
      visits: [
        { projectId: "alpha", visitNumber: 1, entryUrl: "https://alpha.test/", pages: 1 },
        { projectId: "beta", visitNumber: 1, entryUrl: "https://beta.test/notes", pages: 1 },
        { projectId: "alpha", visitNumber: 2, entryUrl: "https://alpha.test/pricing", pages: 1 },
        { projectId: "beta", visitNumber: 2, entryUrl: "https://beta.test/notes", pages: 1 },
      ],
    });
    expect((await call("/v2/people/user_123", readClosed)).status).toBe(404);
    expect((await call("/v2/people/nobody", admin)).status).toBe(404);
  });
});
