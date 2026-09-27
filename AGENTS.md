# AGENTS.md

Self-hosted, privacy-first web analytics. Owned and designed by Remco.

Three parts: a browser/server SDK that sends events, an ingestion service that validates, enriches and stores them in Postgres, and consumers that read Postgres directly. There is no read API.

```
SDK (browser/server) --POST /e, /e/batch--> ingestion (Hono on Vercel, behind Cloudflare) --> Neon Postgres <-- SQL -- consumers
```

## Rules

- TypeScript everywhere. Use `type`, never `interface`.
- Standalone functions are `function` declarations. Callbacks are arrows. No classes (exception: React error boundaries).
- No comments. Names max two words where possible. Files kebab-case.
- Barrel `index.ts` only when a folder has multiple exports.
- Never store raw IP addresses. SDK never contains database logic. No HTTP cookies.
- Data first, UI second. Simplicity and boring reliability over abstraction.
- Branches `feature/*`, `fix/*`, `chore/*`. Conventional commits `type(scope): subject`. Squash-merge PRs with green checks.

## Workspace map

Bun workspaces (`apps/*`, `packages/*`), catalogs in the root `package.json`.

| Path | Package | Role |
|---|---|---|
| `packages/ingestion` | `@remcostoeten/ingestion` (npm) | The ingestion service. All pipeline logic, schema, migrations, tests |
| `apps/ingestion` | `@remcostoeten/ingestion-deploy` (private) | Vercel deploy shell and local dev server. No business logic |
| `packages/sdk` | `@remcostoeten/analytics` (npm) | Browser, React and server SDK |
| `packages/typescript` | `@remcostoeten/tsconfig` (private) | Shared strict tsconfig base |
| `apps/*` (others) | private | Consumer apps. Out of scope for this file |

Apps consume packages through their built `dist`. After editing `packages/*/src`, rebuild with `bun run --filter './packages/*' build` or apps and typecheck see stale code.

## Ingestion

Core: `packages/ingestion/src/`
- `app.ts` Hono app and routes
- `handler.ts` / `vercel.ts` Node `(req, res)` adapter for Vercel
- `handlers/` `ingest.ts`, `batch.ts`, `admin.ts`
- `utilities/` validation, auth, bot detection, rate limit, geo, ip hash, dedupe, retention, rollup
- `db/` `schema.ts`, `client.ts`, `migrations/`, `seed.ts`

Wrapper: `apps/ingestion/`
- `api/index.ts` re-exports `@remcostoeten/ingestion/vercel`
- `dev.ts` local `Bun.serve` on port 3000+
- `scripts/build.ts` writes Vercel Build Output API directly and bundles MMDB files
- `data/` local MMDB files (gitignored)

### Routes

| Method | Path | Auth |
|---|---|---|
| GET | `/` | none, HTML status page |
| GET | `/health` | none |
| POST | `/e`, `/ingest` | origin allowlist or Bearer `INGEST_SECRET` |
| POST | `/e/batch`, `/ingest/batch` | same, 1..100 events |
| GET | `/metrics`, `/admin/stats`, `/events` (SSE) | admin |
| GET, POST | `/admin/cleanup`, `/admin/rollup?days=1..90` | admin |

Admin auth: `x-admin-secret` header or `Authorization: Bearer`, timing-safe against `ADMIN_SECRET` or `CRON_SECRET`.

CORS reflects any origin with credentials. `ORIGIN_ALLOWLIST` in the handler is the real gate.

### Payload

Zod `eventSchema` in `utilities/validation.ts`:
`projectId` (required), `type` (default `pageview`), `eventId` (uuid), nullable `path`, `referrer`, `origin`, `host`, `ua`, `lang`, `visitorId`, `sessionId`, `ts`, `meta` (record). Invalid returns 400.

### Pipeline, in order (`handlers/ingest.ts`)

