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
import { defaultEnrichers } from "../src/enrichers";
import { createEngine } from "../src/pipeline";
import { defaultStages } from "../src/stages";
import { project, settings } from "./batch";
import { createClient } from "./pglite-client";

type Batch = {
  origin: string;
  userAgent: string;
  ip: string;
  events: unknown[];
};

type Fixture = {
  receivedAt: string;
  batches: Batch[];
};

type Row = { [column: string]: unknown };

const fixtures = join(import.meta.dir, "fixtures");
const fixture: Fixture = JSON.parse(readFileSync(join(fixtures, "parity-batches.json"), "utf8"));
const legacy: { events: Row[]; sessions: Row[]; visitors: Row[] } = JSON.parse(
  readFileSync(join(fixtures, "legacy-rows.json"), "utf8"),
);

const database = new PGlite();
const clock = fixedClock(new Date(fixture.receivedAt));
const engine = createEngine(
  {
    ...pgliteAdapters(database, clock),
    geo: maxmindGeo(readFileSync(join(fixtures, "GeoIP2-City-Test.mmdb")), null),
    hasher: webCryptoHasher(),
    clock,
    logger: memoryLogger(),
  },
  { stages: defaultStages, signals: [], enrichers: defaultEnrichers, dimensions: [] },
  settings,
);

function isoDates(row: Row): Row {
  return Object.fromEntries(
    Object.entries(row).map(([column, value]) => [
      column,
      value instanceof Date ? value.toISOString() : value,
    ]),
  );
}

async function rows(query: string) {
  return (await database.query<Row>(query)).rows.map(isoDates);
}

beforeAll(async () => {
  const report = await runMigrations(createClient(database), readMigrations(migrationsDirectory), {
    dryRun: false,
    baseline: null,
  });
  if (!report.ok) throw new Error(report.error.message);
  await database.query(
    "INSERT INTO projects (id, name, domain, public_key, secret_key_hash) VALUES ($1, $1, $1, $2, 'unused')",
    [project.id, project.publicKey],
  );
  for (const batch of fixture.batches) {
    const result = await engine.ingest({
      credentials: { publicKey: project.publicKey, secretKey: null },
      receivedAt: fixture.receivedAt,
      sentAt: fixture.receivedAt,
      request: {
        headers: new Headers({
          origin: batch.origin,
          "user-agent": batch.userAgent,
          "x-forwarded-for": batch.ip,
        }),
        adminSession: false,
      },
      events: batch.events,
    });
    if (!result.ok || result.value.rejected.length > 0) throw new Error(JSON.stringify(result));
  }
});

describe("parity with the v1 ingest handler", () => {
  test("events match on every legacy column", async () => {
    expect(
      await rows(
        "SELECT project_id, type, ts, path, referrer, origin, host, is_localhost, is_preview, bot_detected, is_internal, ua, lang, device_type, ip_hash, visitor_id, session_id, country, region, city, latitude, longitude, timezone, postal_code, continent, asn, as_org, fingerprint, meta FROM events ORDER BY fingerprint",
      ),
    ).toEqual(legacy.events);
  });

  test("sessions match", async () => {
    expect(
      await rows(
        "SELECT project_id, session_id, visitor_id, started_at, last_event_at, entry_path, exit_path, referrer, pageviews, events, duration_ms, country, device_type, is_internal FROM sessions ORDER BY session_id",
      ),
    ).toEqual(legacy.sessions);
  });

  test("visitors match", async () => {
    expect(
      await rows(
        "SELECT project_id, fingerprint, visit_count, is_internal, device_type, os, os_version, browser, browser_version, screen_resolution, timezone, language, country, region, city, ip_hash, ua, meta FROM visitors ORDER BY fingerprint",
      ),
    ).toEqual(legacy.visitors);
  });
});
