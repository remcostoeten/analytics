# AGENTS.md

Self-hosted, privacy-first web analytics, owned and designed by Remco. This repo is mid-rebuild (v2): a typed browser and server SDK, one Elysia API for ingest, reads and sign-in built on a reusable engine, and a new dashboard, all on Neon Postgres.

## Status

- **v1 lives in `v1/` and is frozen.** Production runs it from `master`: the Hono ingestion, the Next dashboard, SDK 1.x and the demo database. No new features; fixes only when Remco asks. Its own guide is `v1/AGENTS.md`.
- **v2 is being built at the repo root, on `master`.** The API runs in production from `master` (Vercel project `v2.ingestion` on `api.analytics.remcostoeten.nl`) and the docs site on `docs.analytics.remcostoeten.nl`. `@spoar/sdk`, `@spoar/client` and `@spoar/devtools` publish stable versions to npm under the `latest` tag. The v2 dashboard (`apps/dashboard`, Next) runs from `master` as the Vercel project `v2.dashboard` and is served at `/dashboard` on the landing domain through a rewrite in `apps/docs` (decision 24). It has sign-in, the admin module for projects and keys, and the analytics views in Cloudflare's Web Analytics layout: web analytics, speed, issues, realtime, visitors with session trails, and chart annotations.
- v2 code never imports from `v1/`. When v1 logic is reused, it is copied into the engine with its tests, so v1 keeps working untouched until it is removed.

## The plan

The plan lives in [`docs/v2/`](docs/v2/README.md): `plan.md` for decisions and architecture, plus the SDK design, API reference, schemas, SQL reference and deployment notes. The original doc is https://claude.ai/artifact/LPNHFpymb9EW3nazt2r3sD; the repo copy is what agents read and keep current.

The decisions table in `docs/v2/plan.md` is binding. If a task conflicts with it, stop and ask Remco.

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

- `master` is the trunk for both v1 and v2. There is no `v2` branch.
- Every epic branches from `master` as `feature/*`, `fix/*` or `chore/*`, opens a pull request into `master`, and is squash-merged with green checks.
- Commits are conventional: `type(scope): subject`.
- Agents do not merge, publish to npm, apply migrations to Neon, or change Vercel or Cloudflare settings. Remco does. Publishing happens when Remco merges the Changesets version pull request.

## Layout

```text
analytics/
├─ apps/
│  ├─ api/            v2 API on Elysia (phase 1 onward)
│  ├─ dashboard/      v2 dashboard on Next under /dashboard: web analytics and the admin module
│  └─ docs/           docs site on Fumadocs: SDK, API reference, auth overview, query page
├─ packages/
│  ├─ contract/       schemas, types, error catalog (phase 0)
│  ├─ shared/         semantic types, Result, noop (phase 0)
│  ├─ engine/         ingest pipeline, signals, enrichers, dimensions, adapters, db (phase 2)
│  ├─ client/         @spoar/client, the typed read and admin client
│  ├─ sdk/            @spoar/sdk 2.0 (phase 3)
│  └─ devtools/       @spoar/devtools, the admin dev widget
├─ tools/oxlint/      lint plugins
├─ scripts/           size, OpenAPI and boundary checks, migrate, publish
├─ e2e/               Playwright across SDK, API and dashboard
├─ examples/          small apps on the SDK and client: playground, dashboard
├─ docs/v2/           the plan, API reference, epics and prompts
└─ v1/                frozen v1: apps/dashboard, apps/ingestion, packages/ingestion, packages/sdk, packages/typescript, scripts/demo-db
```

