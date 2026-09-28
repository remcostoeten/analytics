import { SQL } from "bun";

import { runMigrations } from "@remcostoeten/analytics-engine/db/migrate";
import type { MigrationClient, MigrationReport } from "@remcostoeten/analytics-engine/db/migrate";
import {
  migrationsDirectory,
  readMigrations,
} from "@remcostoeten/analytics-engine/db/migration-files";

type Options = {
  dryRun: boolean;
  baseline: string | null;
};

const usage =
  "Usage: DATABASE_URL=postgres://... bun scripts/migrate.ts [--dry-run] [--baseline <name>]";

/**
 * @name parseArguments
 * @description Reads `--dry-run` and `--baseline <name>` from the command line.
 *
 * @example
 * parseArguments(["--dry-run", "--baseline", "0008_add_rollup_daily"]);
 * // { dryRun: true, baseline: "0008_add_rollup_daily" }
 */
export function parseArguments(argv: string[]): Options {
  const baselineAt = argv.indexOf("--baseline");
  return {
    dryRun: argv.includes("--dry-run"),
    baseline: baselineAt === -1 ? null : (argv[baselineAt + 1] ?? null),
  };
}

function createClient(sql: SQL): MigrationClient {
  return {
    execute: async (statement) => {
      await sql.unsafe(statement);
    },
    applied: async () => {
      const rows: { name: string; checksum: string }[] =
        await sql`SELECT name, checksum FROM schema_migrations ORDER BY name`;
      return rows.map((row) => ({ name: row.name, checksum: row.checksum }));
    },
    record: async (migration) => {
      await sql`INSERT INTO schema_migrations (name, checksum) VALUES (${migration.name}, ${migration.checksum})`;
    },
  };
}

function printReport(report: MigrationReport) {
  const verb = report.dryRun ? "Would apply" : "Applied";
  for (const name of report.baselined)
    console.log(`${report.dryRun ? "Would baseline" : "Baselined"} ${name}`);
  for (const name of report.applied) console.log(`${verb} ${name}`);
  console.log(
    `${report.applied.length} to apply, ${report.baselined.length} baselined, ${report.alreadyApplied.length} already applied${report.dryRun ? " (dry run, nothing changed)" : ""}`,
  );
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(`DATABASE_URL is not set.\n${usage}`);
    process.exitCode = 1;
    return;
  }
  // Unnamed statements, so pooled connections such as Neon's pooler do not collide on names.
  const sql = new SQL(url, { prepare: false });
  try {
    const report = await runMigrations(
      createClient(sql),
      readMigrations(migrationsDirectory),
      parseArguments(process.argv.slice(2)),
    );
    if (report.ok) {
      printReport(report.value);
    } else {
      console.error(`${report.error.name}: ${report.error.message}`);
      process.exitCode = 1;
    }
  } finally {
    await sql.close();
  }
}

if (import.meta.main) await main();
