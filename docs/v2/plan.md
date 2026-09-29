# Analytics SDK v2 plan

Sep 27, 2026 · @Remco

Rebuild the SDK as `@remcostoeten/analytics@2` on a versioned contract, `POST /v2/events`, served by a new Elysia API built on one reusable engine. The API also owns reads, sign-in, OpenAPI docs, bot scoring, speed insights and error tracking. Projects stay public by default and can be made private. The Hono ingestion keeps serving `/e` for 1.x clients until they are gone.

This tab is the plan. The API reference tab has every route with full examples, Capabilities and gaps compares v2 with other tools, and Epics and prompts splits the work into agent-sized tasks.

## Decisions needed

Seven decisions are settled in the thread; the rest are open with a recommended default, and the whole plan assumes those defaults. A proposed decision waits on Remco before its epic starts. Changing one mostly affects the sections named in the last column.

| # | Decision | Status | Choice | Affects |
| --- | --- | --- | --- | --- |
| 1 | Path version | Settled | `/v2`; the unversioned `/e` counts as v1. After 2.0, path and package versions move independently | REST API |
| 2 | Project visibility | Settled | Projects are `public` by default, like the dashboard today, and can be switched to `private` | Access and sign-in |
| 3 | Lint baseline | Settled | The Skriuw lint rulebook, Oxlint 1.85.0 and oxfmt 0.70.0 | Linting and formatting |
| 4 | Where the new API lives | Open, default | Elysia service in `apps/api` for ingest, reads and sign-in, on the shared engine. Fallback if the Vercel spike fails: `/v2` routes on Hono with oRPC | Architecture, Phases |
| 5 | Package name | Open, default | `@remcostoeten/analytics@2.0.0` on the same name, ESM only | SDK API shape, Build |
| 6 | What a project is | Open, default | A config row owned by you: visibility, origins, keys, retention. Not a tenant | Storage, REST API |
| 7 | Visitor-level data on public projects | Open, default | Admin-only unless a project turns on `publicVisitorData`; default off | Access and sign-in |
| 8 | Admin sign-in | Open, default | GitHub OAuth in the API through Better Auth with the `dashboard_users` allowlist and an admin-only session cookie. Reads the repo's no-cookies rule as covering tracked visitors only | Access and sign-in |
| 9 | Event names | Open, default | One `name` field with snake\_case built-ins; ingest maps them onto legacy `type` and `meta.eventName` during the transition | Envelope, Storage |
| 10 | Contract schema library | Open, default | TypeBox; the SDK imports only its types | Contract, Build |
| 11 | Indentation | Settled | Adopt Skriuw's oxfmt defaults and reformat the repo once in the phase 0 lint PR, instead of keeping tabs | Linting and formatting |
| 12 | Patch 1.x first | Settled | No. 1.x is frozen and gets no more releases; the web vitals and own-traffic fixes ship with 2.0 | Phases |
| 13 | Branching | Settled | Trunk on master: v1 in `v1/`, v2 at the root, epics squash-merge into master | Branching, Phases |
| 14 | Who runs this | Settled | Models 1 and 2: you self-host, and others can self-host their own copy. A hosted service stays a note for later | Who runs this |
| 15 | Roles and SQL access | Open, default | Better Auth organizations with owner, admin, analyst and viewer roles; SQL for owner, admin, analyst and sql-scoped tokens only, every run logged | Access and sign-in |
| 16 | Alerts | Proposed | Mail transport once per deployment from `MAIL_URL` (SMTP or Resend), never stored; channels (mail, webhook) per project in the database, set through `/v2/projects/:project/alerts` and the SDK's new `/admin` entry; deliveries queued in an outbox with retries. See [alerts.md](alerts.md) | Errors, REST API, SDK API shape |

One open question is not a choice between options: Elysia on Vercel. Elysia documents a Vercel integration, but runtime, cold start and MMDB bundling need a short spike in phase 1 before the API commits to it.

## Starting point

The current SDK works but has no contract, no retries and effectively only user-agent bot detection. Each row below is something v2 fixes by design, not by patching.

| Area | Today | Evidence |
| --- | --- | --- |
| API shape | 20+ free functions, each taking an `options` bag last; `trackTransaction(revenue, currency, orderId, items, options)` is positional | `packages/sdk/src/api/track.ts` |
| Event naming | Two axes: `type` (`pageview`, `event`, `click`, `error`, any string) plus `meta.eventName`; the dashboard filters on `meta->>'eventName'` in 34 places | `types/index.ts`, `apps/dashboard/src/lib/queries` |
| Typing | `meta` is an open record; no way to declare your own events and get typed props | `types/index.ts` |
| Transport | One request per event; `sendBeacon` returns true even when the server rejects, so failures are invisible; no retry beyond the `online` event | `track.ts`, `utilities/offline-queue.ts` |
| Payload | Sends `ua`, `origin`, `host` in the body although the request already carries them; the server parses the body UA, so it can be spoofed independently of the header | `track.ts`, ingestion `handlers/ingest.ts` |
| Bundle | Browser entry is 5.4 KB min+gzip, over the 5 KB budget; every observer ships whether used or not | measured from `dist/browser/index.js` |
| Bot detection | Any UA containing `Firefox/` or `Brave` returns human before other checks, so a spoofed Firefox UA always passes. The header check only runs for GET navigations, so it never fires on `POST /e`. Broad regexes like `/monitor/i`, `/rss/i`, `/bot/i` risk false positives | `ingestion/src/utilities/bot-detection.ts` |
| Bot filtering | Rollups exclude bots; the dashboard's `publicTraffic` filter does not | `utilities/rollup.ts`, `queries/filters.ts` |
| Sessions | `session_id` is unique globally, not per project | `db/schema.ts` |
| Projects | `projectId` is a free string, defaulting to the hostname; the origin allowlist is one env var for all projects | `ingest-auth.ts` |

## Architecture

One new service owns every v2 route; the pipeline code both services need moves into plain functions they import.

&#91;embedded content: v2 architecture · two services, one database\]

Where each piece lives is in the Monorepo structure section below.

## Monorepo structure

**Update, Sep 28:** Remco narrowed the v2 scope for now to the SDK, ingestion and the whole API, plus a docs site (`apps/docs`, Fumadocs) that lists every SDK method and API route, with a small SQL query page and an auth overview. The v2 dashboard (E4.5) waits for Remco's own design; when it comes, its parity tests compare each view against fixed expected values from a seeded dataset rather than running v1's queries.

