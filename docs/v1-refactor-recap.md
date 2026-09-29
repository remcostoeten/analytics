# V1 refactor recap

This document records the current understanding before a v1 redesign. It is a planning document only: no endpoint, storage, SDK, framework, or folder migration has been approved by it.

Detailed evidence lives in [api-inventory.md](api-inventory.md). Proposed migration sequencing lives in [api-roadmap.md](api-roadmap.md).

## What we established

The repository currently has two distinct concerns:

1. A published npm SDK, `@remcostoeten/analytics`, which sends browser and server events to ingestion.
2. A self-hosted ingestion service that validates, enriches, deduplicates, and writes events to Neon Postgres. The dashboard currently reads that Postgres database directly through Next.js route handlers.

The SDK does not need to be rebuilt before a read API exists. Ingestion can remain running unchanged while a standalone read API and a v1 dashboard are built alongside it.

The SDK's observable transport contract is currently:

- Browser and server events post to `POST /e`.
- Browser offline events post to `POST /e/batch` in `{ events: [...] }` batches.
- `/ingest` and `/ingest/batch` are duplicate compatibility aliases with no current in-repository runtime caller.
- Browser tracking carries a generated event ID, visitor ID, session ID, page/location data, and metadata. Server tracking optionally sends `Authorization: Bearer <INGEST_SECRET>`.

The current checkout has 73 externally reachable HTTP operations:

- 13 ingestion, operational, scheduled, or SSE operations.
- 50 analytics read operations hidden behind `GET /api/analytics?metric=...`.
- 5 PostHog operations hidden behind `GET /api/posthog?metric=...`.
- 2 visitor detail/internal-traffic operations.
- 3 GitHub OAuth operations.

The current dashboard read surface is not a standalone API. It is a collection of direct database queries exposed through Next.js route handlers. Its 50 metric selectors have varying input validation, response shapes, filters, and performance characteristics.

## Why the inventory was necessary

Before redesigning, we needed to know which behaviors are actual contracts rather than old documentation or assumptions. The audit identified:

- Published SDK exports and the three supported package subpaths: root React entry, `./browser`, and `./server`.
- Every registered HTTP route and each dashboard selector as a separate observable operation.
- Existing SDK-to-ingestion and dashboard-to-database dependency paths.
- Existing definitions of events, pageviews, visitors, sessions, time on page, scroll depth, live activity, retention, and rollups.
- Known code consumers and available test coverage.
- The current authorization behavior and its gaps.

This prevents accidental breakage when creating v1. In particular, existing users cannot observe the internal framework choice; they observe package exports, payloads, HTTP behavior, browser storage, performance, and privacy behavior.

## Current risks to resolve before public v1 design

1. **Project scope is undefined.** The code supports `projectId`, but it does not establish whether that is a tenant boundary or merely a label used by one trusted owner. This decision controls every future authorization and storage choice.

2. **Dashboard reads are fail-open by configuration.** When dashboard GitHub OAuth environment variables are absent, its proxy allows anonymous access to dashboard data. Some routes expose visitor user agents, traits, event metadata, session trails, and location data.

3. **Visitor routes are not project-scoped.** Detail reads and the internal-traffic toggle select/update by visitor fingerprint without project filtering. This becomes a cross-project issue if projects are tenants.

4. **Metric definitions are not yet canonical.** Dashboard queries, rollups, and session/engagement calculations use different filters and formulas. For example, rollups exclude bots while the shared dashboard public-traffic filter does not.

5. **Operational metrics are per process.** Request count, SSE, dedupe metrics, and rate limits are in-memory; they cannot measure or control traffic globally on serverless instances.

6. **Legacy route behavior has incomplete route-level tests.** The ingestion pipeline and SDK are reasonably tested, but admin, metrics, SSE, batch, dashboard selector, visitor-route, PostHog-route, and OAuth-route coverage is incomplete.

## V1 direction currently proposed

The high-level direction is:

```text
Legacy ingestion stays stable
  ├─ accepts existing SDK writes to /e and /e/batch
  └─ continues to own validation, enrichment, dedupe, and Postgres writes

V1 is built alongside it
  ├─ new structured SDK packages
  ├─ standalone authenticated read API
  ├─ v1 frontend/dashboard consuming that API
  └─ explicit public contracts, tests, release process, and migration policy
```

The likely filesystem strategy is to create a top-level `v1/` boundary and place new frontend applications and most new packages there, while leaving existing ingestion in place until a later, explicitly approved migration. Do not mechanically move files until package boundaries, import paths, build ownership, and release ownership are decided.

ElysiaJS is a possible implementation choice for a new backend/read API. It does not need to be the organizing technology for a browser SDK: an SDK should be a small TypeScript library with browser/server transports and optional framework bindings. Consumers care about the published API and runtime behavior, not the framework used internally.