Today `v1/`, `apps/docs` (the Fumadocs site, with the API reference generated from `apps/api/openapi.json`), `apps/dashboard` (the Next app under `basePath` `/dashboard`: the sign-in page, a Cloudflare-style shell, the project home and per project web analytics, speed, issues, realtime, visitors and session trails with annotations on the charts, and the admin module for projects, keys and API tokens, reading through `@spoar/client` with the session cookie forwarded from server components), `apps/api` (health, `POST /v2/events` on the engine, Better Auth sign-in, access levels, projects and tokens, and the dev widget's bootstrap, overview, log and live session routes and its `live` WebSocket), `tools/oxlint/` (the vendored `anti-slop` plugin and the `house` plugin), `packages/shared`, `packages/contract`, `packages/engine` (database layer, ingest stages, enrichers, bot signals, jobs, ports and adapters), `packages/client` (`@spoar/client`: one chainable scope per project with a method per read route, plus the admin namespaces; `@spoar/sdk/admin` wraps it), `packages/sdk` (the 2.0 browser core, plugins, and the React, Next, server, proxy and admin entries), `packages/devtools` (the dev widget: loaders and the Shadow DOM panel, with fixtures for local work), `e2e/` (Playwright against the built SDK, the API on PGlite and the proxy), `examples/` (`playground` and `dashboard`, small apps on `@spoar/sdk` and `@spoar/client` that the docs site shows) and `scripts/` (the boundary check, `migrate.ts`, `publish.ts`, `rescore.ts`, `setup.ts`, `admin.ts` and `size-check.ts`) exist; the rest arrives epic by epic. Bun workspaces cover `apps/*`, `e2e`, `examples/*`, `packages/*`, `scripts`, `tools/oxlint/house`, `v1/apps/*` and `v1/packages/*`.

## Commands

| Command | Does |
| --- | --- |
| `bun install` | Installs every workspace |
| `bun run build` | Builds every workspace |
| `bun run typecheck` | `tsgo --noEmit` per workspace |
| `bun run lint` | Oxlint with `.oxlintrc.json` and type-aware rules on `apps`, `packages`, `tools`, `scripts` and `e2e`, then `lint:v1` |
| `bun run lint:fix` | Oxlint autofixes on the same folders |
| `bun run lint:v1` | Oxlint correctness rules on `v1/` with `v1/.oxlintrc.json` |
| `bun run format` / `format:check` | oxfmt on the whole repo, `v1/` included |
| `bun run boundaries` | `scripts/check-boundaries.ts`: which workspace may import which, and nothing from `v1/` |
| `bun run deps` | sherif: consistent dependency versions and manifest fields; v1 is ignored |
| `bun run knip` | knip: unused files, exports and dependencies in v2 |
| `bun run knip:v1` | knip report of what v1 no longer uses; never fails |
| `bun run migrate` | Applies `packages/engine/src/db/migrations` to `DATABASE_URL`; `--dry-run`, and `--baseline 0008_add_rollup_daily` on a database v1 already migrated. Remco runs it against Neon |
| `bun run setup` | `scripts/setup.ts`: migrates `DATABASE_URL`, adds `--owner <login>` to `dashboard_users` and, with `--project <id> --domain <domain>`, creates the first project and prints its keys; for a fresh self-hosted database |
| `bun run db` / `db:down` | Starts Postgres 16 on `:5435` and the Neon HTTP proxy on `:4444` from `docker-compose.yml`, then applies the migrations; `db:down` stops them. Matches `apps/api/.env.playground`, and `bun run admin` reads `DATABASE_URL` from it |
| `bun run admin` | `scripts/admin.ts`: an unstyled page on `127.0.0.1:3400` that talks straight to `DATABASE_URL`, to create projects and `at_live_` API tokens, revoke tokens and set allowed origins without signing in; for local work and the playground |
| `bun run rescore` | `scripts/rescore.ts`: reruns bot scoring and the session signals over stored events for `--from` to `--to` (UTC dates); `--dry-run`, and `--include-legacy` for v1 rows. Remco runs it against Neon |
| `bun run size` | `scripts/size-check.ts`: gzips the built SDK core, `react` and `next` entries and each plugin bundled alone, and fails above the budgets (core 5 KB, `react` 1.5 KB, `next` 1 KB, plugins 0.6 KB, `errors` 0.7 KB, `speedInsights` 2.5 KB) and the `@spoar/devtools` loaders (1 KB each), and reports the lazy panel chunk; build `packages/sdk` and `packages/devtools` first |
| `bun run changeset` | Adds a changeset; published packages release stable versions on `latest`, never prereleases |
| `bun run release` | `scripts/publish.ts`: packs each public package with `bun pm pack` (with `publishConfig.exports` as `exports` and no `devDependencies`) and runs `npm publish --provenance --tag latest`, skipping prerelease versions and versions already on npm and carrying on past a failed package; `--dry-run` publishes nothing. `release.yml` runs it; agents never do |
| `bun run check` | typecheck, lint, format check, boundaries, deps, knip and tests |
| `bun run test:e2e` | Playwright in `e2e/` against the built SDK, the API on PGlite and the `/_ra` proxy; build `packages/sdk` first, and on Linux without a display run it under `xvfb-run -a` for the headed project. `docs/release-checklist.md` is the manual browser and blocker matrix |
| `bun run test` | `bun test` per workspace: the v1 workspaces one at a time, then the v2 ones and `e2e/parity` in parallel, so nothing slows the v1 PGlite suite past its 5 s timeouts |
| `bun run --cwd apps/docs dev` | The docs site on port 3200; `build` regenerates the API reference from `apps/api/openapi.json` first |
| `bun run --cwd apps/api openapi` | Rewrites `apps/api/openapi.json` after a route change; a test fails while it is stale |
| `bun run dev:v1` | v1 dashboard |
| `bun run dev:v1:ingestion` | v1 ingestion on port 3000+ |
| `bun run demo:v1:db` | Local Postgres with seeded v1 data |

CI (`.github/workflows/ci.yml`) runs on pushes to `master` and on every pull request: build, SDK size, typecheck, lint, format check, boundaries, deps, knip, test, and a gitleaks secret scan. Pull requests also run the `e2e` job. CodeQL runs on pull requests and weekly. `migrate.yml` runs the migrations against the `DATABASE_URL` secret of the `production` environment when Remco starts it, and `jobs.yml` calls the cron routes on a schedule once `API_URL` and `CRON_SECRET` are set there; `docs/v2/deploy.md` is the setup checklist. `release.yml` runs on every push to `master`: it first runs `bun run release` through npm trusted publishing, which publishes any version on `master` not yet on npm, then keeps the version pull request on the `changeset-release/master` branch up to date; a manual run with `dry-run` packs without publishing. `openapi.yml` fails a pull request with a breaking OpenAPI change once `apps/api/openapi.json` exists. Renovate opens grouped dependency pull requests every Monday.

Lefthook runs oxfmt, Oxlint and gitleaks (when installed) on staged files before each commit, and rejects commit subjects that are not conventional commits; `bun install` sets it up.

A pull request that changes a published package (`packages/sdk`, `packages/client`, `packages/devtools`) adds a changeset with `bun run changeset`. `packages/contract` is private and bundled into both builds, so it is never published on its own.

Type-aware Oxlint ignores `ignorePatterns`, so `lint` names its folders explicitly. A new top-level v2 folder gets added to the `lint` and `lint:fix` scripts.

## Deployment

- Git deploys are off for every Vercel project (`"git": { "deploymentEnabled": false }` in each `vercel.json`), to stay inside the free plan's deployment quota. Remco deploys on demand from the Vercel dashboard or `vercel deploy --prod`; `docs/v2/deploy.md` section 11.
- v1's Vercel projects are `ingestion` from `v1/apps/ingestion` and `analytics` (the dashboard) from `v1/apps/dashboard`.
- `apps/api` is the Vercel project `v2.ingestion`, `apps/docs` is `v2.analytics-docs` and `apps/dashboard` is `v2.dashboard` (`docs/v2/deploy.md`).
