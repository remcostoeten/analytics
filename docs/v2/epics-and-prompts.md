# Epics and agent prompts

Twenty-five epics across six phases, each small enough for one agent session and one PR. Every epic lists what it needs first, what it delivers, when it is done, and a prompt to paste into a new agent session.

## How to use this

- Start epics in ID order within a phase; epics in the same phase with no dependency between them can run in parallel.
- Paste the shared preamble, then the epic's prompt, into a fresh agent session in `~/dev/analytics`.
- Each epic ends in a draft PR on a `feature/*` or `chore/*` branch with green `bun run check`. The agent does not merge, publish to npm, or apply migrations to Neon; you do those.
- When an epic changes the plan, the agent says so in the PR description instead of editing the plan doc.

## Shared preamble

Paste this first in every session:

```text
You are working in ~/dev/analytics, Remco's self-hosted analytics monorepo.
Before anything else:
1. Read AGENTS.md at the repo root and follow it.
2. Load the generic-program-rules skill and follow it for code, comments, types, commits and your summary.
3. Read the plan: "Analytics SDK v2 plan" at https://claude.ai/artifact/LPNHFpymb9EW3nazt2r3sD (main tab, plus the API reference tab where the epic names it). The plan's decisions table is binding; if something in this task conflicts with it, stop and ask.
4. Check `git status` and leave unrelated changes alone.
Rules: TypeScript, `type` never `interface`, function declarations for standalone functions, arrow callbacks, no classes, no comments beyond the allowed kinds, kebab-case files, errors as Result values in engine code, no module mocking in tests.
Branch from master using the name in the epic, and open the PR against master. Commit with conventional commits. Open a draft PR with a Before/After description. Do not merge, do not publish to npm, do not apply migrations to Neon, do not change Vercel or Cloudflare settings.
Finish with `bun run check` green (or the closest existing equivalent before E0.1 lands) and report what changed, what is left, and any risk.
```

## Overview

