import { beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";

import { maxmindGeo } from "../src/adapters/maxmind";
import { fixedClock, memoryLogger } from "../src/adapters/memory";
import { pgliteAdapters } from "../src/adapters/pglite";
import { webCryptoHasher } from "../src/adapters/system";
import { runMigrations } from "../src/db/migrate";
import { migrationsDirectory, readMigrations } from "../src/db/migration-files";
import { defineSignal } from "../src/define";
import { defaultEnrichers } from "../src/enrichers";
import { createEngine } from "../src/pipeline";
import { defaultStages } from "../src/stages";
import { browserRequest, now, project, settings } from "./batch";
import { createClient } from "./pglite-client";

type EventRow = {
  name: string;
  type: string;
  fingerprint: string;
  schema_version: number;
  bot_score: number;
  bot_reasons: string[];
  meta: { [key: string]: string };
  ts: Date;
  country: string;
  region: string;
  city: string;
  continent: string;
  ip_hash: string;
  host: string;
  device_type: string;
  channel: string;
  referrer_domain: string;
  is_internal: boolean;
};

type PlaceRow = {
  id: number;
  kind: string;
  country: string;
  names: { [locale: string]: string };
};

type SessionRow = {
  session_id: string;
  entry_path: string;
  exit_path: string;
  pageviews: number;
  events: number;
  duration_ms: number;
  channel: string;
  utm_source: string;
  is_internal: boolean;
};

type VisitorRow = {
  fingerprint: string;
  visit_count: number;
  browser: string;
  is_internal: boolean;
  meta: { [key: string]: unknown } | null;
};

const chrome =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const database = new PGlite();
const clock = fixedClock(now);
const adapters = pgliteAdapters(database, clock);
const signup = defineSignal({
  name: "client_no_input",
  weight: 60,
  replayable: true,
  detect: (draft) => draft.event.name === "signup",
});
const engine = createEngine(
  {
    ...adapters,
    geo: maxmindGeo(readFileSync(join(import.meta.dir, "fixtures", "GeoIP2-City-Test.mmdb")), null),
    hasher: webCryptoHasher(),
    clock,
    logger: memoryLogger(),
  },
  { stages: defaultStages, signals: [signup], enrichers: defaultEnrichers, dimensions: [] },
  settings,
);

beforeAll(async () => {
  const report = await runMigrations(createClient(database), readMigrations(migrationsDirectory), {
    dryRun: false,
    baseline: null,
  });
  if (!report.ok) throw new Error(report.error.message);
  await database.query(
    "INSERT INTO projects (id, name, domain, allowed_origins, public_key, secret_key_hash) VALUES ($1, $1, $1, $2, $3, $4)",
    [project.id, project.allowedOrigins, project.publicKey, "unused"],
  );
});

describe("engine on PGlite", () => {
  test("stores a batch with the v2 and legacy columns, then dedupes a retry", async () => {
    const request = browserRequest({ "user-agent": chrome });
    expect(await engine.ingest(request)).toEqual({
      ok: true,
      value: { accepted: 2, duplicates: 0, rejected: [] },
    });
    expect(await engine.ingest(request)).toEqual({
      ok: true,
      value: { accepted: 0, duplicates: 2, rejected: [] },
    });

    const result = await database.query<EventRow>(
      "SELECT name, type, fingerprint, schema_version, bot_score, bot_reasons, meta, ts, country, region, city, continent, ip_hash, host, device_type, channel, referrer_domain, is_internal FROM events ORDER BY ts",
    );
    const [pageview, signupRow] = result.rows;
    expect(pageview).toMatchObject({
      name: "pageview",
      type: "pageview",
      fingerprint: "01928c3e-7a4b-7c1d-9f00-2b7c1e5d8a11",
      schema_version: 1,
      bot_score: 0,
      bot_reasons: [],
      country: "GB",
      region: "ENG",
      city: "London",
      continent: "EU",
      host: "remcostoeten.nl",
      device_type: "desktop",
      channel: "social",
      referrer_domain: "news.ycombinator.com",
      is_internal: false,
      meta: {
        screenSize: "1440x900",
        viewport: "1280x720",
        timezone: "Europe/Amsterdam",
        utmSource: "hn",
        browser: "Chrome",
        browserVersion: "140.0.0.0",
        os: "macOS",
        osVersion: "10.15.7",
      },
    });
    expect(pageview?.ts.toISOString()).toBe("2026-09-27T16:39:58.912Z");
    expect(pageview?.ip_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(signupRow).toMatchObject({
      name: "signup",
      type: "event",
      bot_score: 60,
      bot_reasons: ["client_no_input"],
      device_type: "bot",
      meta: { plan: "pro", eventName: "signup" },
    });

    const sessions = await database.query<SessionRow>(
      "SELECT session_id, entry_path, exit_path, pageviews, events, duration_ms, channel, utm_source, is_internal FROM sessions",
    );
    expect(sessions.rows).toEqual([
      {
        session_id: "f1a2b3c4-d5e6-4f70-8a91-b2c3d4e5f607",
        entry_path: "/blog/rebuilding-analytics",
        exit_path: "/blog/rebuilding-analytics",
        pageviews: 1,
        events: 2,
        duration_ms: 1489,
        channel: "social",
        utm_source: "hn",
        is_internal: false,
      },
    ]);
  });

  test("stores the place ids and accuracy, and names the places once", async () => {
    const located = await database.query<{
      region_id: number;
      city_id: number;
      accuracy_km: number;
    }>("SELECT DISTINCT region_id, city_id, accuracy_km FROM events WHERE country = 'GB'");
    expect(located.rows).toEqual([{ region_id: 6269131, city_id: 2643743, accuracy_km: 100 }]);

    const places = await database.query<PlaceRow>(
      "SELECT id, kind, country, names FROM geo_places ORDER BY id",
    );
    expect(places.rows.map(({ id, kind, country }) => ({ id, kind, country }))).toEqual([
      { id: 2635167, kind: "country", country: "GB" },
      { id: 2643743, kind: "city", country: "GB" },
      { id: 6269131, kind: "region", country: "GB" },
    ]);
    expect(places.rows[1]?.names).toMatchObject({ en: "London", es: "Londres" });
  });

  test("keeps a visitor internal once an admin session marks it", async () => {
    const [pageview] = browserRequest().events as { [key: string]: unknown }[];
    function event(id: string, session: string) {
      return { ...pageview, id, session };
    }
    const admin = {
      ...browserRequest({ "user-agent": chrome }),
      request: { ...browserRequest().request, adminSession: true },
      events: [event("01928c3e-7a4b-7c1d-9f00-000000000001", "session-admin")],
    };
    const later = {
      ...browserRequest({ "user-agent": chrome }),
      events: [event("01928c3e-7a4b-7c1d-9f00-000000000002", "session-later")],
    };
    await engine.ingest(admin);
    await engine.ingest(later);

    const events = await database.query<{ fingerprint: string; is_internal: boolean }>(
      "SELECT fingerprint, is_internal FROM events WHERE fingerprint LIKE '%00000000000_' ORDER BY fingerprint",
    );
    expect(events.rows.map((row) => row.is_internal)).toEqual([true, true]);
    const sessions = await database.query<{ is_internal: boolean }>(
      "SELECT is_internal FROM sessions WHERE session_id = 'session-later'",
    );
    expect(sessions.rows).toEqual([{ is_internal: true }]);
    const visitors = await database.query<VisitorRow>(
      "SELECT fingerprint, visit_count, browser, is_internal, meta FROM visitors",
    );
    expect(visitors.rows).toEqual([
      {
        fingerprint: "8c4e1f0a-2b3c-4d5e-8f60-718293a4b5c6",
        visit_count: 3,
        browser: "Chrome",
        is_internal: true,
        meta: null,
      },
    ]);
  });

  test("merges identify props into the visitor's identity", async () => {
    const [pageview] = browserRequest().events as { [key: string]: unknown }[];
    await engine.ingest({
      ...browserRequest(),
      events: [
        {
          ...pageview,
          id: "01928c3e-7a4b-7c1d-9f00-000000000003",
          name: "identify",
          props: { userId: "user_123", plan: "pro" },
        },
      ],
    });
    const visitors = await database.query<VisitorRow>("SELECT meta FROM visitors");
    expect(visitors.rows[0]?.meta).toEqual({ identity: { userId: "user_123", plan: "pro" } });
  });

  test("keeps the exit page of the latest event when an older one arrives late", async () => {
    const [pageview] = browserRequest().events as { [key: string]: unknown }[];
    function event(id: string, path: string, ts: string) {
      return { ...pageview, id, ts, session: "session-late", page: { path } };
    }
    await engine.ingest({
      ...browserRequest(),
      events: [
        event("01928c3e-7a4b-7c1d-9f00-000000000010", "/latest", "2026-09-27T16:39:59.000Z"),
      ],
    });
    await engine.ingest({
      ...browserRequest(),
      events: [event("01928c3e-7a4b-7c1d-9f00-000000000011", "/older", "2026-09-27T16:39:50.000Z")],
    });
    const sessions = await database.query<{ exit_path: string; events: number }>(
      "SELECT exit_path, events FROM sessions WHERE session_id = 'session-late'",
    );
    expect(sessions.rows).toEqual([{ exit_path: "/latest", events: 2 }]);
  });

  test("counts rate limit hits in the database", async () => {
    const decisions = [];
    for (let hit = 0; hit < 3; hit += 1) {
      decisions.push(await adapters.limiter.hit("ingest:abc", 2, 60));
    }
    expect(decisions.map((decision) => [decision.allowed, decision.hits])).toEqual([
      [true, 1],
      [true, 2],
      [false, 3],
    ]);
    expect(decisions[2]?.retryAfterSeconds).toBe(60);
  });

  test("finds projects by public key and secret hash", async () => {
    expect(await adapters.projects.byPublicKey(project.publicKey)).toEqual({
      ok: true,
      value: { id: project.id, allowedOrigins: project.allowedOrigins },
    });
    expect(await adapters.projects.bySecretHash("missing")).toEqual({ ok: true, value: null });
  });
});