1. Validate payload.
2. Extract IP: `cf-connecting-ip`, then `x-real-ip`, then first `x-forwarded-for`. Cloudflare sits in front of Vercel, so `cf-connecting-ip` must stay first.
3. Hash IP: `sha256(ip + sha256(IP_HASH_SECRET + UTC date))`. Rotates daily.
4. Auth: Bearer must match `INGEST_SECRET` (401). With `INGEST_SECRET` set and no Origin, 403. Otherwise Origin must be in `ORIGIN_ALLOWLIST` (empty allows all).
5. Bot detection from request headers (`x-vercel-bot`, UA regexes, missing browser headers). Bots are stored with `bot_detected=true`, not dropped.
6. Rate limit per ip hash, in-memory: 100/60s normal, 10/60s bots, 429 on excess.
7. Geo: MaxMind City MMDB wins when it resolves a city, edge headers (`x-vercel-ip-*`, `cf-*`) fill gaps. Timezone falls back to `meta.timezone`, country to a timezone map. ASN and AS org from the ASN MMDB.
8. Flags: `is_localhost`, `is_preview` (host patterns), `is_internal` (localhost, `INTERNAL_IPS`, `INTERNAL_IP_HASHES`, `INTERNAL_VISITOR_IDS`).
9. Dedupe: fingerprint is `eventId` if present, else a hash of project, visitor, session, type, path, `meta.eventName` and `ts` in 10s buckets. In-memory cache first, durable unique index `events_fingerprint_uidx` with `onConflictDoNothing`. Duplicates return `{ok:true, deduped:true}`.
10. Client `ts` accepted only if at most 2 min in the future and 7 days old, else server time.
11. Enrich: `ua-parser-js` on `payload.ua` (browser, os into `meta`), device class, screen size.
12. Insert into `events`.
13. Upsert `sessions` by `session_id` (counts, exit path, duration).
14. Upsert `visitors` by `(project_id, fingerprint)`. `is_internal` is sticky and propagates back to event and session. `identify` merges into `meta.identity`, `experiment_exposure` into `meta.experiments`.

Batch runs auth, rate limit and geo once per request, then step 9 onward per event, returning `{ok, processed, deduped, failed}`.

### Scheduled jobs

Vercel crons in `apps/ingestion/vercel.json`, called with `CRON_SECRET`:
- `/admin/rollup` daily 02:30. Rebuilds last N UTC days of `rollup_daily` (dimensions `total`, `path`, `country`), excluding bot, internal, localhost and preview traffic.
- `/admin/cleanup` daily 03:00. Retention: pageviews 90d, other events 30d, localhost and bots 7d.

Do not emit crons from `scripts/build.ts`; duplicates fail the deploy.

## Database

Neon Postgres via Drizzle (`drizzle-orm/neon-http`).

Schema: `packages/ingestion/src/db/schema.ts`
- `events` one row per event, with geo, network, flags, fingerprint, `meta` jsonb
- `sessions` one row per `session_id`
- `visitors` one row per `(project_id, fingerprint)`; fingerprint is the SDK visitor id
- `rollup_daily` pre-aggregated daily counts
- `dashboard_users` exists only in migration `0004`, not in `schema.ts`

Migrations: `packages/ingestion/src/db/migrations/*.sql`, hand-written and idempotent (`IF NOT EXISTS`). The drizzle journal only knows `0000` and `db:migrate` (`drizzle-kit up:pg`) does not apply SQL. Apply migrations manually against Neon.

Schema change checklist:
1. Update `schema.ts`.
2. Add the next numbered idempotent SQL migration.
3. Update the hand-maintained DDL in `packages/ingestion/tests/setup.ts`.
4. Apply to Neon.

Local demo database: `bun run demo:db` starts Postgres 16 on `:5434` plus a Neon HTTP proxy on `:4444`, applies all migrations, seeds ~90 days of data. `--force` reseeds, `--use-demo` / `--restore` switch consumer `.env.local`.

## SDK

`packages/sdk/src/`: `api/`, `browser/`, `components/`, `identity/`, `observers/`, `server/`, `types/`, `utilities/`.

Entries:
- `.` React: `Analytics`, `AnalyticsProvider`, `TrackClick`, `AnalyticsErrorBoundary`, `useTrack`, plus everything from browser. Gets `"use client"` prepended at build.
- `./browser` `track`, `trackPageView`, `trackEvent`, `trackClick`, `trackError`, `trackTransaction`, `trackSearch`, `identify`, `setExperiment`, opt-out, consent, observers, offline queue.
- `./server` `trackServer`, `trackServerEvent`, `trackServerError`, `createServerTrack`. Sends Bearer `INGEST_SECRET`, `meta.source="server"`.

Events: `type` is `pageview`, `event`, `click`, `error` or any string. Custom events use `type:"event"` with `meta.eventName` (`web-vitals`, `scroll`, `time-on-page`, `transaction`, `site_search`, `identify`, `experiment_exposure`, `outbound_click`, `form_submit`). `<Analytics>` always tracks pageviews, performance, scroll and time on page; clicks, outbound, forms and errors are opt-in. SPA navigation via patched `history`.

