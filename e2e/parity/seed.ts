import { PGlite } from "@electric-sql/pglite";
import { createApp } from "@spoar/api/app";
import { openGeo } from "@spoar/api/geo";
import { createClient } from "@spoar/client";
import type { Client } from "@spoar/client";
import { createEngine, defaultEnrichers, defaultSignals, defaultStages } from "@spoar/engine";
import { fixedClock, memoryLogger } from "@spoar/engine/adapters/memory";
import { pgliteAccess, pgliteAdapters } from "@spoar/engine/adapters/pglite";
import { webCryptoHasher } from "@spoar/engine/adapters/system";
import { runMigrations } from "@spoar/engine/db/migrate";
import { migrationsDirectory, readMigrations } from "@spoar/engine/db/migration-files";

import { publicKey, secretKey } from "../ports";

export type WireEvent = {
  id: string;
  name: string;
  ts: string;
  visitor: string;
  session: string;
  page: { path: string; referrer?: string; title?: string };
  props: { [key: string]: string | number | boolean | null };
  context?: { [key: string]: string };
  signals: number;
};

export type CalendarDay = `${number}-${number}-${number}`;

export const project = "site";

const adminToken = "at_parity_admin";

const dayMs = 86_400_000;

const now = new Date();

const today = new Date(Math.floor(now.getTime() / dayMs) * dayMs);

