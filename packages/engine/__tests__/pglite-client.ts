import { PGlite } from "@electric-sql/pglite";

import type { AppliedMigration, MigrationClient } from "../src/db/migrate";

type Props = {
  name: string;
  checksum: string;
};

export function createDatabase() {
  return new PGlite();
}

export function createClient(database: PGlite): MigrationClient {
  return {
    execute: async (statement) => {
      await database.exec(statement);
    },
    applied: async () => {
      const result = await database.query<Props>(
        "SELECT name, checksum FROM schema_migrations ORDER BY name",
      );
      return result.rows;
    },
    record: async (migration: AppliedMigration) => {
      await database.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)", [
        migration.name,
        migration.checksum,
      ]);
    },
  };
}
