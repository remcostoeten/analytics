import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { Migration } from "./migrate";

export const migrationsDirectory = join(import.meta.dir, "migrations");

// Matches numbered migration files such as 0009_add_projects.sql.
const migrationFilePattern = /^(\d{4}_[a-z0-9_]+)\.sql$/;

/**
 * @name readMigrations
 * @description Reads the numbered SQL files in a migrations folder in order, with a sha256
 * checksum of each file so a changed migration is caught.
 *
 * @example
 * const files = readMigrations(migrationsDirectory);
 */
export function readMigrations(directory: string): Migration[] {
  return readdirSync(directory)
    .map((file) => migrationFilePattern.exec(file)?.[1])
    .filter((name) => name !== undefined)
    .sort()
    .map((name) => {
      const sql = readFileSync(join(directory, `${name}.sql`), "utf8");
      return { name, sql, checksum: createHash("sha256").update(sql).digest("hex") };
    });
}
