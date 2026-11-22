import { beforeEach, describe, expect, test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import { drizzleOps } from "../src/adapters/drizzle-ops";
import { drizzleSpeed } from "../src/adapters/drizzle-speed";
import { runMigrations } from "../src/db/migrate";
import { migrationsDirectory, readMigrations } from "../src/db/migration-files";
import { createClient } from "./pglite-client";

const now = new Date("2026-10-31T12:00:00Z");
const old = "2026-10-01T10:00:00Z";
const fresh = "2026-10-30T10:00:00Z";
const files = readMigrations(migrationsDirectory);
const apply = { dryRun: false, baseline: null };
const tables = ["events", "sessions", "web_vitals", "logs", "alert_deliveries"] as const;

let database: PGlite;

async function addProject(id: string, days: number, enabled: boolean) {
  await database.query(
    `INSERT INTO projects (id, name, domain, public_key, secret_key_hash, retention_days, retention_enabled)
     VALUES ($1, $1, $1, $2, 'hash', $3, $4)`,
    [id, `pk_${id}`, days, enabled],
  );
  await database.query(
    `INSERT INTO alert_targets (id, project_id, name, channel, events, settings)
     VALUES ($1, $2, 'mail', 'mail', '{issue.new}', '{}')`,
    [`target_${id}`, id],
  );
}

async function addRows(project: string, at: string, label: string) {
  await database.query(
    `INSERT INTO events (project_id, type, name, ts, path, visitor_id, session_id)
     VALUES ($1, 'pageview', 'pageview', $2, '/', 'v', $3)`,
    [project, at, label],
  );
  await database.query(
    `INSERT INTO sessions (project_id, session_id, last_event_at) VALUES ($1, $2, $3)`,
    [project, `${project}-${label}`, at],
  );
  await database.query(
    `INSERT INTO web_vitals (id, project_id, ts, metric, value, rating, path, device)
     VALUES ($1, $2, $3, 'lcp', 1000, 'good', '/', 'mobile')`,
    [`${project}-${label}`, project, at],
  );
  await database.query(
    `INSERT INTO logs (project, ts, level, kind, source, message)
     VALUES ($1, $2, 'info', 'ingest', 'api', 'line')`,
    [project, at],
  );
  await database.query(
    `INSERT INTO alert_deliveries (target_id, event_name, subject_id, payload, status, created_at)
     VALUES ($1, 'issue.new', $2, '{}', 'sent', $3)`,
    [`target_${project}`, label, at],
  );
}

async function count(table: (typeof tables)[number], project: string) {
  const owner = table === "logs" ? "project" : "project_id";
  const query =
    table === "alert_deliveries"
      ? `SELECT count(*)::int AS n FROM alert_deliveries d
         JOIN alert_targets t ON t.id = d.target_id WHERE t.project_id = $1`
      : `SELECT count(*)::int AS n FROM ${table} WHERE ${owner} = $1`;
  const result = await database.query<{ n: number }>(query, [project]);
  return result.rows[0]?.n;
}

beforeEach(async () => {
  database = new PGlite();
  const report = await runMigrations(createClient(database), files, apply);
  if (!report.ok) throw new Error(report.error.message);
  await addProject("disabled", 7, false);
  await addProject("short", 7, true);
  for (const project of ["disabled", "short"]) {
    await addRows(project, old, "old");
    await addRows(project, fresh, "fresh");
  }
});

describe("cleanup", () => {
  test("keeps everything of a disabled project even with retention_days set", async () => {
    const result = await drizzleOps(drizzle(database)).cleanup(now, 1000);
    expect(result.ok).toBe(true);
    for (const table of tables) expect(await count(table, "disabled")).toBe(2);
  });

  test("deletes only the older rows of an enabled project", async () => {
    const result = await drizzleOps(drizzle(database)).cleanup(now, 1000);
    expect(result.ok ? result.value.rowsDeleted : null).toBe(tables.length);
    for (const table of tables) expect(await count(table, "short")).toBe(1);
  });

  test("keeps a pending delivery past retention", async () => {
    await database.query(
      `INSERT INTO alert_deliveries (target_id, event_name, subject_id, payload, status, created_at)
       VALUES ('target_short', 'issue.new', 'waiting', '{}', 'pending', $1)`,
      [old],
    );
    await drizzleOps(drizzle(database)).cleanup(now, 1000);
    const left = await database.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM alert_deliveries WHERE subject_id = 'waiting'",
    );
    expect(left.rows).toEqual([{ n: 1 }]);
  });
});