| ID | Epic | Phase | Needs | Branch |
| --- | --- | --- | --- | --- |
| E0.1 | Lint and format baseline | 0 | none | `chore/lint-baseline` |
| E0.2 | Dropped: 1.x is frozen | 0 | none | `fix/sdk-1-8-vitals-self-traffic` |
| E0.3 | Shared and contract packages | 0 | E0.1 | `feature/contract-package` |
| E0.4 | Decision records | 0 | none | `chore/decision-records` |
| E0.5 | Repo tooling | 0 | E0.1 | chore/repo-tooling |
| E1.1 | Elysia on Vercel spike | 1 | E0.3 | `feature/api-spike` |
| E1.2 | Migrations 0009 to 0020 and migrate script | 1 | E0.3 | `feature/v2-migrations` |
| E2.1 | Engine core | 2 | E0.3, E1.2 | `feature/engine-core` |
| E2.2 | Port the ingest pipeline into the engine | 2 | E2.1 | `feature/engine-pipeline` |
| E2.3 | Bot scoring | 2 | E2.1 | `feature/bot-scoring` |
| E2.4 | API skeleton and `POST /v2/events` | 2 | E1.1, E2.2 | `feature/api-ingest` |
| E3.1 | SDK 2.0 core | 3 | E0.3, E2.4 | `feature/sdk-2-core` |
| E3.2 | SDK plugins | 3 | E3.1 | `feature/sdk-2-plugins` |
| E3.3 | React, server and proxy entries, build and release | 3 | E3.1 | `feature/sdk-2-entries` |
| E3.4 | End-to-end tests, blocker matrix, 2.0.0 | 3 | E3.2, E3.3 | `chore/sdk-2-release` |
| E4.1 | Auth, tokens and visibility | 4 | E2.4 | `feature/api-auth` |
| E4.2 | Read resources | 4 | E4.1 | `feature/api-reads` |
| E4.3 | Speed insights | 4 | E3.2, E4.2 | `feature/speed-insights` |
| E4.4 | Error tracking | 4 | E3.2, E4.2 | `feature/error-tracking` |
| E4.5 | Dashboard on the v2 API (on hold for Remco's design) | 4 | E4.2 | `feature/dashboard-v2` |
| E4.6 | Docs site: SDK methods, API reference, query page and auth overview | 4 | E4.4 | `feature/docs-site` |
| E4.7 | Alerts: mail, webhook and Discord channels | 4 | E4.4 | `feature/alerts` |
| E4.8 | Dev widget endpoints | 4 | E4.2, E4.4 | `feature/widget-endpoints` |
| E4.9 | Dev widget UI, `@spoar/devtools` | 4 | E4.8, or its fixtures | `feature/devtools-ui` |
| E5.1 | Retire 1.x | 5 | E4.5 and 1.x traffic gone | `chore/retire-v1` |

After phase 5, later epics follow the product focus in the plan (decision 17), in this order: annotations (built in the API and admin SDK; the dashboard draws them); Search Console; saved segments; email reports and metric alerts; webhooks; source maps; share links and embeds; an MCP server; and the Durable Object realtime hub if polling ever falls short. Lifecycle, stickiness and group analytics are already built. Goals, funnels, actions, experiment statistics, feature flags, click heatmaps and surveys are not planned; [archive/conversion-scope.md](archive/conversion-scope.md) says why.

## Priorities now

Reach, traffic sources and app performance come first; conversion optimization is not a goal for now. Open work, in order:

1. Visitors, pages, traffic sources and realtime: keep these reads complete and correct in the API.
2. Bot detection: check the scores on real traffic with the release checklist in `docs/release-checklist.md`.
3. Speed insights and error tracking: keep them on par with Vercel as they change.
4. Search Console as its own epic. Annotations are built in the API and the admin SDK; E4.5 draws them on the time series.
5. Reliability, privacy and self-hosting: E5.1 retires 1.x and ships the self-host setup.
6. E4.5, the dashboard on the v2 API, last, once Remco's design is in.

## Phase 0: foundations

### E0.1 Lint and format baseline

Delivers: Oxlint 1.85.0 and oxfmt 0.70.0 in the catalog, `.oxlintrc.json` and `.oxfmtrc.json` from the Skriuw rulebook, `tools/oxlint/anti-slop` and `tools/oxlint/house`, `noop()` moved into a shared location, lefthook, and the `lint`, `lint:fix`, `format`, `format:check` and `check` scripts. Done when CI and `bun run check` are green on the reformatted repo.

```text
Epic E0.1, branch chore/lint-baseline. Branch chore/lint-baseline from master. Read the plan sections "Linting and formatting" and "Code rules and tooling", and the Skriuw lint rulebook at https://claude.ai/artifact/JMt59NUXkw7kfSRLHxWW1x (read it with the Artifact tool).
1. Bump oxlint to 1.85.0 and oxfmt to 0.70.0 in the root package.json catalogs. Confirm current versions with `npm view` first.
2. Add .oxlintrc.json copied from the rulebook, with the changes the plan lists: the skriuw plugin becomes tools/oxlint/house (rules house/no-silent-catch and house/local-type-name), drop the Storybook and apps/workspace overrides, keep the tests override, add import/no-cycle, set no-unused-vars argsIgnorePattern "^_", and ignore packages/ingestion/src/db/migrations/**. Try no-floating-promises via type-aware mode; if 1.85.0 does not support it, leave it out and say so.
3. Install the anti-slop plugin with the install-anti-slop skill. Write the two house rules as a small JS plugin with tests.
4. Add .oxfmtrc.json with printWidth 100 and the rulebook's ignore shape. Reformat the whole repo in one separate commit.
5. Rename scripts to lint, lint:fix, format, format:check, and add check (typecheck, lint, format:check, test). Update CI and AGENTS.md's commands table.
6. Add lefthook running format and lint on staged files.
7. Fix every new finding properly; never disable a rule to pass. List any rule you had to scope down and why.
```

### E0.2 Dropped

1.x is frozen, so there is no 1.8 patch. The web vitals and own-traffic fixes ship with 2.0 in E3.2.

### E0.3 Shared and contract packages

Delivers: `packages/shared` (semantic types, `Result`, `noop`) and `packages/contract` (TypeBox schemas for the event envelope, ingest response, error catalog and read DTOs, plus JSON fixtures). Done when both typecheck, the fixtures validate, and the error catalog covers every code in the API reference tab.

```text
Epic E0.3, branch feature/contract-package. Read the plan sections "Monorepo structure", "Event envelope and transport", "Errors", the whole API reference tab, and the Schemas and types tab, which is the starting point for these types.
1. Create packages/shared: semantic.ts (ID, Timestamp, ProjectID, VisitorID, SessionID, EventID, Nullable, per the generic-program-rules types section), result.ts (Result, ok, err), noop.ts. Private package, exports point at src.
2. Create packages/contract as @spoar/contract with TypeBox schemas: events.ts (envelope v1, event, context, page, signals), errors.ts (the catalog: code, status, retryable, level, docs line; ErrorCode as the union of keys), projects.ts, stats.ts, visitors.ts, issues.ts, speed.ts, tokens.ts matching every request and response in the API reference tab. Export static types with Static<>.
3. Add fixtures/ with valid and invalid JSON for each schema, and tests that valid ones pass and invalid ones fail with the expected path.
4. Build contract with tsdown to ESM and types. Add the boundary rule to scripts/check-boundaries.ts: shared imports nothing, contract imports only shared.
```

### E0.4 Decision records

Delivers: `docs/decisions/0001` to `0012`, one short file per row of the plan's decisions table, each with context, decision, status and consequences. Done when each file exists and the settled ones say so.

```text
Epic E0.4, branch chore/decision-records. Read the plan's "Decisions needed" table.
Write one markdown file per row in docs/decisions/, numbered 0001 to 0012, named after the decision in kebab-case. Each has four short sections: Context, Decision, Status (Settled or Open with the recommended default), Consequences. Follow the writing voice rules in generic-program-rules: plain declaratives, no em dashes, no marketing words. Add a docs/decisions/README.md that lists them in a table.
```

### E0.5 Repo tooling

Delivers: the non-lint tooling that keeps a monorepo healthy, set up once. Done when each tool runs in CI or on a schedule without failing on the current code, and the PR lists anything it turned off and why.

| Tool | Why |
| --- | --- |
| knip 6.38 | Finds unused files, exports and dependencies across workspaces; it also shows what can be deleted when 1.x is retired |
| sherif 1.13 | Checks every `package.json` in the monorepo for mismatched dependency versions and missing fields |
| Renovate | Grouped weekly dependency PRs that understand Bun workspaces and the root catalogs, instead of one PR per package |
| Changesets 3.0 | Set up now in pre-release mode so SDK prereleases can start as soon as phase 3 does |
| oasdiff GitHub Action | Fails a PR that makes a breaking change to the OpenAPI document once `apps/api` exists |
| lefthook `commit-msg` | Rejects commits that are not conventional commits, with a one-line regex rather than another dependency |
| gitleaks in lefthook | Blocks commits that contain secrets such as `INGEST_SECRET` or Neon URLs |
| CodeQL | GitHub's free security scan for TypeScript, on pull requests and weekly |
| `.coderabbit.yaml` | CodeRabbit already reviews this repo's PRs; the config points it at AGENTS.md and the plan's rules so its comments match the house style |

```text
Epic E0.5, branch chore/repo-tooling. Needs E0.1. Read the plan sections "Build process", "Test process", "Branching" and "Linting and formatting". Check current versions of each tool on npm or its releases page before installing.
1. Add knip with a root config that knows every workspace and entry; fix or list its findings (do not delete code the plan still needs, such as packages/ingestion).
2. Add sherif and fix its findings.
3. Add renovate.json: weekly schedule, group non-major updates, separate PRs for majors, respect the root catalogs, automerge nothing.
4. Initialise Changesets for packages/sdk and packages/contract, pre mode with the next tag. Do not publish.
5. Add a commit-msg hook in lefthook that checks conventional commits with a regex, and gitleaks as a pre-commit step if it is installable without Docker; otherwise run gitleaks in CI.
6. Add CodeQL for javascript-typescript on pull requests and weekly.
7. Add .coderabbit.yaml telling the reviewer to follow AGENTS.md and the generic rules (function declarations, type not interface, no comments beyond the allowed kinds, no em dashes in prose) and to skip formatting nits that oxfmt handles.
8. Prepare the oasdiff job but keep it disabled until apps/api has an OpenAPI document; note that in the PR.
```

## Phase 1: spike and storage

### E1.1 Elysia on Vercel spike

Delivers: a throwaway `apps/api` with `GET /v2/health` and a stub `POST /v2/events` that reads one MMDB lookup, deployed as a Vercel preview, plus a short findings note. Done when the note answers: Bun or Node runtime, cold start time, bundle size, MMDB bundling, streaming, and whether `cf-connecting-ip` arrives. If any answer is a blocker, the note recommends the Hono plus oRPC fallback.

```text
Epic E1.1, branch feature/api-spike. Read the plan sections "Architecture", "Build process", and the Elysia skill's Vercel integration (.agents/skills/elysiajs/integrations/vercel.md) and openapi plugin notes. Check current Elysia and @elysiajs/openapi versions on npm.
1. Create apps/api with Elysia: GET /v2/health returning { ok, version, time }, GET /v2/openapi from @elysiajs/openapi, and POST /v2/events that parses text/plain JSON, looks up the caller IP in the City MMDB (reuse packages/ingestion's geo-mmdb utility) and returns 202 with the lookup result. No database.
2. Build it into Vercel's Build Output API following apps/ingestion/scripts/build.ts, bundling both MMDB files. Try the Bun runtime first, Node second.
3. Deploy a preview with the Vercel CLI only if Remco has already linked the project; otherwise stop at a local `vercel build` and document the steps.
4. Write docs/decisions/0013-elysia-on-vercel.md with measured cold start (5 cold hits), warm p95 (100 hits), bundle size, which runtime, and any blocker. Recommend go or fallback.
```

### E1.2 Migrations 0009 to 0020 and migrate script

Delivers: SQL migrations for `projects`, `events.name`, bot score columns, per-project session uniqueness, `schema_version`, Better Auth tables, `api_tokens`, `issues`, `events.issue_id`, plus the speed insights columns; `schema.ts` updated; `scripts/migrate.ts`; PGlite tests running the real migration files. Done when a fresh PGlite and the local demo database both migrate cleanly and a second run is a no-op.

```text
Epic E1.2, branch feature/v2-migrations. Read the plan sections "Storage", "Access and sign-in", "Errors" and "Speed insights", and the Database tables part of the Schemas and types tab, which drafts the SQL.
1. Add packages/ingestion/src/db/migrations/0009 to 0020 as idempotent SQL (IF NOT EXISTS), exactly as the Storage section lists: 0009 to 0015 from its table, issues (0016), events.issue_id (0017), web_vitals (0018), rollup_vitals (0019) and the nullable route column on events, sessions and rollup_daily (0020). They move into packages/engine/src/db in E2.1. 0009 seeds one public projects row per distinct events.project_id. 0010 backfills events.name from COALESCE(meta->>'eventName', type) in batches.
2. Update schema.ts, using one baseEntity helper for id and timestamps where the rules require it.
3. Write scripts/migrate.ts: applies numbered files in order, records them in schema_migrations, prints what it would do with --dry-run, needs DATABASE_URL, never runs on deploy.
4. Replace the hand-copied DDL in packages/ingestion/tests/setup.ts with running the migration files on PGlite. All existing ingestion tests must still pass.
5. Run it against the local demo database (bun run demo:db) twice and include the output. Do not touch Neon.
```

## Phase 2: engine and v2 ingest

### E2.1 Engine core

Delivers: `packages/engine` with `define.ts`, `pipeline.ts`, the port types, `Logger`, memory and PGlite adapters, and a Postgres adapter on Drizzle and Neon. Done when a pipeline of placeholder stages runs end to end on the memory adapter and on PGlite in tests.

```text
Epic E2.1, branch feature/engine-core. Read the plan sections "Engine and modules", "Errors" (Inside the engine), and "Monorepo structure".
1. Create packages/engine (private, exports point at src). define.ts exports defineStage, defineSignal, defineEnricher, defineDimension with typed inputs and outputs. Each returns a plain object; no classes.
2. ports/: EventStore, GeoLookup, RateLimiter, Hasher, Clock, Logger as types. adapters/: memory (all ports), pglite and postgres (EventStore, RateLimiter), maxmind (GeoLookup), system clock, web crypto hasher, JSON logger.
3. pipeline.ts: createEngine(ports and registries) returns { ingest, rescore }. Stages run in a fixed order and return Result; the first failure stops the batch item and is reported by index. A thrown error becomes INTERNAL with the stack logged.
4. Unit tests for the pipeline runner with fake stages; integration test on PGlite using E1.2's migrations. Add engine to the boundary check: it may import only contract and shared.
```

### E2.2 Port the ingest pipeline into the engine

Delivers: stages for parse, authorize (project keys and origins from the `projects` table), enrich (geo, user agent, network, UTM), flags (localhost, preview, internal, admin session), dedupe (event id on the unique index), persist (one multi-row insert per batch) and sessions (visitor and session upserts). Done when the parity test passes: the same fixture events through the legacy `/e` handler and through the engine produce equal rows.

```text
Epic E2.2, branch feature/engine-pipeline. Read the plan sections "Engine and modules", "Event envelope and transport", "Storage", "Your own traffic", and AGENTS.md's "Pipeline, in order".
1. Copy the pure logic from v1/packages/ingestion/src/utilities (ip hash, geo, geo-mmdb, timezone-country, dedupe fingerprint, device class) into engine enrichers and stages, one file each, each with a table-driven test. v1 now lives in v1/ and is frozen: copy the logic from v1/packages/ingestion/src/utilities into the engine, never import from or edit v1/.
2. Implement the stages in the order the plan gives. Clock skew uses sentAt; the IP comes from cf-connecting-ip, then x-real-ip, then x-forwarded-for, unless a valid project secret key allows the forwarded-proxy enricher to use forwarded headers.
3. Map the v2 name field onto legacy type and meta.eventName on write so the current dashboard keeps working. Write schema_version 1.
4. Parity test on PGlite: fixture events through the legacy handleIngest and through engine.ingest give the same rows apart from the new columns. This is the phase 2 gate.
```

### E2.3 Bot scoring

Delivers: every signal in the plan's bot table as its own module, the scoring stage, the session-level job, a `rescore` CLI, and fixes for the three bugs in the legacy detector. Done when the signal tests pass and a PGlite run of known crawler, headless and human fixtures lands on the expected side of 50.

```text
Epic E2.3, branch feature/bot-scoring. Read the plan sections "Bot detection" and "Engine and modules".
1. One defineSignal file per row of the bot table in engine/src/signals/, listed in signals/index.ts, each with a table-driven test. Replace the broad /bot/, /monitor/, /rss/ patterns with a named crawler list. No early return for Firefox or Brave. Header checks run on POST.
2. The bot stage sums weights, caps at 100, stores bot_score and bot_reasons. Treat Brave's randomised values as normal.
3. The session-level signals (session_velocity, ip_fanout) run in the rollup job and write back to sessions and their events.
4. scripts/rescore.ts runs the bot stage over stored events for a date range with --dry-run.
5. Fixture set: crawler UAs, curl, HeadlessChrome, a datacenter ASN, a normal Chrome, Firefox and Safari request. Assert which side of 50 each lands on.
```

### E2.4 API skeleton and `POST /v2/events`

Delivers: `apps/api` with the request-id, CORS, error-handler and OpenAPI plugins, `GET /v2/health`, and `POST /v2/events` on the engine, deployable to Vercel. Done when integration tests cover 202, duplicates, per-event rejections, wrong origin, bad key, 413 and 429, and the OpenAPI JSON lists the route.

```text
Epic E2.4, branch feature/api-ingest. Needs E1.1's go decision. Read the plan sections "REST API", "Errors", "OpenAPI and docs", "Build process", and the ingest part of the API reference tab.
1. apps/api/src/plugins: request-id (read or create x-request-id, return it), cors (credentials only for the dashboard origin; ingest allows any origin but checks the key's allowed origins), error-handler (maps EngineError codes to the catalog status and envelope with requestId and docs link), openapi (/v2/openapi and /v2/openapi/json).
2. modules/events: route, model, service. Accept text/plain and application/json, 60 KB and 50 events max, X-Project-Key or Bearer secret. The service calls engine.ingest and returns { accepted, duplicates, rejected }.
3. Build for Vercel as the spike decided. Keep the legacy ingestion project untouched.
4. Integration tests through app.handle on PGlite for every status in the API reference's ingest examples.
```

## Phase 3: SDK 2.0

### E3.1 SDK 2.0 core

Delivers: `createAnalytics<Events>()` with `track`, `page`, `identify`, `register`, `error`, `consent`, `optOut`, `reset`, `flush`, `shutdown`, `on`, `status`; the pre-init queue; in-memory batching; the `beacon` transport; identity and session; one `__ra` storage key with migration from the 1.x keys; `mode` and debug output. Done when unit tests cover each method and the contract fixtures match what the client sends, and the core is under 5 KB min+gzip.

```text
Epic E3.1, branch feature/sdk-2-core. The SDK design tab is the spec for the public API, config, typing and file layout; follow it exactly. Read the plan sections "SDK API shape", "Event envelope and transport", "Engine and modules" (SDK plugin part), "Errors" (What developers see), and "Lessons from Vercel".
1. Rewrite packages/sdk/src as core/, plugins/, transports/, react/, server/, proxy/, internal/. 1.x is frozen in v1/packages/sdk; build 2.0 in packages/sdk.
2. core: client.ts (createAnalytics with the typed Events map and the method list above), queue.ts (pre-init queue replayed after init and consent; batches of 20 or 5 seconds or pagehide), identity.ts (visitor in localStorage, session in sessionStorage, 30-minute sliding window), storage.ts (one __ra key; on first run read and migrate __analytics_visitor_id, __analytics_opt_out and the traits keys, then remove them), consent.ts (persisted decision), plugin.ts (definePlugin, beforeSend chain, onPage, onHidden, onConsent).
3. Event shape exactly as packages/contract's envelope, UUIDv7 ids, sentAt, route when a router supplies it. Enforce property limits: names, keys and values up to 255 characters, flat primitive values, at most 25 props; warn in development, strip in production.
4. mode: auto reads NODE_ENV; development logs with [ra] codes and sends nothing unless an endpoint is set explicitly.
5. transports/beacon.ts: fetch with keepalive and text/plain, sendBeacon on pagehide, retries 1s, 4s, 16s on network errors and 5xx, persisted queue only with consent.
6. Tests with happy-dom. Assert the payloads against packages/contract fixtures. Add scripts/size-check.ts with the budgets.
```

### E3.2 SDK plugins

Delivers: `pageviews` (default on), `speedInsights`, `scrollDepth`, `engagement`, `clicks`, `outboundLinks` (with file downloads), `forms`, `errors` (with breadcrumbs), `ignoreSelf`, `botSignals`, `experiments`, `notFound`. Done when each has tests and meets its size budget.

```text
Epic E3.2, branch feature/sdk-2-plugins. Read the plan sections "SDK API shape", "Speed insights", "Your own traffic", "Bot detection" (client layer), "Errors" (Error tracking), "Capabilities and gaps" tab, and "Lessons from Vercel".
1. One file per plugin in packages/sdk/src/plugins, each built with definePlugin and exported from ./plugins. None imports another.
2. pageviews: history patching and popstate, skipping hash-only and same-path changes; turns itself off when a framework adapter supplies route (no double pageviews).
3. speedInsights: lazy-load the web-vitals attribution build; LCP, INP, CLS, FCP, TTFB; sampleRate decided once per page load; buffer and flush on hidden, pagehide, route change or 6 metrics; send id, value rounded, rating, route, path, navigationType, connection effectiveType, and one attribution selector.
4. ignoreSelf (?ra=ignore / ?ra=track / ?ra=debug), botSignals (bitfield: webdriver, headless hints, no input before send), experiments (register plus one experiment_exposure event), errors (uncaught errors, unhandled rejections, last 20 breadcrumbs, scrubbing), outboundLinks with file-download extensions, notFound (a call for 404 pages).
5. Tests per plugin with happy-dom; size-check budgets per plugin.
```

### E3.3 React, server and proxy entries, build and release

Delivers: `./react` (`AnalyticsProvider`, `useAnalytics`, `TrackClick`, `ErrorBoundary`, a Next adapter that supplies `route` from `useParams` and `usePathname`, and a `computeRoute` helper), `./server` (`createServerAnalytics`, `captureError`, forwarding the visitor's UA and IP, `waitUntil`), `./proxy` (`createProxy` for any fetch-standard framework), tsdown build, Changesets. Done when all entries build ESM-only with types, `"use client"` is on `./react`, and a changeset for 2.0.0 exists.

```text
Epic E3.3, branch feature/sdk-2-entries. Read the plan sections "SDK API shape", "Ad blockers and Brave", "Build process", and "Lessons from Vercel".
1. react/: provider taking a client, hooks, TrackClick, ErrorBoundary (the one allowed class exception), a Next adapter component that computes route with computeRoute(pathname, params) and holds pageviews until the route is known.
2. server/: createServerAnalytics({ project, secret, endpoint }) with track, identify, captureError, flush; accepts a Request or headers to forward user-agent and client IP; uses waitUntil when the runtime provides it; returns { ok, error } and never throws.
3. proxy/: createProxy({ secret, endpoint }) returning a (request) => Response handler that forwards the body, adds the secret and forwarded UA and IP, and optionally counts HTML page requests for the blocked-share estimate.
4. Build config from one JSON env var read with literal process.env / import.meta.env access, merged under explicit options.
5. tsdown config for all entries, ESM only, externals for react and next. Changesets config and a 2.0.0 changeset. CI size check.
```

### E3.4 End-to-end tests, blocker matrix, 2.0.0

Delivers: the `e2e/` workspace with Playwright tests of the built SDK against the local API, the bot scoring checks, the manual browser and blocker checklist, the SDK README, and a release PR. Done when e2e is green in CI and the manual checklist is filled in by Remco.

```text
Epic E3.4, branch chore/sdk-2-release. Read the plan sections "Test process" and "Ad blockers and Brave".
1. Create e2e/ as a workspace with Playwright (reuse the version apps/dashboard pins). Start the API against PGlite, serve fixture pages that load the built SDK through both transports, and assert stored rows for pageviews, SPA navigation, send on hide, consent, ignoreSelf, speed metrics and errors.
2. Bot checks: headless run scores 50 or more; headed run with scripted input under 50.
3. docs/release-checklist.md with the manual matrix (Brave standard and aggressive, uBlock Origin with EasyPrivacy, Firefox strict, Safari) and what to record.
4. Rewrite packages/sdk/README.md for 2.0 following the README rules in generic-program-rules, including a 1.x to 2.0 migration table.
5. Add the e2e job to CI on pull requests. Do not publish; the Changesets version PR is for Remco to merge.
```

## Phase 4: read API, sign-in and dashboard

### E4.1 Auth, tokens and visibility

Delivers: Better Auth with GitHub mounted under `/v2/auth`, the `dashboard_users` allowlist, the admin session cookie, API tokens, the access levels (`public`, `project`, `detail`, `admin`), private projects answering 404, project settings routes, and the admin-session internal-traffic marking at ingest. Done when every access level has an integration test for allowed and denied callers.

```text
Epic E4.1, branch feature/api-auth. Read the plan sections "Access and sign-in", "Your own traffic", and the API reference tab's access levels, projects, tokens and sign-in examples. Check current better-auth on npm and the Elysia skill's better-auth integration.
1. Mount Better Auth with the GitHub provider and its organization plugin under /v2/auth; allow sign-in only for logins in dashboard_users. Create one organization with Remco as owner, add org_id to projects, and implement the owner, admin, analyst and viewer roles from the plan's Roles table, plus token scopes read, sql and admin limited to listed projects. Add the query_runs log table and the per-project sqlEnabled switch. Cookie: httpOnly, Secure, SameSite=Lax, Domain from an env var (.remcostoeten.nl in production).
2. An access macro on routes: public, project, detail, admin, ingest, cron. Private projects return 404 to callers without access.
3. Projects module: list (visibility filter for admins), get, create, patch, key rotation (secret returned once, stored hashed). Tokens module: create (returned once), list, revoke.
4. At ingest, a valid admin session cookie marks the event and visitor internal.
5. Integration tests for each level with and without access. Run the auth-review skill on the result and include its findings in the PR.
```

### E4.2 Read resources

Delivers: `stats`, `timeseries`, `breakdown/:dimension` driven by the dimension registry, `realtime`, `events`, `visitors`, visitor detail and patch, session trail, shared query parameters, cursors, cache headers and public-read rate limits. Done when every example in the API reference tab is reproduced by an integration test on seeded PGlite data.

```text
Epic E4.2, branch feature/api-reads. Read the plan sections "REST API", "Engine and modules" (dimensions), every read example in the API reference tab, its Coverage check (sessions, paths, retention, heatmap, map, realtime events, the metrics= list, prop: and trait: dimensions, CSV output), its All projects combined section (every read route without the project prefix, project as a dimension and filter, /v2/people for identified users across projects), the plan's Realtime section (RealtimeFeed port, long-polling /realtime/events with a cursor, SSE on the same route), the Export and SQL section (format=csv|sql|json, /query, /query/schema, /query/explain, saved queries and history, read-only role over views only, built exactly as the SQL reference tab specifies: the nine views in migration 0024, row-level security per project, and the example queries as integration tests), and the Schemas and types tab.
1. One defineDimension file per dimension listed in the API reference; the breakdown service builds SQL from the registry. traffic=human applies one definition everywhere: bot_score under 50, not internal, not localhost, not preview.
2. stats with the previous period, timeseries by hour or day, realtime over 5 minutes, raw events and visitors with cursors, session trail, visitor internal toggle scoped to the project.
3. Cache-Control public, s-maxage=60 on public aggregate reads; private, no-store otherwise. Per-IP-hash rate limit on public reads.
4. Seed PGlite with a fixed dataset and assert each route's response shape against the contract DTOs.
```

### E4.3 Speed insights

Delivers: the `web_vitals` table and daily percentile rollup, the Real Experience Score, the `/speed` routes, and the dashboard speed view. Done when a seeded dataset gives scores that match a hand calculation and the view renders on public and private projects.

```text
Epic E4.3, branch feature/speed-insights. Read the plan section "Speed insights" and the speed examples in the API reference tab.
1. Ingest: route speed metrics from the speedInsights plugin into web_vitals rows, deduped by metric id per page load.
2. Rollup: p50, p75, p90, p95, p99 and counts per project, day, route, device and metric, excluding bots and internal traffic.
3. Score: per-metric 0 to 100 on a log-normal curve where the good threshold scores 90 and the poor threshold 50; RES = LCP 30%, INP 30%, CLS 25%, FCP 15%; bands 0-49, 50-89, 90-100. Unit tests against hand-computed values. Also build the guards in the plan's "What keeps the numbers trustworthy" table: keep only the latest value per metric id, reject impossible values, Playwright fixture pages with known LCP, INP and CLS that must land within 10%, and a weekly Chrome UX Report comparison flagged in /admin/metrics.
4. Routes: /speed, /speed/timeseries, /speed/routes, /speed/elements with device and percentile parameters; minimum 20 samples before a value is shown.
5. Dashboard: score ring, one card per metric with its distribution, a route table sorted by worst score, device toggle and percentile selector.
```

### E4.4 Error tracking

Delivers: scrubbing, fingerprinting and grouping into `issues`, regressions, sampling, the issue routes, webhook or email alerts from the cron job, and the API's own errors captured into an internal project. Done when fixture errors group as expected and a resolved issue reopens on recurrence.

```text
Epic E4.4, branch feature/error-tracking. Also read the SDK design tab's Error tracking in code section and its Compared with Sentry table, and build filter[issue] and /error-rules from the API reference. Read the plan section "Errors" and the Issues examples in the API reference tab.
1. A scrub enricher (emails, tokens, long numbers, query strings except UTM) and a fingerprint stage (type, normalised message, top in-app frame).
2. Upsert issues per project and fingerprint with counts, visitors, releases and status; reopen resolved issues as regressions; store only counts after 100 occurrences per minute.
3. Routes: list, detail, events, patch status. Alerts: the cron job posts new issues and regressions to a webhook URL from env, and email if configured.
4. The API's error-handler captures its own INTERNAL errors into an internal analytics project.
5. Tests with fixture stacks from Chrome, Firefox and Safari.
```

### E4.5 Dashboard on the v2 API

On hold since Sep 28 until Remco provides a design. Parity tests will compare each view against fixed expected values from a seeded dataset.

Delivers: the dashboard reading only through Eden Treaty, public and private projects with the admin filter, sign-in through the API, the old `/api/analytics` and `/api/posthog` routes left in place but unused, and a parity test per migrated view. Done when every view is migrated and parity tests pass.

```text
Epic E4.5, branch feature/dashboard-v2. Read the plan sections "Access and sign-in", "REST API", and "Phases". Use toasts from @remcostoeten/notifier, never sonner.
1. Add an Eden Treaty client in apps/dashboard that forwards the session cookie from server components.
2. Migrate one view at a time, each in its own commit: overview, pages and referrers, geo, devices, visitors and session trails, realtime, speed, issues. Write a parity test per view comparing the old query and the new API on the demo database.
3. Signed out: list and show public projects only. Signed in: show private projects, the visibility filter and admin controls from /v2/auth/session.
4. Remove the dashboard's own GitHub OAuth routes once sign-in through the API works. Keep the old API routes until phase 5.
```

### E4.6 Docs site

Delivers: `apps/docs` on Fumadocs with every SDK method, option and plugin, the API reference generated from `apps/api/openapi.json`, an auth overview (sign-in, access levels, tokens, the session route) and a small SQL query page that runs `POST /v2/query` with a token. Done when every exported SDK function and every API route has a page and the site builds in CI.

```text
Epic E4.6, branch feature/docs-site. Read the plan sections "SDK API shape", "Access and sign-in", "REST API" and "SQL console".
1. Export the OpenAPI document to apps/api/openapi.json with a script, and fail CI when it is stale.
2. Add apps/docs on Fumadocs: MDX pages for the SDK (install, config, client methods, each plugin, react, next, server, proxy) and generated API reference pages from openapi.json.
3. Add an auth overview page and a query page: the API URL and a token go in, SQL runs through POST /v2/query, results show as a table. No other dashboard views.
```

### E4.7 Alerts

Delivers: the design in `docs/v2/alerts.md`: `defineConfig` with server plugins, the `alerts()` plugin with the optional mail, webhook and Discord channels, the `smtp()` (on `node:tls`) and `resend()` transports with no outside dependencies, the delivery queue with the retry policy, the target routes and status route, the SDK's `/admin` module with `createAdmin`, `sync` and the target builders, and `alertRoute` and `verifyAlert` in `/server`. Replaces `ALERT_WEBHOOK_URL`. Done when a mail, a webhook and a Discord target receive a batch from the alerts job, a failing target retries by its policy without holding back the others, a config without `alerts()` has no alert routes, and every row of "What the editor catches" has a type test.

```text
Epic E4.7, branch feature/alerts. Read docs/v2/alerts.md in full; it is the spec, and its vocabulary is binding for names of types, files and routes. Also read the plan section "Errors" and the existing apps/api/src/modules/jobs/alerts.ts, which this replaces. Add no outside dependencies.
1. Contract: use the existing helpers in @spoar/shared/http for every HTTP call; packages/contract/src/alerts.ts with the schemas in the spec, and a changeset.
2. Engine: defineConfig and ServerPlugin; migration 0029_add_alert_targets; the AlertStore port and its Drizzle and memory versions; packages/engine/src/alerts with the plugin, queue, dispatch, retry policy, renderers, signing, the mail, webhook and Discord channels, and the smtp (node:tls) and resend (postJson) transports.
3. API: apps/api/analytics.config.ts read at startup, the plugin's routes and the alerts job doing queue then dispatch, the status route. Remove ALERT_WEBHOOK_URL and ALERT_WEBHOOK_SECRET, regenerate apps/api/openapi.json, and update docs/v2/api-reference.md, docs/v2/deploy.md and the docs site, including a page on retry settings.
4. SDK: packages/sdk/src/admin (createAdmin with a project id type parameter, alerts.sync, list, set, remove, test, rotate, deliveries, the read methods, and the mail, webhook and discord builders with the narrowed types) and alertRoute with verifyAlert in /server. Add the ./admin entry to package.json, the build and the docs site, and a changeset.
5. Tests as listed in the spec's Tests section, including the fake SMTP server and expectTypeOf tests for each row of "What the editor catches".
```

### E4.8 Dev widget endpoints

Delivers: the API side of the dev widget. A bootstrap route that turns the admin session cookie into a short-lived bearer token, live visitor and session lists, a log stream of what ingest, the SDK, the engine and the jobs did, an overview, client log reports, and bot signals on one visitor. Done when every route is in `apps/api/openapi.json`, the shapes match the types in `packages/devtools/src/client/types.ts`, and the widget runs against the API with its fixtures removed.

```text
Epic E4.8, branch feature/widget-endpoints. Read the plan sections "Access and sign-in", "Realtime" and "Bot detection", and packages/devtools/src/client/types.ts, which holds the shapes the widget already renders from fixtures. Move those types into packages/contract as TypeBox schemas and import them back into the widget.
1. GET /v2/widget/session?project=<id>: with an admin session cookie, answer 200 with { data: { token, expiresAt, project: { id, name, environment }, user: { name }, widgetReports } }. The token is a bearer token with detail access to that one project for 15 minutes. Without a session answer 401 and set no cookie. Allow credentials only from the project's allowedOrigins.
2. GET /v2/projects/:project/realtime/visitors and realtime/sessions: visitors and sessions seen in the last 30 minutes, newest first, up to 400, as OnlineVisitor and LiveSession.
3. GET /v2/projects/:project/visitors/:visitor gains botScore and botSignals: [{ reason, weight }] from the stored bot reasons.
4. GET /v2/projects/:project/logs: LogEntry rows for ingest results (sent, retry, rejected, dropped), signals, jobs and auth, with long polling on after and server-sent events on Accept: text/event-stream with Last-Event-ID, like realtime/events. q filters on path. Keep 24 hours.
5. POST /v2/projects/:project/logs/client: up to 50 ClientReport entries from the widget, stored as logs with source sdk. Answer 403 unless the project has widgetReports on. Add widgetReports (default off) to PATCH /v2/projects/:project.
6. GET /v2/projects/:project/overview: Overview, the numbers on the widget's status buffer.
7. Regenerate apps/api/openapi.json, update docs/v2/api-reference.md and add the routes to the docs site. Tests with the memory adapters for each route and the 401 on bootstrap.
```

### E4.9 Dev widget UI, `@spoar/devtools`

Delivers: `packages/devtools`, published as `@spoar/devtools`: an overlay panel admins see on their own live site, lazy-loaded after the bootstrap call succeeds and rendered in a Shadow DOM. It has a vanilla `mount()`, a React `<Devtools />` and a Next entry. Done when the loader is within 1 KB gzip, a signed-out visitor downloads nothing past the loader, and the e2e spec opens the panel, switches buffers and expands a log row.

```text
Epic E4.9, branch feature/devtools-ui. Build the admin dev widget as a new published package, packages/devtools, published as @spoar/devtools. It is an overlay panel that admins see on their own live site. It shows online visitors, sessions, a colored log stream with JSON detail, speed per route, error groups and an overview. Visitors never download it.

Read AGENTS.md, docs/v2/plan.md, docs/v2/sdk-design.md and docs/v2/api-reference.md first, and load the generic-program-rules and emil-design-eng skills. The visual reference is the "Terminal devtools, site data" board in https://claude.ai/artifact/MsfF7ChWUJJ32AyB6bS1Kw, which builds on https://claude.ai/artifact/8cpjmo52NBiAJUeo9px53f. Match it closely. Open one pull request into master. Do not merge or publish.

This epic depends on E4.8: GET /v2/widget/session, realtime/visitors, logs with SSE, logs/client, overview, and bot signals on visitors/:visitor. If they are not merged yet, build against typed fixtures behind the same port. Then they swap in with no UI changes.

0. Decision
Add one row to the decisions table in docs/v2/plan.md: "Dev widget ships as @spoar/devtools, separate from @spoar/sdk. It is lazy-loaded after an admin bootstrap and rendered in a Shadow DOM with compiled Tailwind." Stop and ask Remco if this conflicts with an existing decision.

1. Package shape
- Create packages/devtools as a Bun workspace. Add it to the lint and lint:fix scripts and to scripts/check-boundaries.ts. It may import packages/contract and packages/shared, and the public @spoar/sdk API for client hooks. It must never import packages/engine, apps/* or v1/.
- Entries: "." exports mount(options), vanilla, bundles React, returns an unmount function. "./react" exports <Devtools />; React 19 or later is a peer dependency. "./next" is a "use client" component that loads ./react through next/dynamic with ssr: false.
- Build with the repo's existing bundler setup. Mirror packages/sdk, including publishConfig exports and a changeset in pre mode on the next tag.
- Make the loader tiny. The components first call GET /v2/widget/session and import the panel chunk only on a 200. Add a size-check budget of 1 KB gzip for the loader. Report the panel chunk size without failing on it.

2. Isolation
- Render into a Shadow DOM root attached to one host element, <ra-devtools>, with position: fixed. No global styles, no global listeners beyond the keyboard shortcut, no document.body class changes.
- Tailwind v4, compiled at build time into one CSS string including theme tokens, injected as a constructable stylesheet into the shadow root, with a <style> fallback. No CDN and no runtime compiler.
- Pin the font stack to JetBrains Mono with ui-monospace fallbacks, loaded only for the widget, with font-display: swap.
- Respect prefers-reduced-motion, prefers-contrast and prefers-reduced-transparency, like the reference does.

3. Data
- A client module with one function per endpoint. It uses the bearer widget token from bootstrap and refreshes 60 seconds before expiresAt. Every call returns the repo's Result shape and never throws into components.
- SSE for realtime/events and logs, with Last-Event-ID reconnect and a fall back to long polling. Pause streams while the tab is hidden.
- Poll overview every 10 seconds while the panel is open, and every 30 seconds while it is collapsed to the pill.
- Collect SDK client outcomes through analytics.on("drop") and analytics.on("error") when an SDK instance is passed in. Show them in the logs buffer straight away. Post them to logs/client in batches only when the project has widgetReports on.
- Keep lists bounded: 400 rows per buffer. Virtualize the rows with a small in-house windowing hook and no dependency.

4. UI (follow the reference board exactly unless something below differs)
- States: the collapsed pill shows the online count, the error count and the shortcut hint. Docked bottom is full width and resizable from the top edge. Floating is draggable by the header and resizable from the corner. Full-width and full-height toggles. Persist the state per origin in localStorage, wrapped in try/catch.
- Buffers, keys 1 to 6: visitors (rows expand to trail, client, vitals, identity and bot signals; actions follow, copy id, filter path), sessions (trail and a signal tag), logs (level, kind and source colors, a legend, expandable JSON, copy, a context action and a filter shortcut per row), speed (LCP, INP, CLS and TTFB p75 bars colored by threshold per route), errors (rows expand to stack, first seen, browsers and breadcrumbs), status (overview cards and the resolved config).
- Filter prompt at the foot of each buffer: key:value tokens per buffer, such as level:error, kind:ingest, geo:NL and bot:>0.5, plus free text. Filtering is client side over loaded rows. A /path token also passes q to the API.
- JSON tree: collapsible nodes with the reference colors for keys, strings, numbers, booleans and null. Ids that match a loaded visitor or session link to that row. RA_* codes link to the error catalog.
- Statusline: live or paused, online count, views per minute, LCP, errors, ingest rate, and a help hint.
- Keyboard: Ctrl+Shift+. toggles the panel, 1 to 6 switch buffers, j and k move between rows and Enter expands one, / focuses the filter, Esc collapses the panel, Shift+F10 opens the row menu. None of these animate.
- Motion, Emil's values from the reference: the panel enters with cubic-bezier(0.32,0.72,0,1) over 260 to 280 ms, presses scale to 0.97, the tab indicator is a clip-path transition, rows stagger by 30 ms only on first paint, new rows while scrolled up show an "n new" button instead of jumping, and only transform and opacity transition.
- Accessibility: real buttons, tablist and tabpanel roles, aria-live for new errors, touch targets of at least 40 px on coarse pointers, and a bottom sheet below 640 px.

5. Code rules
- Function declarations for components, type only, kebab-case files, no comments except the allowed ones.
- A feature folder per buffer, buffers/visitors/ with components, hooks and utils. Shared primitives (row, tag, JSON tree, filter prompt, statusline) in ui/.
- One useSyncExternalStore store per buffer. No state library, no runtime dependency beyond React, no clsx.

6. Tests and checks
- bun test for the filter parser, the JSON tree model, the store reducers and the client token refresh with a memory transport.
- A Playwright spec in e2e/ that mounts the widget on the e2e host page, signs in as an admin, opens the panel, switches buffers, expands a log row, and checks that a signed-out page loads nothing past the loader.
- bun run size and bun run check.

7. Docs
- A "Dev widget" page in apps/docs: install, the three entries, the widgetReports setting, the keyboard map and a screenshot.
- A short README for packages/devtools in the house style.

End with a summary in the house style: what was built, the bundle sizes, anything deferred.
```

## Phase 5: retire 1.x

### E5.1 Retire 1.x

Delivers: a deprecation notice on `@spoar/sdk@1`, removal of the legacy `/e` routes and `packages/ingestion` and `apps/ingestion` once `schema_version = 0` traffic has stopped, removal of the dashboard's old API routes, and a single cleanup cron. Done when no code path writes `schema_version = 0` and the legacy Vercel project can be deleted by Remco.

```text
Epic E5.1, branch chore/retire-v1. Read the plan sections "Phases" and "Storage". Start only after Remco confirms that 1.x traffic has stopped.
1. Query how many schema_version = 0 events arrived in the last 14 days, per project, and report it. Stop if any project still sends them.
2. Write the npm deprecate command for Remco to run; do not run it.
3. Remove packages/ingestion and apps/ingestion after moving anything still used into engine; remove the dashboard's /api/analytics and /api/posthog routes and the skriuw-* selectors unless Remco says otherwise.
4. Keep one cleanup schedule: the Vercel cron calling POST /v2/admin/jobs/cleanup; remove the in-process interval.
5. Update AGENTS.md so it describes the v2 layout, commands and pipeline.
6. Make the repo self-hostable by others: a root README setup guide, .env.example listing every variable with a one-line purpose, a `bun run setup` command that runs migrations and creates the owner, organization and first project (printing its keys once), and a Vercel deploy button for apps/api and apps/dashboard.
```
