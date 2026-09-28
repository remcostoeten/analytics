# @remcostoeten/analytics-engine

The v2 ingest engine. Private: `exports` point at `src/`, so there is no build step. For now it holds the database layer; the pipeline, ports and adapters arrive in epic E2.1.

## Database

- `src/db/migrations/`: numbered SQL files. `0000` to `0008` are copies of v1's migrations, so a fresh database gets the full schema. `0009` to `0020` are the v2 additions. Every v2 file is idempotent.
- `src/db/schema.ts`: the Drizzle schema for every table. `__tests__/schema.test.ts` migrates a fresh PGlite database and fails if any table's columns or nullability differ from `schema.ts`.
- `src/db/migrate.ts`: plans and applies migrations one statement at a time, the way psql does, and records each file with its checksum in `schema_migrations`. A file changed after it was applied is an error.

Apply them with the root script, never on deploy:

```sh
DATABASE_URL=postgres://... bun run migrate --dry-run --baseline 0008_add_rollup_daily
DATABASE_URL=postgres://... bun run migrate --baseline 0008_add_rollup_daily
```

`--baseline <name>` records every file up to and including `<name>` as applied without running it. It is for databases whose v1 schema was applied by hand before `schema_migrations` existed, such as Neon and the demo database. It is needed only on the first run.
