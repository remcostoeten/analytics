# AGENTS.md

Self-hosted, privacy-first web analytics, owned and designed by Remco. This branch is a ground-up rebuild (v2): a typed browser and server SDK, one Elysia API for ingest, reads and sign-in built on a reusable engine, and a new dashboard, all on Neon Postgres.

## Status

- **v1 lives in `v1/` and is frozen.** It is the code production runs from `master`: the Hono ingestion, the Next dashboard, SDK 1.x and the demo database. No new features; fixes only when Remco asks. Its own guide is `v1/AGENTS.md`.
- **v2 is being built at the repo root on the `v2` branch.** Nothing in v2 is deployed yet.
- v2 code never imports from `v1/`. When v1 logic is reused, it is copied into the engine with its tests, so v1 keeps working untouched until it is removed.

## The plan

The source of truth is the "Analytics SDK v2 plan": https://claude.ai/artifact/LPNHFpymb9EW3nazt2r3sD. Read it with the Artifact tool, never by fetching the URL.

| Tab | Holds |
| --- | --- |
| Analytics SDK v2 plan | Decisions, architecture, monorepo, engine, API, access and roles, realtime, storage, bot detection, speed, errors, tooling, branching, phases |
| SDK design | The public SDK API, config, usage in every environment, internal structure |
| API reference | Every route with full example responses |
| Schemas and types | Semantic types, contract types, draft SQL tables |
| SQL reference | The SQL console's views, rules and example queries |
| Capabilities and gaps | What v2 tracks and how it compares with other tools |
| Epics and prompts | The work, split into epics with ready-to-paste prompts |

The plan's decisions table is binding. If a task conflicts with it, stop and ask Remco. Work is picked up epic by epic from the Epics and prompts tab.

## Rules

Load the `generic-program-rules` skill before writing code, prose, commits or summaries. The ones broken most often, plus this repo's own:

- TypeScript everywhere. `type`, never `interface`.
- Standalone functions are `function` declarations; callbacks are arrows. No classes, except React error boundaries.
- No comments except a one-line workaround reason, a one-line regex explanation, or a `TODO`. Exported shared and business-logic functions get a JSDoc block with `@name`, `@description` and `@example`.
- Semantic types come from `packages/shared/src/semantic.ts`; finite sets are literal unions; `Nullable<T>` for present-but-empty.
- Engine code returns errors as `Result` values; a thrown exception means a bug.
- No module mocking in tests; pass memory adapters through ports.
- Files kebab-case. A barrel `index.ts` only when a folder has several exports. Nothing is private by a `_` prefix; it is private by not being exported.
- Never store raw IP addresses. The SDK never contains database logic. No cookies for tracked visitors; the admin session cookie is the only cookie.
- Oxlint and oxfmt only; never ESLint or Prettier. Fix lint findings properly, never by disabling rules.
- Prose has no em dashes and no marketing language.

## Branching

- `master` is production (v1). Do not commit to it.
- `v2` is the integration branch. Every epic branches from `v2` as `feature/*`, `fix/*` or `chore/*`, opens a pull request into `v2`, and is squash-merged with green checks.
- The final merge of `v2` into `master` is a merge commit, not a squash, so epic history survives. It is the one exception to squash merging.
- Commits are conventional: `type(scope): subject`.
- Agents do not merge, publish to npm, apply migrations to Neon, or change Vercel or Cloudflare settings. Remco does.

## Layout

```text
analytics/
├─ apps/
│  └─ api/            v2 API on Elysia (phase 1 onward)
├─ packages/
│  ├─ contract/       schemas, types, error catalog (phase 0)
│  ├─ shared/         semantic types, Result, noop (phase 0)
│  ├─ engine/         ingest pipeline, signals, enrichers, dimensions, adapters, db (phase 2)
│  └─ sdk/            @remcostoeten/analytics 2.0 (phase 3)
├─ tools/oxlint/      lint plugins
├─ scripts/           size, OpenAPI and boundary checks, migrate
├─ e2e/               Playwright across SDK, API and dashboard
├─ docs/              inventory, decisions
└─ v1/                frozen v1: apps/dashboard, apps/ingestion, packages/ingestion, packages/sdk, packages/typescript, scripts/demo-db
```

Only `v1/` exists today; the rest arrives epic by epic. Bun workspaces cover `apps/*`, `packages/*`, `v1/apps/*` and `v1/packages/*`.

## Commands

| Command | Does |
| --- | --- |
| `bun install` | Installs every workspace |
| `bun run build` | Builds every workspace |
| `bun run typecheck` | `tsgo --noEmit` per workspace |
| `bun run lint` | Oxlint; covers `v1/` until epic E0.1 adds the v2 folders |
| `bun run fmt` / `fmt:check` | oxfmt, same scope as lint |
| `bun run test` | `bun test` per workspace |
| `bun run dev` | v1 dashboard |
| `bun run dev:ingestion` | v1 ingestion on port 3000+ |
| `bun run demo:db` | Local Postgres with seeded v1 data |

CI (`.github/workflows/ci.yml`) runs on pushes to `master` and `v2` and on every pull request: build, typecheck, lint, format check, test.

## Deployment

- v1's Vercel projects (`ingestion`, the dashboard) deploy from `master` with their old root directories. When `v2` merges into `master`, those root directories must change to `v1/apps/ingestion` and `v1/apps/dashboard`, or the projects must be retired.
- Until then, preview builds of those two projects on the `v2` branch fail because their root directory no longer exists; that is expected.
- `apps/api` gets its own Vercel project with `v2` as its production branch.
