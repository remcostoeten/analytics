# @remcostoeten/analytics-engine

The v2 ingest engine. Private: `exports` point at `src/`, so there is no build step. It has no runtime of its own: hosts such as `apps/api` pass in adapters for its ports.

## Core

- `define.ts`: `defineStage`, `defineSignal`, `defineEnricher` and `defineDimension`. Each returns a plain object.
- `pipeline.ts`: `createEngine(ports, registry)` returns `{ ingest, rescore }`.
  - `ingest` runs each event of a batch through the stages in order. The first failing stage rejects that event by index, and a throwing stage becomes `INTERNAL` with its stack logged. Accepted events are stored in one call.
  - `rescore` reruns only the stages marked `rescores`.
- `stages/`: `enrichStage` merges the registered enrichers in order. `botScoreStage` sums the weights of the signals that fire, capped at 100. The remaining stages arrive in E2.2.
- `ports/`: `EventStore`, `GeoLookup`, `RateLimiter`, `Hasher`, `Clock` and `Logger` as plain types.

## Adapters

Each adapter has its own export path, so a host only bundles what it uses.

| Import | Provides |
| --- | --- |
| `@remcostoeten/analytics-engine/adapters/memory` | Every port in memory, for tests |
| `@remcostoeten/analytics-engine/adapters/system` | `systemClock`, `webCryptoHasher` and `jsonLogger` (one JSON line per entry) |
| `@remcostoeten/analytics-engine/adapters/maxmind` | `maxmindGeo(city, asn)` over MMDB file contents |
| `@remcostoeten/analytics-engine/adapters/pglite` | `EventStore` and `RateLimiter` on PGlite |
| `@remcostoeten/analytics-engine/adapters/postgres` | `EventStore` and `RateLimiter` on Neon over HTTP |

The PGlite and Postgres adapters share one Drizzle implementation:

- Each batch is one insert with `ON CONFLICT DO NOTHING` on the event id, which lives in `fingerprint`.
- It writes the legacy `type` and `meta.eventName` columns that the v1 dashboard reads, and sets `schema_version` to 1.
- The rate limiter keeps a fixed-window count in `rate_limits` (migration 0021).

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
