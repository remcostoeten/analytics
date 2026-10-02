import { describe, expect, test } from "bun:test";

import { planMigrations, runMigrations } from "../src/db/migrate";
import { migrationsDirectory, readMigrations } from "../src/db/migration-files";
import { createClient, createDatabase } from "./pglite-client";

const files = readMigrations(migrationsDirectory);
const names = files.map((file) => file.name);
const baseline = "0008_add_rollup_daily";
const legacy = files.slice(0, names.indexOf(baseline) + 1);
const apply = { dryRun: false, baseline: null };

describe("readMigrations", () => {
  test("reads 0000 to 0031 in order", () => {
    expect(names[0]).toBe("0000_create_events");
    expect(names.at(-1)).toBe("0031_add_annotations");
    expect(names).toHaveLength(32);
    expect(names).toEqual([...names].sort());
  });
});

describe("runMigrations on a fresh database", () => {
  test("applies every file, then a second run is a no-op", async () => {
    const client = createClient(createDatabase());
    const first = await runMigrations(client, files, apply);
    expect(first.ok && first.value.applied).toEqual(names);
    const second = await runMigrations(client, files, apply);
    expect(second.ok && second.value.applied).toEqual([]);
    expect(second.ok && second.value.alreadyApplied).toEqual(names);
  });

  test("a dry run reports the plan and changes nothing", async () => {
    const database = createDatabase();
    const client = createClient(database);
    const report = await runMigrations(client, files, { dryRun: true, baseline: null });
    expect(report.ok && report.value.applied).toEqual(names);
    const tables = await database.query("SELECT to_regclass('public.events') AS events");
    expect(tables.rows).toEqual([{ events: null }]);
    expect(await client.applied()).toEqual([]);
  });

  test("a failing statement stops the run and names the file", async () => {
    const client = createClient(createDatabase());
    const broken = [
      ...files.slice(0, 1),
      { name: "0001_broken", sql: "SELECT nope;", checksum: "x" },
    ];
    const report = await runMigrations(client, broken, apply);
    expect(report.ok ? null : report.error.name).toBe("0001_broken");
    expect((await client.applied()).map((migration) => migration.name)).toEqual([names[0]]);
  });
});

describe("runMigrations on a database v1 already migrated", () => {
  async function legacyDatabase() {
    const database = createDatabase();
    const setup = createClient(database);
    for (const file of legacy) await runMigrations(setup, [file], apply);
    await database.exec("DROP TABLE schema_migrations");
    await database.exec(`
      INSERT INTO events (project_id, type, host, meta, bot_detected, session_id) VALUES
        ('site', 'pageview', 'site.nl', NULL, false, 's1'),
        ('site', 'event', 'site.nl', '{"eventName":"signup"}', false, 's1'),
        ('site', 'pageview', 'www.site.nl', NULL, true, 's2'),
        ('docs', 'pageview', NULL, NULL, false, 's3');
      INSERT INTO sessions (project_id, session_id, pageviews) VALUES ('site', 's1', 2), ('site', 's2', 1);
    `);
    return database;
  }

  test("baselines 0000 to 0008 and applies 0009 to 0021", async () => {
    const database = await legacyDatabase();
    const report = await runMigrations(createClient(database), files, { dryRun: false, baseline });
    expect(report.ok && report.value.baselined).toEqual(legacy.map((file) => file.name));
    expect(report.ok && report.value.applied).toEqual(names.slice(legacy.length));
  });

  test("backfills projects, event names, bot scores and bounces", async () => {
    const database = await legacyDatabase();
    await runMigrations(createClient(database), files, { dryRun: false, baseline });

    const projects = await database.query(
      "SELECT id, domain, visibility, public_key LIKE 'pk_live_%' AS keyed FROM projects ORDER BY id",
    );
    expect(projects.rows).toEqual([
      { id: "docs", domain: "docs", visibility: "public", keyed: true },
      { id: "site", domain: "site.nl", visibility: "public", keyed: true },
    ]);

    const events = await database.query(
      "SELECT name, bot_score, schema_version FROM events ORDER BY id",
    );
    expect(events.rows).toEqual([
      { name: "pageview", bot_score: 0, schema_version: 0 },
      { name: "signup", bot_score: 0, schema_version: 0 },
      { name: "pageview", bot_score: 100, schema_version: 0 },
      { name: "pageview", bot_score: 0, schema_version: 0 },
    ]);

    const sessions = await database.query(
      "SELECT session_id, is_bounce FROM sessions ORDER BY session_id",
    );
    expect(sessions.rows).toEqual([
      { session_id: "s1", is_bounce: false },
      { session_id: "s2", is_bounce: true },
    ]);
  });

  test("keeps the global session id index that v1 upserts on", async () => {
    const database = await legacyDatabase();
    await runMigrations(createClient(database), files, { dryRun: false, baseline });
    const indexes = await database.query(
      "SELECT indexname FROM pg_indexes WHERE tablename = 'sessions' AND indexdef LIKE 'CREATE UNIQUE%' ORDER BY indexname",
    );
    expect(indexes.rows).toEqual([
      { indexname: "idx_sessions_session_id" },
      { indexname: "sessions_pkey" },
      { indexname: "sessions_project_session_uidx" },
    ]);
  });
});

describe("planMigrations", () => {
  test("rejects a migration that changed after it was applied", () => {
    const [first] = files;
    if (!first) throw new Error("no migrations");
    const plan = planMigrations(files, [{ name: first.name, checksum: "old" }], null);
    expect(plan.ok ? null : plan.error.kind).toBe("changed");
  });

  test("rejects an unknown baseline", () => {
    const plan = planMigrations(files, [], "0099_missing");
    expect(plan.ok ? null : plan.error.kind).toBe("unknown-baseline");
  });
});