Transport: `sendBeacon` to `${base}/e`, fallback `fetch` keepalive. Offline or failed events go to `localStorage.__analytics_queue__` (max 50), flushed on `online` to `/e/batch`. No retries, no client dedupe. Every event carries a fresh `eventId`.

Identity, no cookies:
- visitor `localStorage.__analytics_visitor_id`
- session `sessionStorage.__analytics_session_id`, 30 min sliding window
- traits `__analytics_user_props`, `__analytics_experiments`, `__analytics_identity`
- without storage or consent, a fresh id per call and nothing persisted

Privacy: tracking stops on `__analytics_opt_out`, `navigator.doNotTrack`, or missing consent when `consentRequired`. Revoking consent clears storage.

Resolution:
- `projectId`: prop, then provider, then `location.hostname`
- ingest URL: `ingestUrl` prop, then `NEXT_PUBLIC_ANALYTICS_URL` / `VITE_ANALYTICS_URL`. Base URL only, the SDK appends `/e`. Prefer passing `ingestUrl` explicitly; env inlining is unreliable.

## Environment

| Var | Used by | Notes |
|---|---|---|
| `DATABASE_URL` | ingestion, drizzle | Without it ingestion silently no-ops and reports every event as deduped |
| `IP_HASH_SECRET` | ingestion | Production: required, 32+ chars, else every route 500s at import |
| `INGEST_SECRET` | ingestion, SDK server | Optional. Enables Bearer auth |
| `ORIGIN_ALLOWLIST` | ingestion | Comma list, empty allows all |
| `INTERNAL_IPS`, `INTERNAL_VISITOR_IDS` | ingestion | Mark internal traffic |
| `INTERNAL_IP_HASHES` | ingestion | Stops matching after a day due to the daily salt; avoid |
| `ADMIN_SECRET`, `CRON_SECRET` | ingestion | Admin routes and crons |
| `GEOIP_MMDB_PATH`, `GEOIP_ASN_MMDB_PATH` | ingestion | Default `cwd/GeoLite2-{City,ASN}.mmdb`; geo silently disabled if missing |
| `NEXT_PUBLIC_ANALYTICS_URL`, `VITE_ANALYTICS_URL` | SDK browser | Unless `ingestUrl` passed |
| `ANALYTICS_URL` | SDK server | Unless `ingestUrl` passed |

## Deployment

Ingestion: Vercel project `ingestion`, served at `https://ingestion.remcostoeten.nl` behind Cloudflare. `vercel.json` builds `packages/ingestion`, then `apps/ingestion/scripts/build.ts` bundles `dist/vercel.js` into a nodejs20.x function, copies or downloads both MMDB files, and routes everything to it.

npm packages: no release script; bump, build and `npm publish` by hand from `packages/sdk` and `packages/ingestion`.

## Commands

| Command | Does |
|---|---|
| `bun run build` | builds every workspace |
| `bun run typecheck` | `tsgo --noEmit` per workspace |
| `bun run lint` | `oxlint apps packages --deny-warnings` |
| `bun run fmt` / `fmt:check` | oxfmt over `apps` and `packages` |
| `bun run test` | `bun test` per workspace |
| `bun run dev:ingestion` | local ingestion server |
| `bun run demo:db` | local seeded Postgres |

Before merge: `bun run typecheck`, `bun run lint`, `bun run test`. CI (`.github/workflows/ci.yml`) builds packages, then typecheck, lint, fmt:check, test.

Tests are `bun:test`. Ingestion: `packages/ingestion/tests/{unit,integration}`, integration uses in-memory PGlite. SDK: `packages/sdk/__tests__`. Aim for ~60% unit, 30% integration, 10% E2E. Run E2E and load tests when changing the ingestion flow or SDK tracking lifecycle.

## Budgets

- Ingestion latency < 100ms p95
- SDK bundle < 5KB gzipped (not enforced by a script)

## Gotchas

- Rate limiter, in-memory dedupe, `/metrics`, `/events` SSE and request counters are per serverless instance. Only the fingerprint index is durable.
- Validation, hashing and auth run before rate limiting; 4xx responses are not rate limited.
- UA parsing uses client-supplied `payload.ua`; bot detection uses request headers.
- Offline batch flushes get geo from the flushing request, not the original one.
- `.internal/docs/` is gitignored and partly stale; verify against code.