describe("rollup", () => {
  const from = new Date("2026-10-01T00:00:00Z");
  const to = new Date("2026-11-01T00:00:00Z");

  async function rolledSamples() {
    const rolled = await database.query<{ samples: number }>(
      "SELECT samples FROM rollup_vitals WHERE project_id = 'short' AND day = '2026-10-24'",
    );
    return rolled.rows;
  }

  test("deletes raw speed rows only for an enabled project", async () => {
    const result = await drizzleSpeed(drizzle(database)).rollup(from, to, now);
    expect(result.ok ? result.value.rowsDeleted : null).toBe(1);
    expect(await count("web_vitals", "disabled")).toBe(2);
    expect(await count("web_vitals", "short")).toBe(1);
  });

  test("a rerun does not shrink a day retention already trimmed", async () => {
    const speed = drizzleSpeed(drizzle(database));
    await database.query(
      `INSERT INTO web_vitals (id, project_id, ts, metric, value, rating, path, device)
       VALUES ('short-later', 'short', '2026-10-24T20:00:00Z', 'lcp', 1000, 'good', '/', 'mobile'),
         ('short-earlier', 'short', '2026-10-24T04:00:00Z', 'lcp', 1000, 'good', '/', 'mobile')`,
    );
    await speed.rollup(from, to, new Date("2026-10-25T00:00:00Z"));
    await speed.rollup(from, to, now);
    expect(await rolledSamples()).toEqual([{ samples: 2 }]);
  });

  test("a rerun after turning retention off keeps the trimmed day", async () => {
    const speed = drizzleSpeed(drizzle(database));
    await database.query(
      `INSERT INTO web_vitals (id, project_id, ts, metric, value, rating, path, device)
       VALUES ('short-later', 'short', '2026-10-24T20:00:00Z', 'lcp', 1000, 'good', '/', 'mobile'),
         ('short-earlier', 'short', '2026-10-24T04:00:00Z', 'lcp', 1000, 'good', '/', 'mobile')`,
    );
    await speed.rollup(from, to, new Date("2026-10-25T00:00:00Z"));
    await speed.rollup(from, to, now);
    await database.query("UPDATE projects SET retention_enabled = false WHERE id = 'short'");
    await speed.rollup(from, to, now);
    expect(await rolledSamples()).toEqual([{ samples: 2 }]);
  });
});

describe("migration 0043", () => {
  const before = files.filter((file) => file.name < "0043");
  const migration = files.find((file) => file.name.startsWith("0043"));

  async function legacyDatabase() {
    const legacy = new PGlite();
    const report = await runMigrations(createClient(legacy), before, apply);
    if (!report.ok) throw new Error(report.error.message);
    await legacy.exec(`INSERT INTO projects (id, name, domain, public_key, secret_key_hash, retention_days) VALUES
      ('default', 'd', 'd.test', 'pk_d', 'x', 90),
      ('custom', 'c', 'c.test', 'pk_c', 'x', 30)`);
    return legacy;
  }

  async function stored(legacy: PGlite) {
    const rows = await legacy.query<{
      id: string;
      retention_days: number;
      retention_enabled: boolean;
    }>("SELECT id, retention_days, retention_enabled FROM projects ORDER BY id");
    return rows.rows;
  }

  test("enables custom values, leaves 90 off and keeps retention_days", async () => {
    const legacy = await legacyDatabase();
    await legacy.exec(migration?.sql ?? "");
    expect(await stored(legacy)).toEqual([
      { id: "custom", retention_days: 30, retention_enabled: true },
      { id: "default", retention_days: 90, retention_enabled: false },
    ]);
  });

  test("a rerun changes nothing", async () => {
    const legacy = await legacyDatabase();
    await legacy.exec(migration?.sql ?? "");
    const first = await stored(legacy);
    await legacy.exec(migration?.sql ?? "");
    expect(await stored(legacy)).toEqual(first);
  });

  test("an admin's later change survives a rerun", async () => {
    const legacy = await legacyDatabase();
    await legacy.exec(migration?.sql ?? "");
    await legacy.exec(`UPDATE projects SET retention_enabled = false WHERE id = 'custom'`);
    await legacy.exec(`UPDATE projects SET retention_days = 45 WHERE id = 'default'`);
    await legacy.exec(migration?.sql ?? "");
    expect(await stored(legacy)).toEqual([
      { id: "custom", retention_days: 30, retention_enabled: false },
      { id: "default", retention_days: 45, retention_enabled: false },
    ]);
  });

  test("the old API's insert still works after the migration", async () => {
    const legacy = await legacyDatabase();
    await legacy.exec(migration?.sql ?? "");
    await legacy.exec(`INSERT INTO projects (id, name, domain, public_key, secret_key_hash, retention_days)
      VALUES ('later', 'l', 'l.test', 'pk_l', 'x', 14)`);
    const rows = await stored(legacy);
    expect(rows.find((row) => row.id === "later")).toEqual({
      id: "later",
      retention_days: 14,
      retention_enabled: false,
    });
  });
});
