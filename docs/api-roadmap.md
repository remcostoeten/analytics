# API roadmap

This roadmap is a proposal based on the static inventory in [api-inventory.md](api-inventory.md). It does not approve breaking changes, migrate Hono to Elysia, or alter current ingestion behavior.

## Decision table

| Current operation/surface | Proposal | Reason | Known consumers | Compatibility impact |
| --- | --- | --- | --- | --- |
| `POST /e` | Keep as canonical browser ingest endpoint | Published SDK browser/server target it. | Browser SDK, server SDK | None. |
| `POST /ingest` | Retire after telemetry/release audit; keep alias during deprecation | Duplicate route has no current repo caller; tests mount it. | Possible external historical clients | Potential breaking change; announce and preserve alias for a defined window. |
| `POST /e/batch` | Keep as canonical batch ingest endpoint | Offline queue calls it. | Browser SDK offline queue | None. |
| `POST /ingest/batch` | Retire after consumer audit; keep alias during deprecation | Duplicate with no current caller. | Possible external historical clients | Potential breaking change. |
| `GET /health` | Keep | Standard public health probe, stable small shape. | Infrastructure unknown | Additive fields only. |
| `GET /` | Investigate/replace with explicit public service metadata or retire | HTML includes operational status and makes a registry fetch from each browser. | Human browser only in repo | Public behavior may be bookmarked. |
| `GET /metrics` | Keep private; replace process metrics with durable observability later | Operational diagnostics are useful, but current figures are instance-local. | Admin operators unknown | Preserve endpoint or version an observability replacement. |
| `GET /events` SSE | Investigate | Root page tries it without credentials; data is process-local and is not dashboard realtime. | Root HTML only | Can retire with root page, or define durable authenticated stream. |
| `GET /admin/stats` | Keep private, move under a clearly defined operations API only after contract | Useful retention diagnostics; response leaks internal state. | Admin/ops unknown | Preserve auth and response until replacement is available. |
| `GET/POST /admin/cleanup` | Keep scheduled GET temporarily; consolidate operational trigger later | Cron uses GET; POST is semantically safer for humans. | Vercel cron, admins | GET removal requires cron/deployment migration. |
| `GET/POST /admin/rollup` | Keep scheduled GET temporarily; consolidate operational trigger later | Cron uses GET; query `days` behavior already observable. | Vercel cron, admins | Preserve clamping/default 8 unless versioned. |
| Dashboard `GET /api/analytics?metric=*` | Replace progressively with standalone typed read endpoints | 50 unversioned selector contracts, optional auth and inconsistent validation/filtering. | Dashboard components; external use unproven | High internal compatibility risk; dual-run and adapt dashboard one selector at a time. |
| Dashboard `GET /api/analytics/visitor/:id` | Replace with project-scoped visitor resource | Current endpoint can read by ID/fingerprint across project scope. | Visitor page | New API needs explicit project scope and principal. |
| Dashboard `PATCH /api/analytics/visitor/:id` | Replace with project-scoped internal-traffic mutation | Current fingerprint update propagates across projects. | `VisitorInternalToggle` | Requires a policy decision: visitor identity global vs per project. |
| Dashboard `GET /api/posthog?metric=*` | Investigate separately; do not fold into core analytics API by default | External-provider proxy has separate auth/config/failure semantics. | PostHog view | Could remain dashboard-internal. |
| Dashboard OAuth routes | Keep while dashboard remains; investigate auth as a read-API boundary | They gate UI opportunistically, not a reusable authorization model. | Dashboard header/proxy | Production fail-closed decision required. |
| `skriuw-*` selectors | Investigate and likely isolate/retire | Product-specific names and default project make them unsuitable generic API surface. | Unknown outside repository | Do not remove until owner/consumer confirms. |
| Browser/root SDK exports | Keep source-compatible; tighten docs/types additively | Published API and indirect root re-export surface. | External npm users, dashboard none | Any rename/removal is semver-major. |
| Browser deep/internal exports | Keep unsupported; do not codify accidentally | Export map does not support them. | None proven | No contract obligation unless npm artifact says otherwise. |
| Server SDK `trackServer*` | Keep | Explicit supported package subpath and tests. | External npm users | Preserve request payload and result fields. |

## Compatibility risks

1. `POST /e` and `/e/batch` are the SDK transport contract. Changing path, response handling, bearer behavior, event field names, or offline batch envelope will break published clients.
2. `/ingest` aliases have no in-repo runtime caller but may be referenced by previously published docs/releases. Verify npm tarballs and telemetry before deprecation.
3. The browser SDK is intentionally open-ended on event `type` and `meta`; narrowing either is a breaking behavioral change. Dashboard calculations rely on literal `meta.eventName` values such as `web-vitals`, `scroll`, `time-on-page`, `transaction`, and `site_search`.
4. Browser identity and privacy storage keys are observable client behavior. Changing `__analytics_*` keys without migration resets identity, session, opt-out, consent effects, or offline events.
5. Dashboard selector consumers are mostly internal, but selector response shapes are not formally private. Treat every selector as potentially depended on until a code search, access log review, and release note policy says otherwise.
6. Existing global admin/ingest secrets do not carry project identity. A project-scoped read API cannot safely infer tenant policy from these secrets alone.

## Ordered milestones

### 0. Confirm the contract boundary

