import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

import { splitStatements } from "./split-statements";

export type Migration = {
  name: string;
  sql: string;
  checksum: string;
};

export type AppliedMigration = {
  name: string;
  checksum: string;
};

export type MigrationClient = {
  execute: (statement: string) => Promise<void>;
  applied: () => Promise<AppliedMigration[]>;
  record: (migration: AppliedMigration) => Promise<void>;
};

export type MigrationPlan = {
  pending: Migration[];
  baselined: Migration[];
  alreadyApplied: string[];
};

export type MigrationReport = {
  applied: string[];
  baselined: string[];
  alreadyApplied: string[];
  dryRun: boolean;
};

export type MigrationFailure =
  | { kind: "changed"; name: string; message: string }
  | { kind: "unknown-baseline"; name: string; message: string }
  | { kind: "failed"; name: string; message: string };

export const migrationsTable = "schema_migrations";

export const createMigrationsTable = `CREATE TABLE IF NOT EXISTS ${migrationsTable} (
  name text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
)`;

/**
 * @name planMigrations
 * @description Decides which migration files still need to run. Files already recorded are
 * skipped, a recorded file whose checksum changed is an error, and with a baseline every file up
 * to and including it is recorded without running, for databases that already have that schema.
 *
 * @example
 * const plan = planMigrations(files, await client.applied(), "0008_add_rollup_daily");
 * if (plan.ok) console.log(plan.value.pending.map((migration) => migration.name));
 */
export function planMigrations(
  files: Migration[],
  applied: AppliedMigration[],
  baseline: Nullable<string>,
): Result<MigrationPlan, MigrationFailure> {
  const recorded = new Map(applied.map((migration) => [migration.name, migration.checksum]));
  const baselineIndex = baseline ? files.findIndex((file) => file.name === baseline) : -1;
  if (baseline && baselineIndex === -1) {
    return err({
      kind: "unknown-baseline",
      name: baseline,
      message: `No migration named ${baseline} to use as a baseline`,
    });
  }
  const plan: MigrationPlan = { pending: [], baselined: [], alreadyApplied: [] };
  for (const [index, file] of files.entries()) {
    const checksum = recorded.get(file.name);
    if (checksum === undefined) {
      if (index <= baselineIndex) plan.baselined.push(file);
      else plan.pending.push(file);
    } else if (checksum !== file.checksum) {
      return err({
        kind: "changed",
        name: file.name,
        message: `${file.name} changed after it was applied; add a new migration instead`,
      });
    } else {
      plan.alreadyApplied.push(file.name);
    }
  }
  return ok(plan);
}

function describe(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function applyMigration(client: MigrationClient, migration: Migration) {
  for (const statement of splitStatements(migration.sql)) {
    try {
      await client.execute(statement);
    } catch (error) {
      return err({ kind: "failed" as const, name: migration.name, message: describe(error) });
    }
  }
  await client.record({ name: migration.name, checksum: migration.checksum });
  return ok(migration.name);
}

/**
 * @name runMigrations
 * @description Applies pending migrations in file order, one statement at a time, and records
 * each in `schema_migrations`. With `dryRun` it only reports what it would do. A second run is a
 * no-op.
 *
 * @example
 * const report = await runMigrations(client, files, { dryRun: false, baseline: null });
 * if (!report.ok) console.error(report.error.message);
 */
export async function runMigrations(
  client: MigrationClient,
  files: Migration[],
  options: { dryRun: boolean; baseline: Nullable<string> },
): Promise<Result<MigrationReport, MigrationFailure>> {
  await client.execute(createMigrationsTable);
  const plan = planMigrations(files, await client.applied(), options.baseline);
  if (!plan.ok) return plan;
  const { pending, baselined, alreadyApplied } = plan.value;
  const report: MigrationReport = {
    applied: pending.map((migration) => migration.name),
    baselined: baselined.map((migration) => migration.name),
    alreadyApplied,
    dryRun: options.dryRun,
  };
  if (options.dryRun) return ok(report);
  for (const migration of baselined) {
    await client.record({ name: migration.name, checksum: migration.checksum });
  }
  for (const migration of pending) {
    const applied = await applyMigration(client, migration);
    if (!applied.ok) return applied;
  }
  return ok(report);
}
