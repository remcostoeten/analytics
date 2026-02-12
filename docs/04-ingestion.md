# Ingestion service MVP

Outcome
apps/ingestion is deployable to Vercel with Node runtime, exposes health and ingest, and writes validated events into Neon using packages/db.

Requirements
- Framework: Hono
- Runtime: Node
- Endpoints:
  - GET /health
  - POST /ingest
- DB:
  - Neon Postgres
  - Drizzle schema and migrations in packages/db

Acceptance checks
- Local run receives events and writes rows
- Deployed endpoint works and DB shows rows
