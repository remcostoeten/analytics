import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { runMigrations } from "@remcostoeten/analytics-engine/db/migrate";
import type { MigrationClient } from "@remcostoeten/analytics-engine/db/migrate";
import {
  migrationsDirectory,
  readMigrations,
} from "@remcostoeten/analytics-engine/db/migration-files";

import { parseArguments } from "../migrate";

const script = join(import.meta.dir, "../migrate.ts");
const port = 54000 + Math.floor(Math.random() * 1000);
const database = new PGlite();
const server = new PGLiteSocketServer({ db: database, port });
const url = `postgres://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable`;

function pgliteClient(db: PGlite): MigrationClient {
  return {
    execute: async (statement) => {
      await db.exec(statement);
    },
    applied: async () => [],
    record: async () => {},
  };
}

async function migrate(args: string[], env: { DATABASE_URL?: string }) {
  const child = Bun.spawn(["bun", script, ...args], {
    env: { PATH: process.env.PATH, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { stdout, stderr, code };
}

beforeAll(async () => {
  const legacy = readMigrations(migrationsDirectory).slice(0, 9);
  await runMigrations(pgliteClient(database), legacy, { dryRun: false, baseline: null });
  await database.exec("DROP TABLE schema_migrations");
  await database.exec(
    "INSERT INTO events (project_id, type, host) VALUES ('site', 'pageview', 'site.nl')",
  );
  await server.start();
});

afterAll(async () => {
  await server.stop();
  await database.close();
});

describe("parseArguments", () => {
  test("reads the flags", () => {
    expect(parseArguments([])).toEqual({ dryRun: false, baseline: null });
    expect(parseArguments(["--dry-run", "--baseline", "0008_add_rollup_daily"])).toEqual({
      dryRun: true,
      baseline: "0008_add_rollup_daily",
    });
  });
});

describe("scripts/migrate.ts against a Postgres server", () => {
  test("fails without DATABASE_URL", async () => {
    const result = await migrate([], {});
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("DATABASE_URL is not set");
  });

  test("a dry run lists the plan and changes nothing", async () => {
    const result = await migrate(["--dry-run", "--baseline", "0008_add_rollup_daily"], {
      DATABASE_URL: url,
    });
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Would apply 0009_add_projects");
    expect(result.stdout).toContain(
      "12 to apply, 9 baselined, 0 already applied (dry run, nothing changed)",
    );
    const projects = await database.query("SELECT to_regclass('public.projects') AS projects");
    expect(projects.rows).toEqual([{ projects: null }]);
  });

  test("applies 0009 to 0020 once, then does nothing", async () => {
    const first = await migrate(["--baseline", "0008_add_rollup_daily"], { DATABASE_URL: url });
    expect(first.stderr).toBe("");
    expect(first.stdout).toContain("12 to apply, 9 baselined, 0 already applied");
    const second = await migrate([], { DATABASE_URL: url });
    expect(second.stdout.trim()).toBe("0 to apply, 0 baselined, 21 already applied");
    const projects = await database.query("SELECT id, domain FROM projects");
    expect(projects.rows).toEqual([{ id: "site", domain: "site.nl" }]);
  }, 60000);
});