function isCalendarDay(value: string): value is CalendarDay {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * @name day
 * @description The UTC calendar date `daysAgo` days before today, as `YYYY-MM-DD`.
 *
 * @example
 * day(3); // "2026-10-06" when today is 9 October 2026
 */
export function day(daysAgo: number): CalendarDay {
  const text = new Date(today.getTime() - daysAgo * dayMs).toISOString().slice(0, 10);
  if (!isCalendarDay(text)) throw new Error(`Not a calendar day: ${text}`);
  return text;
}

function at(daysAgo: number, time: string) {
  return `${day(daysAgo)}T${time}.000Z`;
}

export const visitors = {
  a: "0a000000-0000-4000-8000-00000000000a",
  b: "0b000000-0000-4000-8000-00000000000b",
  c: "0c000000-0000-4000-8000-00000000000c",
  d: "0d000000-0000-4000-8000-00000000000d",
};

export const sessions = {
  a1: "5a100000-0000-4000-8000-000000000a01",
  a2: "5a200000-0000-4000-8000-000000000a02",
  b1: "5b100000-0000-4000-8000-000000000b01",
  c1: "5c100000-0000-4000-8000-000000000c01",
  d1: "5d100000-0000-4000-8000-000000000d01",
};

const chrome =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

const stack = `TypeError: Cannot read properties of undefined (reading 'slug')
    at PostCard (https://site.test/_next/static/chunks/app/page-4f2a9c1b8e.js:12:3405)
    at renderWithHooks (https://site.test/_next/static/chunks/node_modules/react-dom-1a2b3c.js:1:5000)`;

let counter = 0;

function uuid() {
  counter += 1;
  return `01928c3e-7a4b-7c1d-9f00-${counter.toString(16).padStart(12, "0")}`;
}

function pageview(visitor: string, session: string, ts: string, path: string): WireEvent {
  return {
    id: uuid(),
    name: "pageview",
    ts,
    visitor,
    session,
    page: { path },
    props: {},
    signals: 0,
  };
}

function action(
  visitor: string,
  session: string,
  ts: string,
  path: string,
  name: string,
  props: WireEvent["props"],
): WireEvent {
  return { id: uuid(), name, ts, visitor, session, page: { path }, props, signals: 0 };
}

function vitals(
  visitor: string,
  session: string,
  ts: string,
  path: string,
  metric: string,
  value: number,
  count: number,
  selector: string | null = null,
): WireEvent[] {
  return Array.from({ length: count }, (_, index) => ({
    id: uuid(),
    name: "web_vital",
    ts,
    visitor,
    session,
    page: { path },
    props: {
      metric,
      id: `${metric}-${path}-${value}-${index}`,
      value,
      rating: "good",
      navigationType: "navigate",
      connection: "4g",
      selector,
      sampleRate: 1,
      route: path,
    },
    signals: 0,
  }));
}

function error(
  visitor: string,
  session: string,
  ts: string,
  path: string,
  type: string,
  message: string,
) {
  return action(visitor, session, ts, path, "error", {
    level: "error",
    type,
    message,
    stack:
      type === "TypeError"
        ? stack
        : `${type}: ${message}\n    at tick (https://site.test/app.js:1:10)`,
    release: "a1b2c3d",
  });
}

function fixedDataset(): WireEvent[] {
  const { a, b, c, d } = visitors;
  const slug = "Cannot read properties of undefined (reading 'slug')";
  return [
    pageview(a, sessions.a1, at(3, "10:00:00"), "/"),
    action(a, sessions.a1, at(3, "10:00:30"), "/", "click", { element: "cta" }),
    pageview(a, sessions.a1, at(3, "10:00:40"), "/pricing"),
    pageview(a, sessions.a2, at(1, "09:00:00"), "/blog/post"),
    pageview(b, sessions.b1, at(2, "12:00:00"), "/"),
    pageview(b, sessions.b1, at(2, "12:01:00"), "/docs"),
    action(b, sessions.b1, at(2, "12:01:30"), "/docs", "signup", { plan: "pro" }),
    pageview(c, sessions.c1, at(1, "15:00:00"), "/"),
    ...vitals(a, sessions.a1, at(3, "10:00:05"), "/", "lcp", 2000, 30),
    ...vitals(a, sessions.a1, at(3, "10:00:05"), "/", "inp", 150, 25),
    ...vitals(a, sessions.a1, at(3, "10:00:05"), "/", "cls", 0.05, 25),
    ...vitals(a, sessions.a1, at(3, "10:00:05"), "/", "fcp", 1500, 25),
    ...vitals(a, sessions.a1, at(3, "10:00:05"), "/", "ttfb", 600, 25),
    ...vitals(b, sessions.b1, at(2, "12:01:05"), "/docs", "lcp", 4500, 25, "img.hero"),
    error(a, sessions.a1, at(3, "10:00:35"), "/", "TypeError", slug),
    error(a, sessions.a2, at(1, "09:00:10"), "/blog/post", "TypeError", slug),
    error(b, sessions.b1, at(2, "12:00:20"), "/docs", "TypeError", slug),
    error(c, sessions.c1, at(1, "15:00:05"), "/", "RangeError", "Maximum call stack size exceeded"),
    pageview(d, sessions.d1, new Date(now.getTime() - 60_000).toISOString(), "/live"),
  ];
}

function chunk<Item>(items: Item[], size: number) {
  const batches: Item[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

/**
 * @name startParityApi
 * @description The v2 API on an in-memory PGlite database with a clock fixed at start, the `site`
 * project, an admin token and the fixed dataset ingested through `POST /v2/events`, plus a
 * `@spoar/client` whose fetch calls the app directly, the way the dashboard's server client
 * would over HTTP.
 *
 * @example
 * const { client } = await startParityApi();
 * const stats = await client.project("site").period("7d").stats();
 */
export async function startParityApi(): Promise<{
  client: Client<string>;
  anonymous: Client<string>;
}> {
  const database = new PGlite();
  const clock = fixedClock(now);
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
        { ipSecret: "x".repeat(48), rateLimit: { limit: 10_000, windowSeconds: 60 } },
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
      publicLimit: 10_000,
      clock: () => clock.now(),
      widget: stores.widget,
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
    widget: {
      store: stores.widget,
      logs: stores.logs,
      keys: adapters.projects,
      limiter: adapters.limiter,
      reportsPerMinute: 1000,
    },
  });

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
    "INSERT INTO projects (id, name, domain, visibility, allowed_origins, public_key, secret_key_hash) VALUES ($1, 'Site', 'site.test', 'public', '{}', $2, $3)",
    [project, publicKey, await hasher.sha256(secretKey)],
  );
  await database.query(
    "INSERT INTO api_tokens (id, name, token_hash, scope, project_ids) VALUES ('tok_parity', 'parity', $1, 'admin', NULL)",
    [await hasher.sha256(adminToken)],
  );

  for (const batch of chunk(fixedDataset(), 50)) {
    const response = await api.handle(
      new Request("http://localhost/v2/events", {
        method: "POST",
        headers: {
          "content-type": "text/plain;charset=UTF-8",
          origin: "https://site.test",
          "user-agent": chrome,
          "sec-ch-ua": '"Chromium";v="140"',
          "sec-fetch-mode": "no-cors",
          "accept-language": "nl-NL",
          "x-forwarded-for": "81.2.69.160",
          "x-project-key": publicKey,
        },
        body: JSON.stringify({ v: 1, sentAt: now.toISOString(), events: batch }),
      }),
    );
    if (response.status !== 202)
      throw new Error(`ingest answered ${response.status}: ${await response.text()}`);
  }

  function handle(url: string, init: RequestInit) {
    return api.handle(new Request(url, init));
  }

  return {
    client: createClient({ endpoint: "http://localhost", token: adminToken, fetch: handle }),
    anonymous: createClient({ endpoint: "http://localhost", fetch: handle }),
  };
}