**Update, Sep 27:** v1 now lives in `v1/` ([PR #23](https://github.com/remcostoeten/analytics/pull/23), on `master` since [PR #24](https://github.com/remcostoeten/analytics/pull/24)): `v1/apps/dashboard`, `v1/apps/ingestion`, `v1/packages/ingestion`, `v1/packages/sdk`, `v1/packages/typescript` and `v1/scripts/demo-db`. The tree below shows v2's folders; where it says "existing", read `v1/`. v2 never imports from `v1/`: logic is copied into the engine with its tests, and the v2 dashboard is a new `apps/dashboard`.

New code goes into the existing `apps/` and `packages/` folders, not a separate `v2/` folder, so nothing needs moving again once 1.x is gone. The SDK is rewritten in place because 2.0 is the same npm package; 1.x is frozen in `v1/` until v2 replaces it.

```text
analytics/
├─ apps/
│  ├─ api/                 new: v2 API on Elysia, private
│  │  ├─ src/
│  │  │  ├─ index.ts        server entry and Vercel export
│  │  │  ├─ app.ts          composes plugins and modules
│  │  │  ├─ plugins/        request-id, cors, auth, error-handler, openapi
│  │  │  └─ modules/
│  │  │     ├─ events/      route.ts, service.ts, model.ts, __tests__/
│  │  │     ├─ projects/
│  │  │     ├─ stats/
│  │  │     ├─ visitors/
│  │  │     ├─ issues/
│  │  │     ├─ tokens/
│  │  │     ├─ auth/
│  │  │     └─ admin/
│  │  └─ vercel.json
│  ├─ dashboard/           existing Next app; moves to the API in phase 4
│  └─ ingestion/           existing legacy deploy shell; removed in phase 5
├─ packages/
│  ├─ contract/            new: @remcostoeten/analytics-contract
│  │  └─ src/             events.ts, errors.ts, projects.ts, stats.ts, visitors.ts, issues.ts
│  ├─ shared/              new: semantic types, Result, noop; private
│  ├─ engine/              new: @remcostoeten/analytics-engine; private until stable
│  │  └─ src/
│  │     ├─ define.ts       defineStage, defineSignal, defineEnricher, defineDimension
│  │     ├─ pipeline.ts     the fixed stage order
│  │     ├─ stages/ signals/ enrichers/ dimensions/
│  │     ├─ ports/          EventStore, GeoLookup, RateLimiter, Hasher, Clock, Logger
│  │     ├─ adapters/       postgres, pglite, memory, maxmind
│  │     └─ db/             schema.ts and numbered SQL migrations
│  ├─ sdk/                 @remcostoeten/analytics, rewritten for 2.0
│  │  └─ src/
│  │     ├─ core/           client, queue, identity, storage, consent
│  │     ├─ plugins/        pageviews, web-vitals, scroll-depth, errors, ignore-self, ...
│  │     ├─ transports/     beacon, proxy
│  │     ├─ react/  server/  proxy/
│  │     └─ internal/       shared inside the package, not exported
│  ├─ ingestion/           existing legacy pipeline; its utilities move into engine, then it is removed
│  └─ typescript/          existing shared tsconfig
├─ e2e/                    Playwright tests across SDK, API and dashboard
├─ tools/
│  └─ oxlint/              anti-slop/, house/
├─ scripts/                demo-db/, size-check.ts, openapi-diff.ts, check-boundaries.ts
├─ docs/                   inventory, roadmap, decisions/ for short decision records
├─ .github/workflows/ci.yml
├─ .oxlintrc.json  .oxfmtrc.json  lefthook.yml  .editorconfig
├─ package.json            workspaces apps/* and packages/*, catalogs
└─ AGENTS.md
```

Who may import whom, checked by `scripts/check-boundaries.ts` in CI:

| Package | May import |
| --- | --- |
| `shared` | nothing inside the repo |
| `contract` | `shared` |
| `engine` | `contract`, `shared` |
| `sdk` | `shared` bundled in; `contract` for types only, so no validator ships |
| `apps/api` | `engine`, `contract`, `shared` |
| `apps/dashboard` | the API's route types through Eden Treaty, `contract` |

Conventions for every package: `package.json`, a `tsconfig.json` extending `@remcostoeten/tsconfig`, `src/`, a README, and tests in a `__tests__/` folder next to the code they test, which is the pattern the lint overrides already match. Ingestion's current `tests/unit` and `tests/integration` move to that pattern as the code moves into `engine`. Files are kebab-case, and an `index.ts` barrel exists only where a folder has several exports.

The empty `apps/sdk-demo` folder left from the earlier cleanup gets deleted.

## Engine and modules

All logic lives in one runtime-free engine package; the API, the legacy Hono service, a backfill CLI and the tests are thin hosts around it. Every feature is a small module registered in one list, so adding bot detection rules, enrichers, report dimensions or SDK features means adding a file, not editing a pipeline.

&#91;embedded content: engine · hosts, stages, plug-in points, ports\]

Six kinds of module, one `define*` helper each:

| Kind | Where | Examples | Adding one |
| --- | --- | --- | --- |
| Stage | `engine/stages/` | parse, authorize, bot score, enrich, flags, dedupe, persist, sessions | Rare; the order is fixed in `pipeline.ts` |
| Signal | `engine/signals/` | `ua-crawler`, `asn-datacenter`, `headers-inconsistent`, `client-webdriver`, `session-velocity`, `ip-fanout` | One file plus one line in `signals/index.ts` |
| Enricher | `engine/enrichers/` | `geo`, `user-agent`, `network`, `forwarded-proxy`, `utm` | One file plus one line |
| Dimension | `engine/dimensions/` | `page`, `referrer_domain`, `country`, `browser`, `web_vital` | One file; the `breakdown` and `filter` routes pick it up with no route change |
| SDK plugin | `sdk/plugins/` | `pageviews`, `speedInsights`, `scrollDepth`, `botSignals`, `ignoreSelf`, `outboundLinks` | One file, exported from `./plugins` |
| SDK transport | `sdk/transports/` | `beacon` (direct), `proxy` (same-origin path for ad blockers) | One file |

A bot signal, the most common thing to add:

```ts
import { defineSignal } from "../define";

/**
 * @name asnDatacenter
 * @description Scores requests from hosting-provider networks, which real visitors rarely use.
 * @example
 * createEngine({ signals: [asnDatacenter] })
 */
export const asnDatacenter = defineSignal({
  name: "asn_datacenter",
  weight: 40,
  detect: (input) => HOSTING_ASNS.has(input.network.asn),
});
```

The engine, created by a host with its adapters:

```ts
const engine = createEngine({
  store: postgresStore(db),
  geo: maxmindGeo(paths),
  limiter: postgresLimiter(db),
  signals: defaultSignals,
  enrichers: defaultEnrichers,
});

const result = await engine.ingest(request);
```

An SDK plugin, using the same shape on the client:

```ts
export function ignoreSelf(): Plugin {
  return definePlugin({
    name: "ignore-self",
    setup: (client) => {
      if (readIgnoreParam()) client.storage.set("ignore", true);
      return client.beforeSend((event) => (client.storage.get("ignore") ? null : event));
    },
  });
}
```

Plugin hooks: `setup` returns a cleanup function; `beforeSend` can change or drop an event and runs in registration order; `onPage`, `onHidden` and `onConsent` react to lifecycle changes. Consent, opt-out and self-ignore are plugins too, so the core only queues and sends.

Rules that keep the modules clean:

- A module imports only `contract`, `shared` and the engine's `define` helpers, never another module. `oxlint import/no-cycle` plus a folder boundary check in CI enforce it.
- Each module is a pure function of its input and the ports it was given, so it is unit-tested alone, with a test file beside it.
- Ports are plain types (`EventStore`, `GeoLookup`, `RateLimiter`, `Hasher`, `Clock`); adapters are factory functions returning objects of functions. No classes, per the house rules.
- Every signal, enricher and dimension is listed in one `index.ts` per folder, which is also where you see and reorder everything that runs.
- The same engine re-scores history: the backfill CLI runs the bot stage over stored events after a signal changes.

The API's modules stay thin: route, model and service, where the service calls the engine. Reads work the same way: the `breakdown` service looks the dimension up in the registry and builds its SQL from the dimension's definition.

## Ok&#32;

The full method list, config options, usage in every environment, error tracking in code and the internal structure are in SDK design, which replaces the method table that used to be here. In short: `track`, `page`, `identify`, `register`, `captureError`, `captureMessage`, `scope`, `use`, `consent.*`, `optOut`/`optIn`, `reset`, `flush`, `shutdown`, `on` and `status`.

Entries:

- `.` framework-free browser core: client, pre-init queue, batching, the `beacon` transport, identity, consent, and the `pageviews` plugin. Budget 4.5 KB min+gzip: the first build with the full API from the SDK design tab measured 4.35 KB, and Remco raised the budget from 2.5 KB on Sep 28 rather than move methods out of the core.
- `./plugins` one export per plugin: `speedInsights`, `scrollDepth`, `engagement`, `clicks`, `outboundLinks` (including file downloads), `forms`, `errors`, `notFound`, `ignoreSelf`, `botSignals`, `experiments`. Each under 0.6 KB except `speedInsights`, which lazy-loads `web-vitals` and has a 2.5 KB budget, and `errors` at 0.7 KB, which carries breadcrumbs and scrubbing.
- `./react` `AnalyticsProvider client={analytics}`, `useAnalytics()`, `TrackClick`, `ErrorBoundary`, `useRoutePageviews` for router adapters, and `computeRoute`. Gets `"use client"`. Budget 1.5 KB.
- `./next` the Next adapter `Analytics`, which supplies `route` from `usePathname` and `useParams`. A separate entry so `./react` never imports `next/navigation`; it shares a chunk with `./react`, so both use one React context. Gets `"use client"`. Budget 1 KB.
- `./server` `createServerAnalytics({ project, secret, endpoint })` with `track`, `identify`, `captureError`, batching, and `flush()`; forwards the visitor's user agent and IP from a passed request and uses `waitUntil` when the runtime has it.
- `./proxy` `createProxy({ secret, endpoint })`, a fetch-standard handler for the same-origin path, and `createPageCounter` for middleware, which counts HTML page loads as `page_request` events for the blocked-share estimate.

Build config: the browser client reads JSON from `NEXT_PUBLIC_RA_CONFIG`, `PUBLIC_RA_CONFIG` or `VITE_RA_CONFIG`, the server client and proxy from `RA_CONFIG`, each with literal `process.env` or `import.meta.env` access; explicit options win, except ones that are `undefined`.

Other options: `mode` (`auto` reads `NODE_ENV`; development logs and sends nothing unless `endpoint` is set explicitly), `debug`, `route` for adapters, and `beforeSend`. Props are limited to 25 per event, with names, keys and values up to 255 characters and flat primitive values.

What stays: no cookies, localStorage visitor id, sessionStorage session with a 30-minute sliding window, DNT and opt-out honoured, nothing persisted without consent. Storage keys move to one `__ra` JSON key; 2.0 reads the 1.x keys once and migrates them so visitors keep their id.

## Event envelope and transport

Every request is a batch, every event has a client-made UUIDv7 id that survives retries, and the server derives anything it can see itself.

```json
{
  "v": 1,
  "sentAt": "2026-09-27T16:40:00.000Z",
  "events": [
    {
      "id": "01928c3e-7a4b-7c1d-9f00-2b7c1e5d8a11",
      "name": "pageview",
      "ts": "2026-09-27T16:39:58.412Z",
      "visitor": "8c4e...",
      "session": "f1a2...",
      "page": { "path": "/blog/x", "route": "/blog/[slug]", "referrer": "https://news.ycombinator.com/", "title": "X" },
      "props": {},
      "context": { "screen": "1440x900", "viewport": "1280x720", "tz": "Europe/Amsterdam", "lang": "nl-NL", "utm": { "source": "hn" } },
      "signals": 0
    }
  ]
}
```

- **Removed from the body**: `ua`, `origin`, `host`, `projectId`. The server takes UA and origin from headers and the project from the key, so they cannot disagree with the request.
- **`sentAt`** lets the server correct client clock skew: `ts + (receivedAt - sentAt)`. This replaces the current 2-minute and 7-day acceptance window.
- **`signals`** is a bitfield of client bot hints, described under Bot detection.
- **Batching**: events queue in memory and flush after 5 seconds, at 20 events, or on `pagehide` and `visibilitychange` to hidden. Body limit 60 KB so it fits `sendBeacon`'s 64 KB.
- **Content type**: `text/plain` with a JSON body. That is a CORS-safelisted type, so browsers skip the preflight `OPTIONS` request that `application/json` triggers cross-origin.
- **Retries**: `fetch` with `keepalive` normally, `sendBeacon` only on unload. On a network error or 5xx, retry with backoff (1 s, 4 s, 16 s), then persist to the queue if consent allows. On 4xx, drop the batch. The same event ids are resent, so the server's unique index makes retries safe.
- **Server SDK**: `application/json` with `Authorization: Bearer sk_...`, same envelope, plus an optional `context.ua` and `context.ip` so server-side tracking can forward the original visitor's details.

## REST API

About 25 routes under `/v2` replace the 50 `?metric=` selectors and the dashboard's own auth routes. Most read views collapse into one `breakdown/:dimension` route. Every route, its access level, the query parameters and example responses are in API reference.

| Group | Routes | Who can call them |
| --- | --- | --- |
| Ingest | `POST /v2/events` | Browser with a public key from an allowed origin, or a server with a secret key |
| Aggregate reads | `stats`, `timeseries`, `breakdown/:dimension`, `paths`, `retention`, `heatmap`, `map`, `realtime` and `realtime/events` under `/v2/projects/:project` | Anyone for a public project, admin or read token for a private one |
| Visitor-level reads | `events`, `visitors`, `visitors/:visitor`, `sessions/:session/events` | Admin or read token; anyone only if the project is public and has `publicVisitorData` on |
| Project settings | `POST /v2/projects`, `PATCH /v2/projects/:project`, key rotation | Admin |
| Project list | `GET /v2/projects` | Anyone sees public projects; an admin sees all and can filter with `visibility=private` |
| Sign-in and tokens | `/v2/auth/*`, `/v2/tokens` | Public sign-in flow; token management is admin |
| Operations | `/v2/admin/metrics`, `POST /v2/admin/jobs/:job` | Admin, or the cron secret for jobs |
| Docs | `/v2/openapi`, `/v2/openapi/json`, `/v2/health` | Anyone |

Shared rules:

- Lists return `{ data, nextCursor }` with `limit` at most 100.
- Errors always return `{ error: { code, message, details? } }` with UPPER\_SNAKE codes; the full list with statuses is at the end of the API reference tab.
- A private project answers 404 to anyone without access, so its existence does not leak.
- Public aggregate reads send `Cache-Control: public, s-maxage=60` so Cloudflare absorbs repeat traffic; private reads send `private, no-store`.
- Public reads have their own per-IP-hash rate limit, separate from ingest.

The `skriuw-*` selectors and the PostHog proxy stay out of v2. Product-specific views become saved filters over `breakdown` and `events` once they are needed.

## Access and sign-in

Each kind of caller has its own credential, and only the admin needs a sign-in flow. Anonymous callers are a real, supported caller, not a fallback.

| Caller | Credential | Can do |
| --- | --- | --- |
| Anyone | none | Read public projects' aggregates, the project list, docs |
| Visitor's browser via the SDK | `X-Project-Key: pk_...` plus an Origin in the project's `allowed_origins` | Send events |
| Your server via the SDK | `Authorization: Bearer sk_...`, shown once at rotation and stored hashed | Send events, forward the visitor's UA and IP for hashing |
| You in the dashboard | Session cookie from GitHub sign-in | Everything, including private projects and settings |
| Scripts, CI, other frontends | `Authorization: Bearer at_...` API token with scope `read` or `admin` and an optional project list, stored hashed | What the scope allows |
| Vercel cron | `Authorization: Bearer CRON_SECRET` | Run rollup and cleanup |

How the dashboard signs you in:

1. **Sign in** sends the browser to the API's GitHub sign-in route under `/v2/auth`.
2. GitHub redirects back to the API. The API checks the GitHub login against the existing `dashboard_users` allowlist, stores a session, and sets an httpOnly, Secure, `SameSite=Lax` cookie scoped to `.remcostoeten.nl`, then redirects to the dashboard.
3. The dashboard's server components forward that cookie on API calls, and browser calls use `credentials: 'include'`. CORS allows credentials only for the dashboard origin; today the API reflects any origin.
4. `GET /v2/auth/session` tells the dashboard whether to show private projects, the visibility filter and admin controls. Signed out, the same dashboard renders public projects only.

So yes, sign-in needs API routes. Putting them in the API rather than the dashboard means every frontend, including a future public embed, goes through one access check. Better Auth has a documented Elysia integration (`.mount(auth.handler)`) and brings the GitHub provider and session storage, so there is no hand-written OAuth. The dashboard's current OAuth routes retire in phase 4.

The cookie needs the API and dashboard on subdomains of one site, for example `api.remcostoeten.nl` and `analytics.remcostoeten.nl`. If they ever live on different sites, the dashboard switches to an API token held server-side.

### Roles

One admin allowlist is enough for you alone, but not for letting someone else look at one project or run SQL. v2 uses Better Auth's organization plugin from the start, with a single organization for you, so roles exist without building a user system:

| Role | Scope | Can |
| --- | --- | --- |
| Owner | Organization | Everything, including members, keys, deleting projects |
| Admin | Organization or listed projects | Settings, visibility, internal-traffic marking, tokens, SQL |
| Analyst | Listed projects | All reads including visitor-level data, and SQL |
| Viewer | Listed projects | Aggregate reads only, the same as a public project shows |

API tokens get the same scopes plus one more split: `read`, `sql` and `admin`, each limited to listed projects.

### Who can run SQL

- Only owners, admins and analysts, or a token with the `sql` scope, and only on the projects their role lists. Never anonymous visitors, even on a public project with `publicVisitorData` on, because SQL can reach every visitor-level row.
- Each project has an `sqlEnabled` switch, on by default; off blocks SQL on it for everyone except the owner.
- Every run is logged in a `query_runs` table: who, when, which projects, the SQL, duration, rows, and whether it was blocked. Owners see all runs; everyone sees their own through `/v2/queries/history`.
- The database enforces the scope too: the API sets the caller's allowed project ids and their signature on the transaction, and the views return nothing outside a correctly signed list.

## Who runs this

The plan as written is for you running it for yourself: one deployment, one database, one organization, and projects that are yours. That leaves three possible futures, and they differ a lot in work:

| Model | What it means | Extra work |
| --- | --- | --- |
| You, self-hosted | Your sites, your Vercel and Neon, you and a few people you add | None beyond this plan |
| Others self-host their own copy | Anyone forks the repo and deploys their own API, dashboard and database; your SDK points at their endpoint | Small: a setup guide, one `.env.example`, a first-run command that creates the owner and first project, and a one-click deploy button. The SDK already takes any `endpoint` |
| Others use your hosted service | People sign up on your deployment and send their sites' data to you | Large: sign-up and email, many organizations isolated from each other, quotas and rate limits per organization, abuse protection, billing, a privacy policy and data processing agreement, backups and support. Plus the cost of storing other people's traffic |

Decided: models 1 and 2. For model 2 the plan adds a setup guide, `.env.example`, a `bun run setup` command that runs migrations and creates the owner, organization and first project, and a Vercel deploy button; that work joins epic E5.1. Organizations and roles from Better Auth, an `org_id` on `projects` and row-level security keyed on allowed project ids are built anyway, and they are what would make model 3 possible without reworking the core.

**Note for later: a hosted service (model 3).**

What could be built on top of this plan:

- Sign-up with email or GitHub, creating an organization with its first project and keys.
- An onboarding page that shows the SDK snippet and waits for the first event.
- Plans with monthly event quotas, enforced at ingest per organization, with usage shown in the dashboard.
- Billing through Stripe or Lemon Squeezy, tied to those quotas.
- Team invitations and roles, already covered by the organization plugin.
- A status page and per-organization data export and deletion.

What would need looking into first:

- Cost: storage and compute per million events on Neon and Vercel, and whether a column store such as ClickHouse or Tinybird becomes necessary at other people's volumes.
- Isolation: whether row-level security per organization is enough, or large customers need their own database or schema.
- Abuse: sign-up spam, fake ingest traffic, and public keys being reused on other sites.
- Legal: a privacy policy, a data processing agreement, where data is stored (EU), and handling deletion requests under GDPR.
- Operations: backups and restore tests, uptime monitoring, incident handling, and support.
- Rate limiting that is global rather than per serverless instance, likely Cloudflare or a Redis-backed limiter.

## OpenAPI and docs

The OpenAPI document is generated from the same TypeBox schemas that validate requests, so it cannot drift from the code.

- `@elysiajs/openapi` serves interactive docs at `/v2/openapi` and the OpenAPI 3 JSON at `/v2/openapi/json`, both public.
- Better Auth's routes are merged into the same document under an `Auth` tag, using the method the Elysia skill documents.
- Each route declares `detail.summary`, `tags` and every response status it can return, including the error envelope.
- CI exports the document on every PR, runs the api-design skill's review on it, and diffs it against the last release to flag breaking changes.
- The dashboard calls the API through Eden Treaty, which reads the same route types, so a breaking change fails its typecheck before it ships.

## REST, tRPC or oRPC

Stay with REST plus OpenAPI through Elysia; neither tRPC nor oRPC adds something this project lacks.

|  | What it is | Fit here |
| --- | --- | --- |
| REST with Elysia and Eden Treaty (the plan) | Normal HTTP routes with schemas. Eden Treaty is Elysia's client: the dashboard imports the API's type and gets typed calls such as `api.v2.projects({ project }).stats.get()`, with no code generation | Plain URLs work for `sendBeacon`, curl, other languages and a public API; OpenAPI comes free; the dashboard still gets end-to-end types |
| tRPC | A TypeScript RPC library. You define procedures on the server and the client calls them as functions, using its own request format such as `/trpc/stats.get?input=...` | Types are excellent, but only for TypeScript clients in the same repo. No OpenAPI without third-party adapters, and ingest cannot use it because `sendBeacon` needs a plain POST. It would duplicate what Eden Treaty already gives |
| oRPC | A newer RPC library with the same function-call style, but contract-first and able to expose each procedure as a real HTTP route with an OpenAPI document. Runs on Hono, Elysia, Next and others | Close to what Elysia plus Eden gives. It becomes the right choice only if the Elysia spike fails and the API stays on Hono, because Hono has no Eden equivalent |

So tRPC is not worth it here, and oRPC is the fallback paired with decision 1's alternative.

## Realtime

Realtime belongs in this plan because it decides the hosting shape: serverless functions cannot hold a shared in-memory list of listeners, which is exactly why today's `/events` stream only sees traffic on its own instance.

The design keeps Postgres as the only source of truth and hides delivery behind one engine port, `RealtimeFeed`, so the delivery method can change without touching routes or the dashboard:

| Stage | How | Why |
| --- | --- | --- |
| Now (phase 4) | `GET /realtime/events?after=<cursor>` long-polls: it answers at once when newer events exist, otherwise waits up to 25 seconds, checking an index on `(project_id, received_at, id)` (migration 0023) every 2 seconds. The dashboard's live counter and stream use it; KPI tiles simply refetch every 30 seconds | Works on Vercel today, needs no new service, and costs one indexed query per open dashboard every 2 seconds, which is fine for a handful of viewers |
| Later, if needed | A Cloudflare Durable Object per project: after ingest persists a batch, it forwards a summary to that project's object, which holds WebSocket connections and the last 5 minutes in memory | You are already behind Cloudflare; true push, one hub per project so every viewer sees the same stream, and no polling load on Neon |

- The response shape is the same in both stages (events with a cursor), so the dashboard does not change when delivery does.
- Server-sent events stay available on the same route for clients that prefer a stream; on Vercel they reconnect when the function's time limit ends, carrying the last cursor.
- Live data respects the same access rules: a public project's stream shows aggregate events, visitor-level fields only with `detail` access.
- Postgres `LISTEN/NOTIFY` is left out: it needs a long-lived direct connection, which neither Vercel functions nor Neon's pooled connections give.

## Other ways to use the data

The REST API is the base; these are thin layers on top of it, each a later epic unless noted:

| Layer | What it gives you | Worth it |
| --- | --- | --- |
| Webhooks | Your URL gets a signed POST on events you pick: new issue, regression, traffic spike, speed drop, a goal reached | Yes, later: small, and the alerting in Errors already needs most of it |
| MCP server | Claude and other AI tools can query your analytics directly ("which pages got slower this week?") through tools that call the same API with a read token | Yes, cheap: a thin wrapper over existing routes, and it fits how you already work |
| Share links and embeds | A signed, read-only link or iframe for one project or one chart, even for a private project, with an expiry | Yes, later: covers "show a client their stats" without making the project public |
| Badges | An SVG like "1.2k visitors this week" for READMEs, from a public project | Optional, very small |
| Generated clients | TypeScript through Eden and the contract package now; Python or Go generated from the OpenAPI document if ever needed | Only on demand |
| Scheduled exports | A nightly CSV or Parquet dump of events to S3-compatible storage such as Cloudflare R2 | Only if you want a long-term archive beyond the retention window |
| GraphQL | One flexible query endpoint | No: the breakdown route plus SQL already cover flexible querying, and it would double the surface to secure |

## Storage

Stay on Neon Postgres and the existing tables; every change is additive, so the Hono service and the current dashboard keep working throughout.

| Migration | Change | Why |
| --- | --- | --- |
| 0009 | New `projects` table: `id` slug, `name`, `visibility` (`public` or `private`, default `public`), `public_visitor_data` boolean default false, `allowed_origins text[]`, `public_key`, `secret_key_hash`, `retention_days`, timestamps | Moves `ORIGIN_ALLOWLIST` and `INGEST_SECRET` from env into per-project rows and holds the visibility switch. Existing distinct `project_id` values are seeded as public rows, matching today |
| 0010 | `events.name text`, backfilled from `COALESCE(meta->>'eventName', type)`; index `(project_id, name, ts)` | Stops the 34 `meta->>'eventName'` lookups in dashboard queries |
| 0011 | `events.bot_score smallint`, `events.bot_reasons text[]`, `sessions.bot_score smallint`; partial index on `(project_id, ts) WHERE bot_score < 50` | One scored bot model instead of a boolean, and fast human-only reads |
| 0012 | Unique index on `sessions (project_id, session_id)` next to the global one, which v1's `ON CONFLICT (session_id)` still needs; the global index is dropped with v1 in E5.1, and until then one session id cannot be stored under two projects | Session ids are only unique per project |
| 0013 | `events.schema_version smallint` default 0; v2 writes 1 | Tells legacy rows apart during the transition |
| 0014 | Better Auth's user, session and account tables, generated through its Drizzle adapter; `dashboard_users` stays as the allowlist | Admin sign-in |
| 0015 | `api_tokens`: `id`, `name`, `token_hash`, `scope` (`read` or `admin`, `sql` from 0022), `project_ids text[]` null for all, `last_used_at`, `expires_at`, timestamps | Scripts, CI and other frontends |

Later migrations: 0016 `issues` and 0017 `events.issue_id` (see Errors); 0018 `web_vitals`, 0019 `rollup_vitals` (see Speed insights); 0020 a nullable `route` column on `events`, `sessions` and `rollup_daily` so reports group by route template; 0021 `rate_limits`; 0022 `projects.org_id` and `projects.sql_enabled`, `auth_member.project_ids` for roles limited to listed projects, the `sql` token scope, and the `query_runs` log; 0023 the `(project_id, received_at, id)` index the realtime feed polls; 0024 the `query` schema with the nine console views, the `analytics_reader` role and the `query_secret` that signs a query's project ids; 0025 `saved_queries`; 0026 `issues.is_regression` and the per-minute sampling counter; 0027 `error_rules` and the mute and alert columns on `issues`; 0028 `ingest_counts`, `job_runs` and `speed_checks` behind `/v2/admin/metrics`.

- **Idempotency**: the event `id` (UUIDv7) goes into the existing `fingerprint` column, so the unique index `events_fingerprint_uidx` rejects retries. The key lives as long as the event does, which outlives any client retry window.
- **Writes**: one multi-row `INSERT ... ON CONFLICT DO NOTHING RETURNING` per batch, then session and visitor upserts grouped per session. Today's batch handler loops one event at a time.
- **IP**: v2 keeps the daily-salted sha256 hash and never stores the raw IP, including a forwarded `context.ip` from the server SDK.
- **Rollups**: add `referrer`, `device` and `event` dimensions and a `human` flag. The daily job re-runs the last 8 days so late offline events and late bot scores land.
- **Later, not now**: monthly range partitions on `events` so retention becomes `DROP PARTITION` instead of `DELETE`. Worth doing once the table passes a few million rows.

All of this follows the repo's schema checklist: `schema.ts`, a numbered idempotent SQL file, the PGlite DDL in `tests/setup.ts`, then a manual apply to Neon. Shared id and timestamp columns come from one `baseEntity` helper as the rules require.

## Bot detection

Score every event from 0 (human) to 100 (bot) from three layers, store the score and its reasons, and filter at read time. An analytics endpoint cannot be made unforgeable, so the goal is honest classification, not blocking. Only rate-limit abuse is rejected outright.

| Layer | Signal | Starting weight | Reason code |
| --- | --- | --- | --- |
| Edge, at ingest | Known crawler UA (Googlebot, GPTBot, AhrefsBot and similar), one curated list | 100 | `ua_crawler` |
| Edge | Automation UA (curl, python-requests, HeadlessChrome, Playwright, Puppeteer) | 100 | `ua_automation` |
| Edge | `x-vercel-bot` or a Cloudflare verified-bot header, if forwarded | 100 | `edge_verified_bot` |
| Edge | ASN belongs to a hosting provider (AWS, GCP, Azure, Hetzner, OVH, DigitalOcean), from the ASN MMDB already bundled | 40 | `asn_datacenter` |
| Edge | Chromium UA without `sec-ch-ua`, or a modern browser UA without `sec-fetch-*` headers on the POST | 30 | `headers_inconsistent` |
| Edge | No `accept-language` header | 15 | `headers_missing` |
| Client, via `signals` | `navigator.webdriver` is true | 60 | `client_webdriver` |
| Client | Zero-size outer window, no languages, or a Chrome UA without `window.chrome` | 25 | `client_headless` |
| Client | No pointer, key, touch or scroll input before the event, and the page was never visible | 20 | `client_no_input` |
| Session, in the daily job | More than 30 pageviews a minute, near-identical gaps between events, or 0 ms engagement across 5+ pages | 50 | `session_velocity` |
| Session | Over 20 visitor ids from one IP hash in a day | 40 | `ip_fanout` |

- **Combining**: sum the weights, cap at 100, and treat 50 or more as bot. The weights are a starting point to tune against real traffic, not measured values.
- **Session layer** runs in the daily rollup job, raises `sessions.bot_score`, and copies it onto that session's events. That catches bots that pass every per-request check.
- **Fixes to the current code**: drop the Firefox and Brave early return that lets spoofed UAs through, run header checks on POST, and remove the broad `/bot/`, `/monitor/`, `/rss/` patterns in favour of the named list.
- **Client signals cost** an estimated 300 bytes in the core bundle and are one byte on the wire. They can be faked, which is why they only add weight and never clear an event.
- **Tests**: a Playwright run against the local API must score above 50; a real Chromium session with scripted mouse input must score below 50.

## Your own traffic

Your own visits should never count, on any device, without you having to find and toggle each visitor id. Today's exclusion is keyed on things that change: the visitor id is per browser and resets with storage, `INTERNAL_IPS` breaks when your IP changes, and `INTERNAL_IP_HASHES` stops matching after a day. Each new browser, phone or cleared storage shows up as a new top visitor until you toggle it by hand. This is inferred from `packages/ingestion/src/handlers/ingest.ts` and the dashboard filters, not from querying production.

v2 uses three layers, strongest first:

1. **Ignore this browser.** Opening any tracked page with `?ra=ignore`, or pressing a button in the dashboard, sets a flag in that browser's storage. The SDK then sends nothing at all from that browser, on every project. `?ra=track` undoes it. This needs doing once per browser.
2. **Signed-in admin is marked automatically.** Your dashboard session cookie is scoped to `.remcostoeten.nl`, so it also reaches the ingest endpoint on that domain. When the API sees a valid admin session on an incoming event, it stores the event with `is_internal = true` and marks that visitor id internal for good. Every device you have signed in on excludes itself. This only covers sites under `remcostoeten.nl`; other domains rely on layer 1.
3. **Manual marking** stays as a fallback: `PATCH /v2/projects/:project/visitors/:visitor` with `{ isInternal: true }`.

Layer 1 drops events before they are sent. Layers 2 and 3 keep them with `is_internal = true`, so the dashboard can offer an "include my traffic" toggle. `INTERNAL_IP_HASHES` is removed.

## Web vitals accuracy

The current numbers are unreliable because of how they are measured and summarised, not because of the sites. Problems in `packages/sdk/src/observers/performance.ts` and the dashboard query:

| Metric | What 1.x does | Effect |
| --- | --- | --- |
| All | Sends once per full page load, on the first time the tab is hidden, with the path at that moment | In an SPA the landing page's vitals are credited to whichever page you left from |
| All | Dashboard shows `AVG` | One slow outlier skews the number; the standard is the 75th percentile |
| LCP | Keeps the last entry, including pages opened in a background tab and back/forward cache restores | Background tabs report LCPs of many seconds |
| INP | Duration of the last event over the browser's threshold, including events that are not interactions | Not INP; it should be the worst interaction, near the 98th percentile |
| CLS | Sums every layout shift for the whole visit | Grows with visit length; the standard takes the worst 5-second session window |
| TTFB | `responseStart - requestStart` | Leaves out redirects, DNS, TCP and TLS, so it reads low |
| All | Bot and headless traffic is included; the shared `publicTraffic` filter does not exclude bots | Lighthouse and crawler runs mix into real-user numbers |

v2 fix: measurement moves into the `speedInsights` plugin below, which wraps Google's `web-vitals` package. That package already handles background tabs, back/forward cache, prerendering, CLS session windows and INP selection. 1.x is frozen, so the fix arrives with 2.0.

## internalSpeed insights

A module that works like Vercel Speed Insights: real-user Core Web Vitals per route and device, a 0 to 100 Real Experience Score, and the page elements behind slow numbers. It is a plugin on the client, a table and rollup in storage, and four read routes. Vercel's own approach, which this copies, is summarised under Lessons from Vercel.

**Collection** (`speedInsights({ sampleRate })` plugin):

- Lazy-loads the `web-vitals` attribution build so pages that do not use the plugin pay nothing, and records LCP, INP, CLS, FCP and TTFB.
- Measures hard navigations only, as Vercel does; soft navigations are not reliably measurable in browsers yet.
- `sampleRate` from 0 to 1, decided once per page load and stored with each row so counts can be re-weighted.
- Each metric carries the web-vitals `id` (for dedupe when INP or CLS updates), value rounded (CLS to 4 decimals, others to whole milliseconds), rating, route and path, navigation type, device class, connection type, and one attribution CSS selector: the LCP element, the INP target or the largest CLS shift source.
- Buffered and sent on tab hide, pagehide, route change or at 6 metrics, in one request.

**Storage**: a `web_vitals` table (project, time, metric, value, rating, route, path, device, country, connection, selector, sample rate, navigation type, session, release), 30 days raw. A daily `rollup_vitals` table with p50, p75, p90, p95, p99 and counts per project, day, route, device and metric, human traffic only.

**Score**, following Vercel's documented method:

| Metric | Good up to | Poor from | Weight in the score |
| --- | --- | --- | --- |
| LCP | 2.5 s | 4 s | 30% |
| INP | 200 ms | 500 ms | 30% |
| CLS | 0.1 | 0.25 | 25% |
| FCP | 1.8 s | 3 s | 15% |
| TTFB | 0.8 s | 1.8 s | shown, not scored |

Each metric's p75 is scored from 0 to 100 on a log-normal curve, the way Lighthouse does it. The Real Experience Score is the weighted mean; 90 to 100 is good, 50 to 89 needs improvement, under 50 is poor. Vercel does not publish its exact curve parameters, so phase 4 checks the scores against a site measured in both tools.

**Reads**, all at the `project` access level so public projects show speed publicly:

| Route | Returns |
| --- | --- |
| `GET /v2/projects/:project/speed` | Score, and per metric the chosen percentile, rating and good, needs-improvement and poor shares |
| `GET /v2/projects/:project/speed/timeseries?metric=lcp` | The metric's percentile per day |
| `GET /v2/projects/:project/speed/routes` | Every route with its score and metrics, worst first |
| `GET /v2/projects/:project/speed/elements?metric=lcp` | The selectors most often behind slow values |

All four take `device=mobile|desktop|all`, `percentile=75|90|95|99` (default 75) and the usual date range and filters, and hide values under 20 samples. The dashboard view mirrors Vercel's: a score ring, one card per metric with its distribution bar, a route table and a device toggle.

**What keeps the numbers trustworthy.** Each step guards against one way the current numbers go wrong:

| Step | Guard |
| --- | --- |
| Measure | Google's `web-vitals` library, not hand-written observers; it already handles background tabs, back/forward cache restores, prerendering, CLS session windows and INP selection. The page's path is captured when the page loads, not when the tab closes |
| Send | Each value carries the library's metric `id`. INP and CLS can report again as they worsen, so ingest keeps only the latest value per `id` instead of counting each report |
| Validate | Ingest rejects impossible values (negative numbers, CLS above 10, any timing above 120 s) and values from pages that were hidden from the start |
| Filter | Bots, headless browsers, internal traffic, localhost and previews never reach the speed tables; `traffic=human` is the only mode for speed |
| Aggregate | Percentiles, never averages, computed in the daily rollup with `percentile_cont`; no value is shown under 20 samples, and each card says how many samples it has |
| Test | Playwright fixture pages with known behaviour (an image that paints after 2 s, a button whose handler blocks for 300 ms, a banner that shifts the layout by a known amount) must produce values within 10% of the expected ones, in CI |
| Cross-check | A weekly job compares each project's p75 with Google's Chrome UX Report for the same origin, where Google has data, and flags a gap over 25% in `/admin/metrics` |

Built so far (E4.3): ingest writes human `web_vital` events to `web_vitals`, keeping the latest value per metric id and dropping impossible values; the score and the four read routes read the raw table; `POST /v2/admin/jobs/rollup` fills `rollup_vitals` and trims raw rows past 30 days. The `/vitals/<run>` Playwright fixture page shifts the layout at 300 ms, paints a late hero at 800 ms and has a button that blocks for 250 ms; the stored LCP, INP and CLS must land within 10% of what the browser's own observers measured on that page. `POST /v2/admin/jobs/crux`, run weekly with `CRUX_API_KEY`, compares each project's 28-day p75 of LCP, INP, CLS and FCP with the Chrome UX Report for its origin and flags a gap over 25% in `/v2/admin/metrics`. The dashboard speed view follows.

The fixture tests and the Chrome UX Report comparison are what make this sturdy over time: a regression in collection shows up as a failed test or a flagged gap, not as numbers that quietly look strange.

## Ad blockers and Brave

Send events to a path on the site's own domain and forward them server-side. Blockers stop almost nothing they cannot see as third-party tracking.

How blocking works: Brave Shields, uBlock Origin and Firefox strict tracking protection match request URLs against filter lists such as EasyPrivacy. They block known tracker domains, third-party hosts, and URL paths with words like `analytics`, `track`, `collect` or `pixel`. Brave and uBlock also follow CNAME records, so a `stats.example.com` subdomain pointing at a known tracker gets caught. The SDK is bundled from npm rather than loaded as a script tag, so the code itself is already hard to block; the request is the weak spot. Today every site sends events straight to `ingestion.remcostoeten.nl`, which is third-party on every site except `remcostoeten.nl`. How often that gets blocked is not measured yet.

v2 approach:

1. **Same-origin proxy.** The SDK sends to a relative path such as `/_ra`, configurable per site. A small handler in the site forwards the batch to `POST /v2/events`. The browser sees a first-party request to a neutral path, which filter lists have no rule for. No CNAME is involved, so there is nothing to uncloak.
2. **Proxy helpers in the SDK.** `@remcostoeten/analytics/proxy` exports a fetch-standard handler: `export const POST = createProxy({ secret })` in a Next route, and the same function for Hono, Elysia, Astro or a Cloudflare Worker. It adds the project's secret key and the visitor's IP and user agent as forwarded headers.
3. **Trusted forwarding in the API.** The API only trusts forwarded IP and user-agent headers on requests that carry a valid project secret key. Without that, geo and the IP hash would describe the proxy's server instead of the visitor.
4. **Neutral names.** Default path `/_ra`, no `analytics`, `track` or `collect` in any URL, header or query parameter the browser sends.
5. **Measure it.** An optional server-side counter in the proxy helper counts HTML page requests. Comparing that with client pageviews gives an estimated blocked share per project, shown in the dashboard instead of guessed.

What stays the same: opt-out, Do Not Track and consent are still checked in the browser before anything is sent. The proxy makes delivery reliable for visitors who have not opted out; it does not track anyone who has.

Brave also randomises some fingerprinting values, such as screen size and hardware details. The bot scoring must treat those as normal browser noise, and the phase 3 test run includes Brave with standard and aggressive Shields, uBlock Origin with EasyPrivacy, Firefox strict mode and Safari.

## Errors

Three layers share one error catalog: how the engine handles errors internally, how the API and SDK show them to developers, and how the product captures and groups errors from your sites the way Sentry does.

### Inside the engine

Errors are values, not exceptions. Every stage, signal, enricher and adapter returns a `Result`, and only the host turns a failed result into an HTTP response.

```ts
type Result<Value> = { ok: true; value: Value } | { ok: false; error: EngineError };

type EngineError = {
  code: ErrorCode;
  message: string;
  details?: ErrorDetails;
  cause?: Error;
};
```

- **One catalog** in `contract/errors.ts`. Each code declares its HTTP status, whether a client may retry, a log level and a one-line docs text. `ErrorCode` is the literal union of the catalog keys, so a code that is not in the catalog does not compile.
- **A thrown exception means a bug.** The host wraps the pipeline once, turns any throw into `INTERNAL`, and logs it with its stack. Modules never catch and rethrow.
- **A `Logger` port** with `debug`, `info`, `warn` and `error`, each taking a message and typed fields. The API adapter writes one JSON line per entry, which Vercel's log view can filter. Every entry carries the request id, project and stage.
- **Request ids**: the API reads or generates `x-request-id`, returns it on every response, and includes it in every log line and error body, so one id links a user report to its logs.
- **The API monitors itself**: its own unexpected errors are captured as issues in an internal `analytics` project, using the same pipeline as your sites.

### What developers see

API errors always use the same envelope, now with a request id and a docs link:

```json
{
  "error": {
    "code": "FORBIDDEN_ORIGIN",
    "message": "Origin https://example.com is not allowed for this project",
    "details": { "origin": "https://example.com", "project": "remcostoeten.nl" },
    "requestId": "req_01J8ZB4K2M",
    "docs": "https://api.remcostoeten.nl/v2/openapi#errors/FORBIDDEN_ORIGIN"
  }
}
```

The SDK never throws into the host app and never breaks a page. Instead:

| Situation | Production | `debug: true` |
| --- | --- | --- |
| Misconfiguration: missing key, bad endpoint | One `console.warn` per code, then silent | Same, plus the fix |
| Event dropped for consent, opt-out, Do Not Track or ignore-self | Silent | `console.info` with the reason |
| Server rejected events (4xx or `rejected[]`) | Silent | `console.warn` with the code, the field and the event |
| Network failure, retrying | Silent | `console.debug` with the attempt number |
| Each event sent | Silent | A collapsed `console.groupCollapsed("[ra] pageview /blog")` with the payload |

- All SDK console output starts with `[ra]` and a code such as `RA_CONSENT_MISSING` or `RA_INGEST_REJECTED`, from the same catalog, so it is easy to filter in devtools.
- `client.on("error", handler)` gives apps the same errors as values, for their own logging.
- `client.status()` returns queue size, consent state, endpoint, last error and last successful send, useful when debugging a site.
- Debug mode can be switched on without a deploy by adding `?ra=debug` to a URL, which sets a flag in that browser.
- The server SDK returns `{ ok, error }` from `track` and `flush` instead of throwing.

### Error tracking as a feature

The `errors` plugin and the server SDK's `captureError` send errors as ordinary events, and the engine groups them into issues.

1. **Capture.** Browser: uncaught errors, unhandled rejections, and React boundary errors. Server: `captureError(error, { request })` in route handlers and jobs. Each carries message, type, stack, release, environment, URL and the last 20 breadcrumbs (navigations, clicks, `[ra]` events, failed fetches).
2. **Scrub.** An enricher removes emails, tokens and long numbers from messages and URLs, and drops query strings except UTM tags. Nothing from form fields is captured.
3. **Fingerprint.** Type plus normalised message plus the top in-app stack frame, with line numbers, ids and hashes removed. The same bug on a new deploy groups into the same issue.
4. **Group.** An `issues` row per project and fingerprint with first seen, last seen, count, affected visitors, first and last release, and a status of `open`, `resolved` or `ignored`. A resolved issue that happens again reopens as a regression.
5. **Source maps**, in a later phase: a build step uploads maps for a release with the project secret, and the API shows original file and line in stacks. Until then, stacks show bundled locations.
6. **Sampling.** After 100 occurrences of one issue in a minute, only a count is stored, so an error loop cannot flood the database.
7. **Notify.** An email or webhook on a new issue or a regression, sent by the cron job.

New routes, detailed in the API reference tab:

| Method | Path | Access |
| --- | --- | --- |
| GET | `/v2/projects/:project/issues` | detail |
| GET | `/v2/projects/:project/issues/:issue` | detail |
| GET | `/v2/projects/:project/issues/:issue/events` | detail |
| PATCH | `/v2/projects/:project/issues/:issue` | admin |
| POST | `/v2/projects/:project/releases/:release/sourcemaps` | project secret key, later phase |

Storage: migration 0016 adds `issues` with a unique `(project_id, fingerprint)`; 0017 adds `events.issue_id`; 0026 adds `is_regression` and the per-minute counter behind sampling; 0027 adds `error_rules` and `issues.muted_until`, `mute_remaining`, `regressed_at` and `alerted_at`.

Built so far (E4.4): the `error` stage scrubs and fingerprints error events (Chrome, Edge, Firefox and Safari stacks), the store groups newly stored events into issues after insert so a retried batch never counts twice, a resolved issue reopens as a regression, and past 100 of one issue in a minute only the count is kept. Issue ids read `iss_<id>`. The issue routes, `/v2/issues`, `filter[issue]` and `/error-rules` are live: an ignore pattern drops matching errors before grouping, and a mute ignores an issue until a date or a count of further occurrences, then reopens it. `POST /v2/admin/jobs/alerts` posts new issues and regressions to `ALERT_WEBHOOK_URL`, signed with `ALERT_WEBHOOK_SECRET`; email alerts wait on choosing a provider. With `INTERNAL_PROJECT_SECRET` set to a project's secret key, the API records its own `INTERNAL` errors there. Errors keep the 30-day retention of other events; issue rows stay until deleted.

## Lessons from Vercel

Vercel's `@vercel/analytics` and `@vercel/speed-insights` are thin npm loaders for a remote collector script of about 2 KB gzip. Most of what they do fits this plan; these points change it.

| Vercel does | v2 takes from it |
| --- | --- |
| A `window.va` stub queues calls made before the script loads, then replays them | The client queues calls made before init or before consent, and replays them instead of dropping them |
| Sends `route` (`/blog/[slug]`) next to the full URL; each framework adapter computes it with `computeRoute(pathname, params)` or SvelteKit's `route.id` | A nullable `route` on events and rollups, a `computeRoute` helper in `./react`, and a Next adapter in `./next`. Reports group by route, so `/blog/*` pages add up |
| A `null` route means "router not ready", and the adapter turns off history patching once it supplies routes | The `pageviews` plugin steps aside when an adapter provides routes, so no double pageviews |
| `beforeSend(event) => event \| null` is the one redaction and drop hook, and debug mode logs the before and after | Same hook as the first plugin hook, with the diff in `[ra]` debug output |
| `mode` defaults from `NODE_ENV`; in development nothing is sent and payloads are logged instead | Same: development sends nothing unless an endpoint is set explicitly, instead of storing localhost rows and flagging them afterwards |
| Event names, keys and values capped at 255 characters, flat primitive values only; dev throws, production strips | Same limits in the SDK and the contract schema, plus at most 25 props per event; today `meta` is an unbounded record |
| Script and intake on same-origin paths, and in v2 a per-build random path so blocklists cannot target it | The proxy path is configurable per site; the default `/_ra` is a starting point, not a fixed address |
| Server `track` forwards the visitor's user agent and IP so the event joins the browser session, and uses `waitUntil` | `createServerAnalytics` accepts the request, forwards both, and uses `waitUntil` when available |
| Build-time config from one JSON env var read with literal `process.env.X` access | Same, which fixes the "env inlining is unreliable" gotcha in the current SDK |
| Vitals sent as a `text/plain` body with `keepalive`, one request per flush, with a client-side exit for `navigator.webdriver` and Headless user agents | Already in the plan; the bot exit becomes part of the `botSignals` plugin as a pre-filter, with server scoring as the backstop |
| One build entry per framework with framework packages external | The `./react`, `./next`, `./server`, `./proxy` and `./plugins` entries follow the same pattern |

Where v2 deliberately differs: Vercel identifies visitors by a server-side request hash that resets daily and keeps no visitor across days, while v2 keeps a localStorage visitor id so returning visitors and retention work. Vercel also sends each analytics event as its own request; v2 batches.

Sources: the [vercel/analytics](https://github.com/vercel/analytics) and [vercel/speed-insights](https://github.com/vercel/speed-insights) repositories, the collector scripts they load, and Vercel's docs on [speed metrics](https://vercel.com/docs/speed-insights/metrics), [custom events](https://vercel.com/docs/analytics/custom-events) and [analytics privacy](https://vercel.com/docs/analytics/privacy-policy).

## Code rules and tooling

The generic-program-rules skill governs all v2 code; where the Elysia skill disagrees, the rules and `AGENTS.md` win.

| Source | What it means for v2 |
| --- | --- |
| generic-program-rules | `function` declarations, arrow callbacks, `type` only, no classes, no comments beyond the three allowed kinds, JSDoc with `@name`, `@description`, `@example` on every exported SDK and contract function |
| generic-program-rules | Semantic types in one `semantic.ts`: `ProjectID`, `VisitorID`, `SessionID`, `EventID`, `Timestamp`. Finite sets as literal unions (`BotReason`, `Dimension`, `ErrorCode`). `Nullable<T>` for present-but-empty |
| generic-program-rules | Oxlint with the anti-slop rule set and `func-style: declaration`, oxfmt. No object-bag parameters inside the codebase; the public factory's single options object is the documented exception |
| elysiajs skill | Feature modules with route, service and model files; `Elysia.models()` with a namespace prefix; `status()` for errors; method chaining for types. Its "prefer class for services" advice is overridden by the no-classes rule |
| api-and-interface-design skill | Contract first, one error shape, validation only at the boundary, additive changes only after 2.0, idempotency by a unique constraint rather than check-then-insert |
| api-design skill | Generate the OpenAPI document from Elysia's schema plugin and run the skill's agent-readiness and OWASP review on it before phase 4 ships |
| auth-review skill | Run it on the v2 API before the dashboard switches over, focused on the public, project and detail access levels, private projects returning 404, and the session cookie |

Budgets enforced in CI, not just written down: SDK core 4.5 KB and each plugin 0.6 KB min+gzip via a size check script, and ingest p95 under 100 ms in a load test run before each ingest release.

## Linting and formatting

The repo runs Oxlint and oxfmt in CI, but almost none of the house rules are enforced today. v2 fixes that before any new code lands.

| Today | Evidence |
| --- | --- |
| Oxlint pinned at 0.10.0; the current release is 1.85.0 | root `package.json` catalog, `npm view oxlint version` |
| No `.oxlintrc.json`, so only Oxlint's default correctness rules run; `func-style`, the anti-slop rules and type rules are not checked | repo root |
| oxfmt pinned at 0.45.0, current is 0.70.0, with no config file; style comes from `.editorconfig` (tabs, width 4) | root `package.json`, `.editorconfig` |
| No pre-commit hook; problems surface only in CI | `.github/workflows/ci.yml` |

v2 adopts the [Skriuw lint rulebook](https://claude.ai/artifact/JMt59NUXkw7kfSRLHxWW1x) (Oxlint 1.85.0, oxfmt 0.70.0) as the baseline, so both repos lint the same way. Changes for this repo:

- **Copied as is**: the `plugins` list, `categories.correctness: error`, every rule in its `rules` block (`func-style` with `allowTypeAnnotation`, `prefer-arrow-callback` with `allowNamedFunctions`, `no-empty`, `no-var`, `prefer-const`, `eqeqeq: smart`, the `typescript/*`, `import/no-duplicates` and `react/*` rules), the seven anti-slop rules, and the React and jsx-a11y rules it turns off.
- **House plugin**: Skriuw's `skriuw` plugin becomes `tools/oxlint/house` here with the same two rules, `house/no-silent-catch` and `house/local-type-name` on `*.tsx`. `no-silent-catch` points at `noop()`, which moves from `packages/sdk/src/utilities/noop.ts` into a shared package so the SDK, API and dashboard use one copy.
- **Overrides**: keep the tests override (`**/__tests__/**`, `*.test.*`, `*.spec.*`); drop the Storybook and `apps/workspace` overrides, which have no counterpart here.
- **Ignore patterns**: `**/node_modules/**`, `**/dist/**`, `**/.next/**`, `**/*.d.ts`, `tools/oxlint/anti-slop/**`, and `packages/ingestion/src/db/migrations/**`.
- **Added on top**: `import/no-cycle`, and `no-floating-promises` through Oxlint's type-aware mode if 1.85.0 supports it. A dropped promise in the server SDK's `flush()` loses events silently.
- **oxfmt**: Skriuw's `.oxfmtrc.json` with `printWidth: 100` and the same ignore list shape. This repo currently uses tabs from `.editorconfig`; matching Skriuw's default indentation reformats every file once. I recommend doing that in the same phase 0 PR so both repos read the same.
- **Scripts**, renamed to match Skriuw: `lint`, `lint:fix`, `format`, `format:check`, and a `check` script that runs typecheck, lint, format check and tests.
- **Pre-commit** with lefthook: `format` and `lint` on staged files only.
- **CI** keeps the existing job and adds the SDK size check and the OpenAPI diff.

Order: bump both tools and add the configs in their own PR, fix what the stricter rules flag in the existing code, then start v2 on a clean baseline. Phase 0 includes this.

**Underscore prefixes.** No `_`-prefixed functions or variables to mean private. A function is private by not being exported, and a package is private by not being in its `exports` map; code that must be shared inside a package but not published lives in an `internal/` folder that the export map leaves out. The only allowed `_` is an intentionally unused parameter or destructured value, such as `(_, index) =>`, set as `no-unused-vars` `argsIgnorePattern: "^_"`. The dashboard's unused `_geist` and `_geistMono` font consts in `apps/dashboard/src/app/layout.tsx` get removed or used.

## Build process

Only the two published packages get a build step; internal packages are imported from source, which removes today's "rebuild packages or apps see stale code" problem.

| Target | Tool | Output |
| --- | --- | --- |
| `packages/sdk` | tsdown (0.23.0, the Rolldown-based successor to tsup 8.5.1 that the repo uses today) | ESM only, one file per entry (`.`, `./plugins`, `./react`, `./next`, `./server`, `./proxy`), `.d.ts` per entry, minified, source maps; `"use client"` banner on `./react` and `./next` |
| `packages/contract` | tsdown | ESM and types; published so other projects can type against the API |
| `packages/shared`, `packages/engine` | none | `exports` point at `src/*.ts`; Bun, the API bundler and TypeScript read them directly |
| `apps/api` | `bun build` into Vercel's Build Output API, the approach `apps/ingestion/scripts/build.ts` already uses | One bundled function plus the two MMDB files; the Elysia spike decides the Bun or Node runtime |
| `apps/dashboard` | `next build` | Unchanged |

- **ESM only for SDK 2.0.** Every current bundler and Node 22+ load ESM, and dropping the CJS copy halves the package. It is a major version anyway.
- **Task order**: `bun run --filter` already runs workspace scripts in dependency order. Turborepo is only worth adding if CI time becomes a problem, for its caching.
- **Size check**: `scripts/size-check.ts` gzips each SDK entry after build and fails CI above the budgets: core 4.5 KB, `./react` 1.5 KB, `./next` 1 KB, each plugin 0.6 KB, `speedInsights` 2.5 KB, `errors` 0.7 KB. Each plugin is bundled alone, the way an app that imports only that plugin pays for it.
- **Releases**: Changesets. Each PR that changes a published package adds a changeset; merging to `master` opens a version PR; merging that publishes to npm from CI with provenance. This replaces today's manual `npm publish`.
- **Migrations**: `scripts/migrate.ts` applies the numbered SQL files in order and records them in a `schema_migrations` table. It is run by hand against Neon, never on deploy, which keeps the repo rule of applying migrations manually while removing the copy-paste step.
- **Deploys**: Vercel builds `apps/api` and `apps/dashboard` per PR as previews and on `master` as production. The legacy `apps/ingestion` project stays as it is until phase 5.

## Branching

**Update, Sep 27:** the `v2` integration branch is gone. v1 was moved into `v1/` and merged into `master` ([PR #24](https://github.com/remcostoeten/analytics/pull/24)), so v1 and v2 now live side by side on one trunk.

1. `master` is the trunk. Every epic branches from `master` as `feature/*`, `fix/*` or `chore/*` and squash-merges back with green checks.
2. v1 keeps serving production from `master`: the Vercel projects `ingestion` and `analytics` build from `v1/apps/ingestion` and `v1/apps/dashboard`. Their ignored build step should skip builds when nothing under `v1/` changed.
3. v2 code never imports from `v1/`, so v2 epics cannot break production.
4. `apps/api` and the v2 `apps/dashboard` get their own Vercel projects on `master`.
5. SDK prereleases publish under the npm `next` tag (`2.0.0-next.0` and up), so a plain install keeps giving 1.x. 2.0.0 publishes once phase 4's gate passes.
6. When v2 replaces v1 in production, `v1/` is deleted in one pull request.

## Test process

Every layer runs on `bun test` except browser end-to-end tests, which use Playwright, already installed in the dashboard. The engine's ports make most tests fast and database-free.

| Layer | What | How | Runs |
| --- | --- | --- | --- |
| Unit | Each signal, enricher, dimension, stage, SDK plugin and transport | Plain inputs through the module, table-driven; memory adapters and a fixed `Clock` and `Hasher` for determinism; happy-dom for SDK code that touches the DOM | Every push |
| Contract | SDK payloads against API schemas | Shared fixtures in `packages/contract/fixtures`: the SDK tests assert it produces them, the API tests assert it accepts them, so the two cannot drift | Every push |
| Integration | Engine against a real database; every API route and access level | PGlite running the same migration files as Neon, instead of today's hand-copied DDL in `tests/setup.ts`; routes called in-process with `app.handle(new Request(...))` through the Eden client | Every push |
| End to end | SDK in a real browser against the local API, and the dashboard | Playwright with Chromium: fixture pages load the built SDK, then assert stored events for pageviews, SPA navigation, send on tab hide, consent, ignore-self, the proxy transport and web vitals. Dashboard: public and private projects, signed in and out | Every PR |
| Bot detection | Scoring against real automation | A headless Playwright run must score 50 or more; a headed run with scripted input must score under 50 | Every PR |
| Parity | Old and new behaving the same | Phase 2: the same fixture events through `/e` and `/v2/events` give equal rows. Phase 4: each migrated dashboard view matches the old query | At those gates |
| Load | Ingest latency | k6 against a preview deploy; fails above 100 ms p95 | Before each ingest release, manual trigger |
| Manual | Blockers and browsers | Brave standard and aggressive, uBlock Origin, Firefox strict, Safari | Before each SDK release |

- **No module mocking**, per the anti-slop rule. Tests swap behaviour by passing memory adapters through ports, which the engine design exists to allow.
- **Coverage**: `bun test --coverage` with a floor of 90% lines for `engine` and `contract` and 85% for the SDK core, checked in CI. Plugins and routes are covered by the table-driven and integration layers rather than a separate number.
- **Placement**: unit and integration tests in `__tests__/` next to the code; end-to-end tests in a top-level `e2e/` workspace, since they span SDK, API and dashboard.
- **CI jobs**: one fast job on every push (lint, format, typecheck, unit, contract, integration, size check, OpenAPI diff, boundaries) and one Playwright job on pull requests. Load tests run from a manual workflow.

## Phases

The SDK is phase 3 because it needs a contract to type against and an endpoint to send to; phases 0 to 2 build exactly those and nothing more.

&#91;embedded content: roadmap · 6 phases, 5 gates\]

Each gate is a check that must pass before the next phase starts. Phase 4 can start in parallel with phase 3 once phase 2's gate passes. The phases are split into 20 epics, each with a ready-to-paste agent prompt, in Epics and prompts.

**Note:** analytics was removed from [remcostoeten/remcostoeten.nl](https://github.com/remcostoeten/remcostoeten.nl) together with the analytics manager, so that site sends no events right now. Reinstall it there, on SDK 2.0 once phase 3 ships or on 1.x in the meantime.