## Decisions still required

### 1. Principles and boundaries

- What is v1 trying to optimize for: single-owner self-hosted analytics, multi-project service, or both?
- Which code remains legacy and untouched?
- Which apps and packages are recreated or moved under `v1/`?
- Is the dashboard a product application, a reference implementation, or an optional consumer?
- What is explicitly out of scope for the first v1 release?

### 2. Identity, authorization, and project scope

- Is `projectId` a tenant identifier, an application label, or both?
- What principal can ingest for a project: allowed browser origin, server API key, project token, or an authenticated user?
- What principal can read a project? Can it read visitor-level data, and can it mutate internal-traffic status?
- What separate privileges do operations require: metrics, rollups, cleanup, stream access, retention configuration?
- Does v1 need OAuth, API keys, service tokens, teams/organizations, or a smaller single-admin model?

This is the first decision set because API paths, database keys, query filters, sessions, frontend navigation, and release scopes all depend on it.

### 3. Event model and metric correctness

- Define the canonical event envelope and typed event taxonomy.
- Decide which arbitrary/custom event capability remains and where schema validation lives.
- Define durable idempotency: event ID format, replay behavior, conflict response, retention window, and batch semantics.
- Define visitor and session semantics, including consent/storage failure and cross-project behavior.
- Define canonical filtering for bot, localhost, preview, and internal traffic.
- Define exact formulas for pageviews, visitors, sessions, bounce rate, time on page, scroll, engagement, revenue, live activity, retention, and rollups.
- Define treatment of late/offline events and rollup repair windows.

### 4. Read API contract

- Establish resource-oriented endpoints rather than a metric-selector multiplexer.
- Define versioning, request schemas, response DTOs, standard errors, pagination/cursors, filters, sorting, limits, and cache behavior.
- Decide the initial v1 resource set: projects, overview, timeseries, content, geo, visitors, session trails, and operations are likely separate contracts.
- Keep product-specific `skriuw-*` views and the PostHog proxy outside the generic v1 API until their owners and consumers are confirmed.
- Decide which visitor-level fields are safe to return and which require elevated scope.

### 5. Storage and query model

- Decide whether v1 starts against the current Postgres schema or introduces a new schema/database.
- Define write/read roles and use read-only credentials for the read API where possible.
- Decide raw-event retention, aggregation/rollup ownership, rollup dimensions, backfills, and late-event handling.
- Select indexes from actual v1 query shapes and establish query-cost and latency budgets.
- Decide whether sessions/visitors are materialized write models, read models derived from events, or both—and name one canonical source for each metric.

### 6. SDK architecture and public contract

- Decide the package layout: core types/event builder, browser transport, server transport, optional React bindings, and possibly separate integrations.
- Preserve or intentionally version public exports from `@remcostoeten/analytics`.
- Decide event APIs, privacy/consent semantics, storage keys/migration, SSR behavior, offline queue behavior, error handling, and debug behavior.
- Set SDK budgets: bundle size, browser work, network behavior, and opt-out guarantees.
- Decide whether this is a semver-major replacement, a new package name, or an additive release path.

### 7. Frontend consumption

- Decide whether the frontend uses server-side reads, client-side query hooks, or both.
- Define authenticated API client behavior, project selection, caching/revalidation, loading/error states, and pagination.
- Migrate one dashboard capability at a time behind adapters or feature flags; do not make the current direct-SQL route the long-term public façade.
- Establish API parity tests for each migrated capability.

### 8. Releasing and operations

- Define package names, workspace ownership, versioning/semver policy, changelogs, package publishing, and release automation.
- Decide compatibility/deprecation windows for `/ingest` aliases and existing SDK exports.
- Define observability that is durable across serverless instances, operational runbooks, rate-limit strategy, job schedule ownership, and load/performance tests.
- Confirm production deployment, secrets, gateway policy, Cloudflare/Vercel behavior, and npm artifact parity.

## Recommended decision order

1. V1 principles and project authorization model.
2. Canonical event, identity/session, dedupe, and metric definitions.
3. Read API resource contract and frontend consumption model.
4. Storage/query/rollup design and performance budgets.
5. SDK public contract, package boundaries, and release strategy.
6. Framework evaluation for the read API, based on the approved requirements.
7. Create `v1/` layout and make mechanical moves only after the boundary is approved.
8. Build the read API alongside unchanged ingestion, then migrate frontend consumers incrementally.

## Immediate next task

Write and approve the v1 identity, authorization, and project-scope specification. It should answer whether projects are tenants and explicitly define browser ingestion, server ingestion, read access, visitor-level access, and operational privileges. Until that is agreed, API output shape, storage partitioning, frontend consumption, and authentication mechanics are all premature.
