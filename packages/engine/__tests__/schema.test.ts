import { beforeAll, describe, expect, test } from "bun:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import type { PgTable } from "drizzle-orm/pg-core";

import { runMigrations } from "../src/db/migrate";
import { migrationsDirectory, readMigrations } from "../src/db/migration-files";
import * as schema from "../src/db/schema";
import { createClient, createDatabase } from "./pglite-client";

type ColumnRow = {
  column_name: string;
  is_nullable: "YES" | "NO";
};

const tables: PgTable[] = Object.values(schema);
const database = createDatabase();

function describeColumns(rows: { name: string; nullable: boolean }[]) {
  return rows.map((row) => `${row.name}${row.nullable ? "" : " not null"}`).sort();
}

beforeAll(async () => {
  const report = await runMigrations(createClient(database), readMigrations(migrationsDirectory), {
    dryRun: false,
    baseline: null,
  });
  if (!report.ok) throw new Error(report.error.message);
});

describe("schema.ts matches the migrated database", () => {
  for (const table of tables) {
    const config = getTableConfig(table);
    test(config.name, async () => {
      const result = await database.query<ColumnRow>(
        "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
        [config.name],
      );
      const migrated = result.rows.map((row) => ({
        name: row.column_name,
        nullable: row.is_nullable === "YES",
      }));
      const declared = config.columns.map((column) => ({
        name: column.name,
        nullable: !column.notNull,
      }));
      expect(describeColumns(declared)).toEqual(describeColumns(migrated));
    });
  }
});