- Confirm whether project IDs are isolation/tenant boundaries or merely labels under one trusted owner.
- Inventory real deployment policy: OAuth variables, proxy rules, Cloudflare settings, cron authentication, and whether the fallback database path is reachable.
- Inspect the npm tarballs for `@spoar/sdk@1.7.1` and relevant ingestion releases; compare export maps and generated declarations to this checkout.
- Establish a consumer registry for SDK versions, `/ingest` aliases, the dashboard URL/API, and `skriuw-*` selectors.

Exit condition: proposed scopes and compatibility promises are written down; no endpoint changes yet.

### 1. Stabilize and test existing contracts

- Add contract tests for all ingestion success/error/auth/admin/metrics/SSE operations, including aliases and batch semantics.
- Add route tests for dashboard auth-required, auth-disabled, selector validation, visitor project scope, mutation body validation, and PostHog error mapping.
- Declare canonical metric definitions and filters in shared test fixtures: visitor, session, clean traffic, time-on-page, scroll, bot filtering, and rollup parity.
- Decide one schedule owner for cleanup before moving operations.

Exit condition: the legacy system has tests sufficient to prove it remains unchanged while a read API is introduced.

### 2. Define the standalone read contract without implementation

- Write typed input/output schemas and a compact resource taxonomy. Start with high-value, generic resources: projects, overview, timeseries, pages/referrers, audience/geo, visitors, and visitor session trail.
- Use explicit project scope in every resource path/query and a single authenticated principal model.
- Define standard error envelopes, pagination/cursor behavior, allowed filters, query cost limits, and cache semantics.
- Keep product-specific and PostHog data outside the first generic contract until their ownership is decided.

Exit condition: an API contract review approves additive version-1 resources and compatibility bridge requirements.

### 3. Build read API alongside unchanged ingestion

Yes: ingestion can stay running unchanged while a standalone read API is built. Both consume the same existing Postgres schema; the read service needs only read credentials and must not reuse ingestion admin credentials for browser clients. The practical prerequisites are contract tests, confirmed schema/migration state, read-only database access, and decisions on project principal/scope.

Implement the read service as a separate deployment/module with read-only database role where possible. Start with a shadow endpoint for overview/projects, compare outputs against existing dashboard queries, then adapt one dashboard selector at a time. Do not use the current dashboard route as the public façade during transition.

Exit condition: selected dashboard reads use the standalone API with parity tests; ingestion paths and SDK transport remain unchanged.

### 4. Migrate dashboard and retire legacy read selectors

- Move generic dashboard requests to the standalone API behind a compatibility adapter.
- Add deprecation telemetry/headers and documentation for legacy selector usage.
- Retire selectors only after an evidence-backed consumer review; isolate or remove `skriuw-*` after owner confirmation.
- Correct visitor routes to require project scope and mutation authorization before exposing equivalent public endpoints.

Exit condition: the dashboard has no direct database API routes for migrated resources, and old routes have a dated removal plan.

### 5. Simplify ingestion only after read migration

- Decide aliases (`/ingest`, `/ingest/batch`) from actual usage.
- Separate operational endpoints from ingestion delivery and replace per-instance metrics/SSE if durable observability is needed.
- Resolve cleanup schedule duplication and document the retained Hono contract.

Exit condition: ingest remains a narrow write service with a tested contract and no dashboard-read responsibilities.

## Hono versus Elysia assessment

The inventory establishes requirements, not a framework preference:

| Requirement | Current evidence | Implication |
| --- | --- | --- |
| Preserve existing ingest paths/payloads/responses | Published SDK hard-codes `/e`; aliases may have external consumers | Framework must support a compatibility adapter; no migration is required to define the contract. |
| Strong request/response schemas | Current Hono validates only ingest, and selector responses are untyped | Both Hono and Elysia can meet this; schema/contract design is the work. |
| Vercel Node deployment | Current adapter converts Node requests to Hono Fetch API; deployment is Vercel | Validate any candidate's adapter, streaming, and bundle behavior before choosing. |
| SSE/operations | Current SSE is simple, admin-gated, process-local | Keep, replace, or retire based on observability requirements; framework is secondary. |
| Incremental migration | Ingestion must remain unchanged during standalone-read work | A separate read service can use either framework without touching Hono ingestion. |

Conclusion: no framework switch is justified by this audit alone. Keep Hono for unchanged ingestion. Evaluate Elysia only when the approved read contract needs its specific runtime/type ergonomics and a Vercel deployment/streaming/performance spike proves parity. An Elysia skill being installed is not evidence for migration.

## Unresolved decisions

- Are projects separate tenants with separate administrators, or a global owner namespace?
- Must dashboard reads fail closed in every production deployment?
- Which current dashboard route selectors, if any, have external consumers?
- Are raw UA, visitor traits, event metadata, and session trails permissible in the first read API, and under what retention/access policy?
- Should bot traffic be excluded consistently from all user-facing metrics, or only from rollups?
- Which definition should own duration/session counts: materialized `sessions` or event-derived calculations?
- Is browser consent required to persist across reloads, and is lack of persistence intentional?
- Is `DATABASE_URL` fallback success acceptable anywhere outside developer mode?

## Single best next task

Decide and document the project authorization model—specifically whether `projectId` is a tenant boundary and which principal may read/write each project—then add contract tests that prove that policy on the current dashboard visitor routes and ingestion writes. Every safe read-API design decision depends on it.
