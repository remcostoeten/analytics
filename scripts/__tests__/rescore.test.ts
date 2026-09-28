import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { runMigrations } from "@remcostoeten/analytics-engine/db/migrate";
import {
  migrationsDirectory,
  readMigrations,
} from "@remcostoeten/analytics-engine/db/migration-files";

import { parseArguments } from "../rescore";

const script = join(import.meta.dir, "../rescore.ts");
const port = 55000 + Math.floor(Math.random() * 1000);
const database = new PGlite();
const server = new PGLiteSocketServer({ db: database, port });
const url = `postgres://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable`;

async function rescore(args: string[]) {
  const child = Bun.spawn(["bun", script, ...args], {
    env: { PATH: process.env.PATH, DATABASE_URL: url },
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

async function score() {
  const result = await database.query<{ bot_score: number; bot_reasons: string[] }>(
    "SELECT bot_score, bot_reasons FROM events WHERE fingerprint = 'curl-event'",
  );
  return result.rows;
}

beforeAll(async () => {
  await runMigrations(
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
  await database.query(
    "INSERT INTO events (project_id, type, name, ts, ua, schema_version, fingerprint) VALUES ('site', 'pageview', 'pageview', '2026-09-27T12:00:00Z', 'curl/8.5.0', 1, 'curl-event')",
  );
  await server.start();
});

afterAll(async () => {
  await server.stop();
});

describe("rescore script", () => {
  test("reports a dry run, then rescores", async () => {
    const dry = await rescore(["--from", "2026-09-27", "--to", "2026-09-28", "--dry-run"]);
    expect(dry.stderr).toBe("");
    expect(dry.stdout).toContain("1 events scanned, 1 rescored (dry run, nothing changed)");
    expect(await score()).toEqual([{ bot_score: 0, bot_reasons: [] }]);

    const run = await rescore(["--from", "2026-09-27", "--to", "2026-09-28"]);
    expect(run.code).toBe(0);
    expect(run.stdout).toContain("1 events scanned, 1 rescored");
    expect(await score()).toEqual([{ bot_score: 100, bot_reasons: ["ua_automation"] }]);
  });

  test("fails without --from", async () => {
    const result = await rescore([]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("--from needs a date");
  });
});

const now = new Date("2026-09-28T11:30:00.000Z");

describe("parseArguments", () => {
  test.each([
    [
      "a range with flags",
      ["--from", "2026-09-01", "--to", "2026-09-28", "--dry-run", "--include-legacy"],
      {
        from: "2026-09-01T00:00:00.000Z",
        to: "2026-09-28T00:00:00.000Z",
        dryRun: true,
        includeLegacy: true,
      },
    ],
    [
      "--to defaults to the end of today",
      ["--from", "2026-09-27"],
      {
        from: "2026-09-27T00:00:00.000Z",
        to: "2026-09-29T00:00:00.000Z",
        dryRun: false,
        includeLegacy: false,
      },
    ],
  ])("%s", (_, argv, expected) => {
    const parsed = parseArguments(argv, now);
    expect(
      parsed.ok && {
        ...parsed.value,
        from: parsed.value.from.toISOString(),
        to: parsed.value.to.toISOString(),
      },
    ).toEqual(expected);
  });

  test.each([
    ["no --from", [], "--from needs a date"],
    ["a bad --from", ["--from", "yesterday"], "--from needs a date"],
    ["a bad --to", ["--from", "2026-09-01", "--to", "2026-13-45"], "--to needs a date"],
    [
      "--to before --from",
      ["--from", "2026-09-10", "--to", "2026-09-01"],
      "--to must be after --from",
    ],
  ])("rejects %s", (_, argv, message) => {
    const parsed = parseArguments(argv, now);
    expect(!parsed.ok && parsed.error).toContain(message);
  });
});
