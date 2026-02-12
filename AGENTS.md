# AGENTS.md

This repository is owned and designed by Remco.

All agents working on this codebase must follow the conventions below unless explicitly instructed otherwise.

Spec precedence
- docs/ is implementation source of truth per subsystem.
- If AGENTS.md conflicts with a subsystem spec in docs/, follow the docs file for that subsystem.

Core philosophy
- Prioritize simplicity, correctness, and boring reliability.
- Avoid premature abstraction.
- Prefer composable primitives.
- No comments, code must be self explanatory.
- Centralized ingestion, thin clients.
- Data first, UI second.

Language and runtime
- TypeScript everywhere.
- Node runtime for ingestion on Vercel serverless.
- React and Next.js for dashboard and SDK integration.
- Hono is acceptable for ingestion routing.

Code style rules
- Use type, never interface.
- Use function declarations, never arrow functions, never classes.
- Names should ideally be max two words.
- File names must be kebab-case.
- No comments.

Project structure
Module based folders when applicable:
- components
- hooks
- utilities
- types
- api/queries
- api/mutations

Only use barrel index.ts when a folder has multiple exports.

React and Next.js
- Prefer server actions when applicable.
- Prefer modern hooks when relevant.
- Full page code only, not partial snippets.
- Dark neutral UI only, no emojis.

SDK rules
- Package: @remcostoeten/analytics
- Export Analytics component, optional track helper.
- SDK must never contain database logic.
- SDK only sends events to ingestion endpoint.
- projectId defaults to hostname, overrides by prop or env.
- Respect user opt-out and DNT.
- No HTTP cookies.

Ingestion contract
- Required endpoints: GET /health and POST /ingest.
- Ingestion validates payloads before writes.
- Ingestion applies bot detection, geo extraction, IP hashing, and deduplication before database insert.
- Never store raw IP addresses.
- IP_HASH_SECRET is required in production.

Database
- Postgres on Neon.
- Drizzle ORM.
- Schema lives in packages/db.

Testing and quality gates
- Favor integration tests for behavior, with a practical split of roughly 60% unit, 30% integration, 10% E2E.
- Before merge: bun run typecheck, bun run lint, bun run test.
- Run E2E and load tests when changes affect ingestion flow, SDK tracking lifecycle, or dashboard critical paths.

Git workflow
- Branch naming: feature/*, fix/*, chore/*.
- Use conventional commits: type(scope): subject.
- Merge by PR with green checks, prefer squash merge.

Performance budgets
- Ingestion latency target: <100ms p95.
- Dashboard query target: <500ms p95.
- SDK bundle target: <5KB gzipped.

Tooling
- Bun workspaces.
- Bun catalogs for dependency version sharing.
- Oxlint for linting.
- Oxfmt for formatting.
