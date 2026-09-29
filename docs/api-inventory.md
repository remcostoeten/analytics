# API inventory

Audit date: 2026-09-27  
Checkout: `cleanup-prior-to-refactor` at `20145ea89ef1d05d139224bac7d0734ce6975db7`

## Scope and method

This is a static audit of the current checkout. It treats registered routes, package export maps, handlers, tests, and in-repository consumers as evidence. README files, removed code, old plans, and deployment state were not used to establish an operation's existence. Source citations use repository-relative `file:line` locations.

The checkout contains untracked `.agents/`, `.claude/skills/*`, and `skills-lock.json` files. They were preserved. The requested `auth-review` and `api-and-interface-design` skills informed the endpoint, authorization, compatibility, and contract analysis. No installed `technical-documentation` skill was available; this document uses the repository's Markdown conventions instead.

### Counts

| Surface | Operations | Notes |
| --- | ---: | --- |
| Ingestion HTTP | 13 | Includes aliases and separate GET/POST admin-job operations. |
| Dashboard analytics read API | 50 | One `GET /api/analytics` route expanded by `metric`. |
| Dashboard PostHog proxy | 5 | One `GET /api/posthog` route expanded by `metric`. |
| Dashboard visitor API | 2 | Detail read and internal-traffic mutation. |
| Dashboard auth | 3 | GitHub OAuth login, callback, and logout. |
| **External HTTP total** | **73** | Includes HTML root and SSE. |
| Published SDK package subpaths | 3 | `.`, `./browser`, `./server`. |

## System and dependency map

```text
Browser SDK ─POST /e────────────────────────────┐
Browser offline queue ─POST /e/batch────────────┤
Server SDK ─POST /e + Bearer INGEST_SECRET──────┤
                                                  v
                                  Hono ingestion service
                                  validate → auth → bot/rate/geo → dedupe
                                                  v
                                  Neon Postgres: events, sessions, visitors
                                                  v
                  Dashboard server SQL ── Next route selectors ── dashboard browser
                  PostHog HTTP API ────── Next route selectors ── dashboard browser
```

The dashboard has no deployed standalone read service in this checkout. It exposes Next route handlers over direct SQL. The browser SDK does not call dashboard routes. Evidence: `packages/sdk/src/api/track.ts:75-120`, `packages/sdk/src/utilities/offline-queue.ts:39-61`, `packages/sdk/src/server/index.ts:71-124`, `apps/dashboard/src/app/api/analytics/route.ts:3-405`.

## HTTP inventory

### Common ingestion contract

`POST /e` and `POST /ingest` are the same handler. `POST /e/batch` and `POST /ingest/batch` are the same handler. The short `/e` forms are the SDK's actual targets; `/ingest` forms have no in-repository caller and are compatibility aliases. Route registration: `packages/ingestion/src/app.ts:347-358`.

Single-event JSON is validated by the Zod schema at `packages/ingestion/src/utilities/validation.ts:11-38`:

| Field | Validation / default |
| --- | --- |
| `projectId` | required non-empty string |
| `type` | non-empty string; defaults to `pageview` |
| `path`, `referrer`, `origin`, `host`, `ua`, `lang`, `visitorId`, `sessionId`, `ts` | optional nullable strings, normalized to `null` |
| `eventId` | optional nullable UUID, normalized to `null` |
| `meta` | optional nullable record of unknown values, normalized to `null` |

Batch JSON is `{ events: EventPayload[] }`, with 1–100 individually schema-validated events (`packages/ingestion/src/handlers/batch.ts:24-26`). Neither schema has a strict-object setting, explicit body-size limit, field length limits, nor semantic constraints on event type/project ID/meta beyond the listed checks.

Request authorization is shared (`packages/ingestion/src/utilities/ingest-auth.ts:20-48`): a valid `Authorization: Bearer <INGEST_SECRET>` is accepted; otherwise an origin is accepted when it is in `ORIGIN_ALLOWLIST`, or any origin is accepted when that list is empty. A request without an origin is rejected with 403 when `INGEST_SECRET` exists. This authenticates a server caller by shared secret but does not establish a project principal; the caller controls `projectId`.

| Operation | Handler and request | Response / status | Auth, scope, data, callers, tests | Classification |
| --- | --- | --- | --- | --- |
| `GET /` | HTML handler, `packages/ingestion/src/app.ts:95-337`; no input | HTML status page; embeds build data and tries EventSource `/events` | No app auth. No DB. Browser page is an external consumer of `/events`; no route test found. | Public landing/status page |
| `GET /health` | `app.ts:339-345`; no input | `200 { ok, timestamp, requests }` | No auth. `requests` is process-local. No DB. No direct route test found. | Public health |
| `GET /metrics` | `handleMetrics`, `app.ts:347`; `handlers/metrics.ts:6-24` | `200 { ok, timestamp, metrics: { deduplication, rateLimit } }`; `401` or disabled `403` | `x-admin-secret` or Bearer must equal `ADMIN_SECRET`/`CRON_SECRET`; no project scope. Reads process-local counters/cache only. No direct handler test. | Operational private |
| `POST /e` | `handleIngest`, `app.ts:349`; pipeline `handlers/ingest.ts:448-525` | `200 { ok: true }` or `{ ok: true, deduped: true }`; `400`, `401`, `403`, `429`, `500` | Origin/Bearer gate; project comes from body. Writes events, then optional sessions/visitors. SDK browser and server call it. Tests: `tests/unit/ingest.test.ts`, `tests/integration/ingest.test.ts`, validation/auth/dedupe/geo/rate tests. | Public browser write / private server write |
| `POST /ingest` | Same `handleIngest`, `app.ts:351` | Same as `/e` | Same behavior/data. No current repository caller; `tests/*/ingest.test.ts` mount handler under this historical path. | Compatibility alias; scope unclear |
| `POST /e/batch` | `handleBatch`, `app.ts:350`; `handlers/batch.ts:28-120` | `200 { ok: true, processed, deduped, failed }`; `400`, `401`, `403`, `429`, `500` | Same auth at request level; rate limit once per batch; writes each event independently. Offline queue is caller. No batch-specific test found. | Public browser write / private server write |
| `POST /ingest/batch` | Same `handleBatch`, `app.ts:352` | Same as `/e/batch` | No current repository caller. | Compatibility alias; scope unclear |
| `GET /admin/stats` | `handleAdminStats`, `app.ts:354`; `handlers/admin.ts:95-120` | `200 { ok, timestamp, stats, policy }`; auth `401/403`; `500` includes message | Shared admin/cron secret; global data, no project scope. Reads events aggregation and retention policy (`data-retention.ts:88-131`). No direct route test. | Private operational |
| `POST /admin/cleanup` | `handleAdminCleanup`, `app.ts:355`; `handlers/admin.ts:38-61` | `200 { ok, message, timestamp }`; auth `401/403`; `500` | Shared admin/cron secret; global data. Deletes old events by retention policy. No direct route test. | Private operational mutation |
| `GET /admin/cleanup` | Same handler, `app.ts:356` | Same as POST | Vercel cron calls this path (`apps/ingestion/vercel.json:3-6`); same destructive side effect. | Private scheduled mutation |
| `POST /admin/rollup?days=1..90` | `handleAdminRollup`, `app.ts:357`; query parse/clamp `handlers/admin.ts:63-92` | `200 { ok, startDay, days, rowsWritten, timestamp }`; auth `401/403`; `500` | Shared admin/cron secret; global data. Deletes/rebuilds `rollup_daily` window. Tests `tests/integration/rollup.test.ts`. | Private operational mutation |
| `GET /admin/rollup?days=1..90` | Same handler, `app.ts:358` | Same as POST | Vercel cron uses no `days`, so default is 8. Same mutation. | Private scheduled mutation |
| `GET /events` | SSE closure, `app.ts:360-396`; no query | stream starts `data: { type: "connected", count }`; later request `{ type, count, method, path, timestamp }` | Shared admin/cron secret. Process-local only; request path/method, not project. Root page is caller and will fail without secret. No SSE test found. | Private operational stream |

`requireAdminAuth` returns 403 when both secrets are absent, and 401 when a secret is configured but missing/incorrect (`packages/ingestion/src/handlers/admin.ts:17-35`). Its static scope is all data, not a role/project model.

### Ingestion behavior trace

For a valid single event, the handler parses and validates the body, extracts/hashes the source IP, applies origin/Bearer authorization, bot detection and rate limiting, resolves geo/network data, then calls `processSingleEvent` (`packages/ingestion/src/handlers/ingest.ts:448-519`). That function resolves accepted client timestamp, creates a dedupe fingerprint, inserts an event with `onConflictDoNothing`, upserts session and visitor records, and propagates a visitor's sticky internal flag (`packages/ingestion/src/handlers/ingest.ts:275-419`).

The storage definitions are `events`, `visitors`, `sessions`, and `rollup_daily` in `packages/ingestion/src/db/schema.ts:15-148`. Event fingerprint is unique, visitor identity is unique per `(project_id, fingerprint)`, but session identity is globally unique by `session_id` (`schema.ts:92-95`, `119-122`).

Batch performs parse/validation/auth/rate/geo/network once, selects the first event with a client timezone, then processes events serially (`packages/ingestion/src/handlers/batch.ts:28-115`). Its `processed + deduped + failed` accounting is per event, but `metrics.recordRequest()` is per event only in batch and per request in single ingest (`batch.ts:73-112`, `ingest.ts:448-450`).

### Dashboard analytics read operations

All rows below are separate observable operations despite sharing `GET /api/analytics`. Common request parsing is at `apps/dashboard/src/app/api/analytics/route.ts:3-75`:

- `metric` defaults to `overview`, which has no switch case and returns `400 { error: "Unknown metric" }`.
- `projectId`, `origin`, `excludeVisitorId`, `from`/`to` or `timeRange` drive filter scope. `origin` is only length-bounded; it is later compared to event `host`.
- `from` and `to` must both parse and satisfy `from < to`; otherwise 400. Otherwise `timeRange` must be `24h|7d|30d|60d|90d|180d|all`; default `30d`.
- Any selector can return `503` when `DATABASE_URL` is absent, `500 { error: "Failed to fetch analytics" }` on a thrown query, or the selector's JSON body on 200. Selector-specific required parameters produce the stated 400s.
- The route does not authenticate or authorize. It relies on `apps/dashboard/src/proxy.ts:11-39`; that proxy deliberately serves all pages/API anonymously whenever GitHub OAuth environment variables are absent. Project filtering is optional and request-controlled.

Responses are the return values of the named query function, not versioned response schemas. All dashboard query functions read Neon directly; none call ingestion HTTP. `publicTraffic` generally excludes localhost, preview and internal traffic, but selector implementation varies (`apps/dashboard/src/lib/queries/filters.ts:47-72`).

| `metric` selector | Query implementation / data | Extra validation and known consumer | Intended exposure |
| --- | --- | --- | --- |
| `projects` | `getProjects`, events grouped by project; `queries/overview.ts:115-119` | none; sidebar and dashboard content | Private analytics read |
| `origins` | `getOrigins`, event hosts; `overview.ts:121-125` | none; sidebar | Private analytics read |
| `overview-extended` | `getOverviewExtended`, event counts/trends; `overview.ts:127-175` | common geo scope | Private analytics read |
| `pages` | `getTopPages`, events | common scope | Private analytics read |
| `referrers` | `getTopReferrers`, events | common scope | Private analytics read |
| `geo` | `getGeoDistribution`, events | common scope | Private analytics read |
| `geo-explorer` | `getGeoExplorer`, events | country `^[A-Za-z]{2}$`, region <=64; geo explorer | Private analytics read |
| `geo-visitors` | `getGeoVisitors`, events/visitors | country, region <=64, city <=64 | Private analytics read |
| `geo-signals` | `getGeoSignals`, events | common scope; geo signals panel | Private analytics read |
| `geo-detail` | `getGeoDetail`, events | common scope | Private analytics read |
| `city-points` | `getCityPoints`, events | country passed without route validation | Private analytics read |
| `devices` | `getDeviceBreakdown`, events | common geo scope | Private analytics read |
| `trend` | `getPageviewsTrend`, events | derived `durationHours` | Private analytics read |
| `events` | `getRecentEvents`, raw event metadata | limit fixed 20 | Private analytics read |
| `visitors` | `getRecentVisitors`, visitors/events | limit fixed 50 | Private analytics read |
| `geo-cities` | `getGeoCities`, events | country unvalidated | Private analytics read |
| `referrer-detail` | `getReferrerDetail`, events | `domain` required or 400; referrer detail panel | Private analytics read |
| `web-vitals` | `getWebVitals`, `meta.eventName='web-vitals'` | common scope | Private analytics read |
| `errors` | `getErrorStats`, error events | common scope | Private analytics read |
| `interactions` | `getInteractionStats`, click/outbound/form events | common scope | Private analytics read |
| `experiments` | `getExperiments`, event experiment metadata | common scope | Private analytics read |
| `revenue` | `getRevenueStats`, event transaction metadata | common scope | Private analytics read |
| `search-insights` | `getSearchStats`, `site_search` metadata | common scope | Private analytics read |
| `viewport-sizes` | `getViewportSizes`, event metadata | common scope | Private analytics read |
| `session-stats` | `getSessionStats`, events grouped by session | common geo scope | Private analytics read |
| `utm-campaigns` | `getUTMCampaigns`, event metadata | common scope | Private analytics read |
| `bot-breakdown` | `getBotBreakdown`, events | common scope | Private analytics read |
| `engagement` | `getEngagementMetrics`, event time/scroll metadata | common geo scope | Private analytics read |
| `hourly-heatmap` | `getHourlyHeatmap`, pageview events | common scope | Private analytics read |
| `browsers-detailed` | `getBrowsersDetailed`, event metadata | common scope | Private analytics read |
| `os-detailed` | `getOSDetailed`, event metadata | common scope | Private analytics read |
| `languages` | `getLanguages`, event language | common scope | Private analytics read |
| `screen-sizes` | `getScreenSizes`, event metadata | common scope | Private analytics read |
| `connection-types` | `getConnectionTypes`, event metadata | common scope | Private analytics read |
| `entry-exit-pages` | `getEntryExitPages`, events | common scope | Private analytics read |
| `live-now` | `getLiveNow`, last five minutes of events | ignores date range; common project/origin | Private analytics read |
| `retention` | `getRetention`, cohort event history | ignores date range; common project/origin | Private analytics read |
| `paths` | `getTopPaths`, events | common scope | Private analytics read |
| `country-detail` | `getCountryDetail`, events | `country` required or 400; dashboard content | Private analytics read |
| `visitors-explorer` | `getVisitorsExplorer`, events/visitors | `segment`/`sort` cast without enum validation; `limit` <=100, offset >=0, query <=64 | Private analytics read |
| `visitor-session-trail` | `getVisitorSessionTrail`, events and visitor identity links | fingerprint and session ID required, each <=128; explorer | Private analytics read |
| `visitor-recurrence` | `getVisitorRecurrence`, events/visitors | common scope | Private analytics read |
| `segments` | `getSegmentedMetrics`, events | arbitrary segment; only `pro`/`free` alter SQL | Private analytics read |
| `skriuw-events` | `getSkriuwEventCounts`, events | project defaults `skriuw` | Product-specific, investigate |
| `skriuw-trend` | `getSkriuwEventTrend`, events | project defaults `skriuw` | Product-specific, investigate |
| `skriuw-notes` | `getSkriuwNotesActivity`, events | project defaults `skriuw` | Product-specific, investigate |
| `skriuw-journal` | `getSkriuwJournalActivity`, events | project defaults `skriuw` | Product-specific, investigate |
| `skriuw-auth` | `getSkriuwAuthMetrics`, events | project defaults `skriuw` | Product-specific, investigate |
| `skriuw-recent` | `getSkriuwRecentEvents`, events | `limit` parsed but not capped/validated | Product-specific, investigate |
| `skriuw-searches` | `getSkriuwTopSearches`, events | fixed query limit 20 | Product-specific, investigate |

The `metric` dispatcher and selector-to-function mapping are authoritative at `apps/dashboard/src/app/api/analytics/route.ts:76-400`. The table names query implementations where the route makes the mapping; individual SQL output shapes are intentionally not stable contracts because the route forwards raw function results without a declared DTO.

### Other dashboard routes

| Operation | Handler / request | Response and data | Auth, scope, callers, tests | Classification |
| --- | --- | --- | --- | --- |
| `GET /api/analytics/visitor/:id` | `visitor/[id]/route.ts:12-177`; `id` is visitor row ID or fingerprint | visitor profile incl. UA/meta, up to 50 events and 30 sessions; 404/500 | Handler checks session only when OAuth enabled (`:5-17`). Reads by `id OR fingerprint`, then events/sessions by fingerprint without project filter. Visitor detail UI is consumer. No route test. | Private analytics read, scope gap |
| `PATCH /api/analytics/visitor/:id` | `visitor/[id]/route.ts:179-218`; body JSON parsed permissively; `Boolean(body?.isInternal)` | `{ fingerprint, isInternal }`; 404/500 | Same optional session gate. Updates `is_internal` in all visitors/events/sessions with that fingerprint, without project filter. Internal-toggle component calls it. No route test. | Private operational mutation, scope gap |
| `GET /api/posthog?metric=projects` | `posthog/route.ts:11-50` → `getPostHogProjects` | forwarded JSON; 400 unknown, 503 config, 500 failure | Proxy-only protection. Calls external PostHog API; dashboard content caller. No route test. | Private external-data read |
| `GET /api/posthog?metric=summary&project?` | same → `getPostHogSummary` | forwarded JSON / common errors | Same | Private external-data read |
| `GET /api/posthog?metric=insights&project?` | same → `getPostHogInsights(10, project)` | forwarded JSON / common errors | Same | Private external-data read |
| `GET /api/posthog?metric=events&project?` | same → `getPostHogRecentEvents(25, project)` | forwarded JSON / common errors | Same | Private external-data read |
| `GET /api/posthog?metric=visitor&distinctId&project?` | same → `getPostHogVisitorDetail` | 400 missing ID; otherwise forwarded JSON | Same; PostHog panel caller | Private external-data read |
| `GET /api/auth/login` | `auth/login/route.ts:5-28` | redirects home if disabled, otherwise GitHub OAuth redirect and `oauth_state` cookie | Public start endpoint; random state, HttpOnly/Secure-in-production/SameSite=Lax, 10 min. Header links caller. Unit auth tests only. | Public authentication initiation |
| `GET /api/auth/callback?code&state` | `auth/callback/route.ts:46-107` | redirects home/error; exchanges code, looks up GitHub login and `dashboard_users`, creates signed session | Public OAuth callback with state check. Reads `dashboard_users`; session has 30-day expiry. No callback route test. | Public authentication callback |
| `GET /api/auth/logout` | `auth/logout/route.ts:4-8` | redirects `/`, deletes session cookie | No authentication required; state-changing GET. Header link caller. No route test. | Authentication/session mutation |

## Authorization and access matrix

| Surface | Expected principal | Enforced check | Upstream | Gap |
| --- | --- | --- | --- | --- |
| Ingestion browser writes | public client from allowed origin | `authorizeIngestRequest` origin rule, `ingest-auth.ts:20-48` | Hono CORS middleware only; not auth | Intentional public write if allowlist empty; client controls project ID |
| Ingestion server writes | holder of `INGEST_SECRET` | constant-time Bearer compare, `ingest-auth.ts:28-37` | none | No project-level authorization |
| Ingestion admin/jobs/metrics/SSE | administrator or scheduled caller | shared admin/cron secret, `handlers/admin.ts:17-35` | none | Global secret, no project/role separation |
| Dashboard analytics/PostHog/visitor routes | analytics administrator; likely project-scoped if multi-project | route-local none; visitor route session only if enabled | proxy blocks all non-auth routes only when both GitHub vars set, `proxy.ts:11-39` | Config-gated no-auth; no project authorization |
| Dashboard visitor internal mutation | analytics administrator, scoped to one project | same optional session check | proxy as above | Cross-project update by fingerprint |
| Dashboard login/callback | public OAuth flow | OAuth state/session signature/allowlist check | excluded from proxy by matcher | No PKCE, but confidential server client; runtime provider configuration unverified |
| Logout | session holder | none | excluded from proxy | State-changing GET; low risk with SameSite=Lax cookie |

## Published SDK inventory

The package manifest exposes only `.`, `./browser`, and `./server` (`packages/sdk/package.json:29-45`). Files such as `api/privacy.ts`, `identity/traits.ts`, `utilities/*`, and observer modules are not importable package subpaths even when they export symbols internally. Current package version is `1.7.1` in this checkout (`package.json:2-4`); the npm artifact was not fetched, so publication parity requires a separate release inspection.

### Root `@remcostoeten/analytics`

The root is the React entry plus every supported browser export (`packages/sdk/src/index.ts:1-11`). It adds:

| Export | Signature / behavior | HTTP / evidence and compatibility |
| --- | --- | --- |
| `Analytics` | `(props: AnalyticsProps) => null`; starts pageview, Web Vitals, scroll, time observers; click/outbound/form/error observers opt in | Each observer ultimately sends `POST /e`; `components/analytics.tsx:16-83`. Existing JSX integration; preserve props/defaults. |
| `AnalyticsProvider` | React provider for `AnalyticsOptions` | No request itself; options become defaults for hooks/components, `provider.tsx:10-26`. |
| `useAnalyticsOptions` | `() => AnalyticsOptions` | No request; public hook, `provider.tsx:28-30`. |
| `useTrack` | `() => TrackHelpers` | Returns option-bound aliases for browser operations, `provider.tsx:32-40`. |
| `TrackClick` | component wrapping one React element, sends named click then existing `onClick` | Browser `trackClick`; `track-click.tsx:7-35`. |
| `AnalyticsErrorBoundary` | component; catches render error, calls `trackError`, renders fallback | Browser error event; `error-boundary.tsx:19-67`. |

### Browser exports: `@remcostoeten/analytics/browser`

All browser tracking functions are fire-and-forget and return `void`. They no-op for SSR, opt-out, DNT, or missing consent. `track` creates a fresh UUID event ID, defaults `projectId` to hostname, builds browser/identity/enrichment metadata, and uses `sendBeacon` then `fetch(..., keepalive)` to `${baseUrl}/e`; failed/offline events go to local storage queue and later `${baseUrl}/e/batch` (`packages/sdk/src/api/track.ts:29-120`, `utilities/offline-queue.ts:32-79`).

| Export group | Public signatures and behavior | Tests / compatibility |
| --- | --- | --- |
| Core tracking | `track(type, meta?, options?)`; `trackPageView(meta?, options?)`; `trackEvent(name, meta?, options?)`; `trackClick(element, meta?, options?)`; `trackError(error, meta?, options?)` | `trackPageView` fixes type `pageview`; event uses `meta.eventName`; click uses `type='click'`; error includes message/stack. Tests `__tests__/track.test.ts`. |
| Domain helpers | `trackTransaction(revenue, currency='USD', orderId?, items?, options?)`; `trackSearch(query, resultCount, options?)`; `identifyUser(properties, options?)`; `identify(userId, properties?, options?)`; `setExperiment(experimentId, variantId, options?)` | All create `type='event'` with distinct `meta.eventName`; identity/experiments also persist traits for later events (`track.ts:143-186`). Preserve payload names: dashboard queries depend on them. |
| Identity/session | `getVisitorId`, `resetVisitorId`, `getSessionId`, `resetSessionId`, `extendSession` | Visitor is local-storage UUID; session is session-storage UUID with 30-minute sliding expiry (`identity/visitor.ts:6-32`, `identity/session.ts:33-71`). Tests visitor/session suites. |
| Privacy/consent | `optOut`, `optIn`, `isOptedOut`, `checkDoNotTrack`, `PRIVACY_DISCLOSURE`, `getStoredKeys`, `setConsentRequired`, `setConsentGranted`, `hasConsent`, `isConsentRequired`, `canTrack`, `canPersist` | Opt-out/revocation clear analytics storage. Consent is in-memory only, not persisted (`api/consent.ts:3-38`). Tests consent/opt-out suites. |
| Observers | `observePageViews`, `observePerformance`, `observeScroll`, `observeTimeOnPage`, `observeClicks`, `observeOutboundLinks`, `observeForms`, `observeErrors` | Return cleanup functions; each produces event payloads described below. Tests cover pageview, click, scroll, time; remaining observer coverage is indirect/absent. |
| Queue/config | `flushOfflineQueue`, `clearOfflineQueue`, `createTrackHelpers`, `mergeAnalyticsOptions`, `resolveAnalyticsOptions`, `validateIngestUrl` | Queue capacity 50; no explicit retry timer beyond online event. Provider tests cover option merging. `validateIngestUrl` permits HTTP or HTTPS bases. |
| Types | `AnalyticsOptions`, `EventPayload`, `EventType`, `KnownEventType`, `JsonPrimitive`, `JsonValue`, `TrackMeta`, `TrackHelpers`, `StorageKeyInfo` | Type-only public contract, `browser/index.ts:44-53`. |

Supported event conventions are established by code, not an enum: `pageview`, `event`, `click`, and `error` are known types but arbitrary strings are accepted (`packages/sdk/src/types/index.ts:1-5`). Automatic observer event names are `web-vitals`, `scroll`, `time-on-page`, `outbound_click`, and `form_submit` (`observers/*.ts`). These are compatibility-critical because dashboard queries inspect `type` and `meta.eventName`.

### Server exports: `@remcostoeten/analytics/server`

| Export | Signature and behavior | HTTP / tests / compatibility |
| --- | --- | --- |
| `trackServer` | `(type, ServerAnalyticsOptions, meta?) => Promise<TrackServerResult>` | `POST {ingestUrl}/e` JSON with optional Bearer secret and `meta.source='server'`; result has `ok`, `status`, optional `deduped/error` (`server/index.ts:71-124`). Tested in `__tests__/track-server.test.ts`. |
| `trackServerEvent` | overloads `(name, options)` and `(name, meta, options)` | Alias to `trackServer('event', …)` with `eventName`, `server/index.ts:127-146`. |
| `trackServerError` | overloads `(error, options)` and `(error, meta, options)` | Alias to `trackServer('error', …)` with message/stack, `server/index.ts:148-174`. |
| `createServerTrack` | `(defaults) => ServerTrackHelpers` | Returns option-bound `track`, `trackEvent`, `trackError`, `server/index.ts:176-194`. |
| Types | `EventType`, `TrackMeta`, `ServerAnalyticsOptions`, `ServerTrackHelpers`, `TrackServerResult` | Public type contract, `server/index.ts:196-202`. |

### Internal-only exports and release uncertainty

`resetDedupe` is exported by `api/track.ts` but not re-exported by `browser/index.ts` or root, so it is not a supported package export. It is a no-op (`packages/sdk/src/api/track.ts:25-27`). `clearAnalyticsStorage`, storage-key constants, trait helpers, `normalizeIngestUrl`, queue enqueue/init, and `onRouteChange` are likewise internal-file exports only. Do not treat deep imports as supported compatibility commitments without an intentional export-map change.

The checkout's declared version and source do not prove what npm `1.7.1` currently ships. Before an externally compatible change, compare npm tarball exports and `.d.ts` to the built checkout output.

## Definitions and metric semantics

| Term | Actual definition | Evidence / caveat |
| --- | --- | --- |
| Event | One accepted event payload inserted into `events`; `type` is arbitrary non-empty string. | `validation.ts:11-38`, `ingest.ts:322-367`. |
| Pageview | Event where `type = 'pageview'`; automatic on SDK mount and pathname-only SPA change. | `track.ts:123-125`, `observers/pageview.ts:40-73`; queries filter `type='pageview'`, e.g. `kpis.ts:15`. Query-string/hash-only changes do not create pageviews. |
| Visitor | SDK persistent UUID in local storage when storage/consent allow it; database visitor row unique per project + fingerprint. | `identity/visitor.ts:6-19`; `schema.ts:64-97`. A read query sometimes joins events only by fingerprint, which can cross projects. |
| Session | SDK session-storage UUID, refreshed for 30 minutes on each tracking call; server session row has a global unique `session_id`. | `identity/session.ts:4-71`; `schema.ts:99-123`. Same session ID across projects would collide at storage level. |
| Unique visitors | `COUNT(DISTINCT events.visitor_id)` in query range, after `publicTraffic` filter. | `queries/kpis.ts:29-50`. It is event-derived, not a count of visitors table rows. |
| Sessions | `COUNT(DISTINCT events.session_id)` in query range. | `kpis.ts:53-65`. A session spanning range boundaries counts in each range with activity. |
| Bounce rate | Percentage of grouped event sessions with exactly one pageview. | `queries/sessions.ts:12-24`. It is not based on the materialized `sessions` table. |
| Time on page | SDK sends incremental visible-time chunks on route/unload; engagement query sums them per `(session_id,path)`. | `observers/heartbeat.ts:6-60`; `sessions.ts:35-47`. Overview instead averages individual chunks, so its `avgTimeOnPage` is not the per-visit metric. |
| Scroll depth | SDK sends maximum depth per path on route/unload; engagement query takes maximum per `(session_id,path)`. | `observers/scroll.ts:6-50`; `sessions.ts:35-47`. |
| Live now | Distinct visitor/session IDs observed in the last five minutes; events/minute is five-minute count divided by five. | `queries/realtime.ts:47-72`. It is a poll query, not ingestion SSE. |
| Retention | Weekly cohort = first event week in last 180 days; activity shown through weeks 0–4, last five cohorts. | `queries/sessions.ts:117-150`. |
| Clean/public traffic | Excludes localhost, preview and internal flags plus multiple host/origin/referrer preview patterns. | `queries/filters.ts:47-72`. Bot events are not excluded by this common filter. |
| Rollup counts | Daily UTC `total`, `path`, and `country` dimensions exclude bot, internal, localhost, preview rows. | `utilities/rollup.ts:24-87`. This differs from dashboard `publicTraffic`, which does not exclude bot rows. |

## Evidence-backed findings

1. **F-001 — Dashboard analytics can be intentionally anonymous in production configuration (High, CWE-306).** When either GitHub OAuth variable is absent, `proxy` returns `NextResponse.next()` for every dashboard page and API route (`apps/dashboard/src/proxy.ts:11-20`), while analytics selectors return raw visitor/event metadata. `/api/analytics/visitor/:id` returns UA, geographic data, traits, events and sessions (`visitor/[id]/route.ts:20-172`). This is a confirmed configuration-gated exposure, not a claim about current deployment configuration. Add fail-closed production behavior or move the read API behind mandatory service authentication before treating it as a reusable API.

2. **F-002 — Visitor detail and internal toggle are not project-scoped (High if projects represent tenants; CWE-863).** The visitor route accepts an ID/fingerprint and finds rows without `project_id`; subsequent events/sessions reads and all toggle updates use fingerprint alone (`visitor/[id]/route.ts:20-63`, `190-208`). The dashboard allows optional project filtering elsewhere. Static code cannot establish whether all projects share one trusted administrator; if not, this is cross-project data exposure and mutation.

3. **F-003 — Read API is a 50-selector RPC multiplexer with unversioned, selector-dependent shapes (Medium, contract risk).** `metric` defaults to an unsupported `overview`, query validation varies by case, and output forwards untyped query results (`analytics/route.ts:3-75`, `76-400`). This complicates auth, validation, cache policy, documentation, and safe independent clients. It should be split by resource/contract only after compatibility decisions are made.

4. **F-004 — Ingestion authorizes transport source, not project ownership (Medium if projects become tenant boundaries; CWE-639/CWE-863).** Accepted browser origins or one shared server secret may submit any body `projectId` (`validation.ts:11-13`, `ingest-auth.ts:20-48`). This is compatible with a self-hosted single-owner ingestion deployment, but incompatible with delegated multi-project write authorization.

5. **F-005 — Several calculated metrics use different definitions or different filters (Medium, data-contract risk).** Rollups exclude bots, while dashboard public traffic does not (`rollup.ts:24-29`, `filters.ts:47-58`); overview averages time heartbeat chunks while engagement sums per visit (`overview.ts:139-168`, `sessions.ts:35-47`); session statistics are computed from events despite a sessions table (`sessions.ts:12-24`). Formalize definitions before exposing read APIs.

6. **F-006 — Operational and request metrics are per-process, not durable (Medium, observability risk).** Request counter, SSE listeners, dedupe counters and rate-limit maps live in module memory (`app.ts:20-45`, `dedupe.ts:128-164`, `rate-limit.ts:6-91`). On Vercel they cannot represent global traffic or provide a global rate limit.

7. **F-007 — Scheduled cleanup runs through both Vercel cron and an in-process production interval (Medium, operational risk).** Vercel schedules `GET /admin/cleanup` (`apps/ingestion/vercel.json:3-6`) while importing `data-retention.ts` in production also installs a 24-hour interval (`data-retention.ts:136-143`). Cleanup is idempotent enough to avoid obvious corruption but can race, duplicate load, and make schedule ownership unclear.

8. **F-008 — Current route-level coverage is incomplete (Medium, regression risk).** Ingestion tests cover handler behavior plus pipeline units, SDK tests cover primary tracking, identity and consent, and dashboard tests cover auth utilities/queries; no test was found for Hono admin routes, metrics/SSE/batch route behavior, dashboard API route selector validation, visitor route authorization/project scope, PostHog route, or OAuth handlers.

### Hypotheses and unresolved facts

- Deployment gateway/Cloudflare rules, production environment variables, secret rotation, actual OAuth registration, and npm artifact contents were not inspected. They can strengthen or weaken access findings but cannot substitute for route-level controls.
- `DATABASE_URL` absence creates a fallback database that reports ingestion success/deduplication without writes (`packages/ingestion/src/db/client.ts:49-58`). This is confirmed source behavior; whether it occurs anywhere outside local development is unverified.
- The `skriuw-*` selectors may have current consumers outside the repository. Their product-specific naming/default scope must be confirmed before retirement.
- The `apps/dashboard` code exists in this branch. Its README/product status is not used to infer external support, and no external clients beyond in-repository dashboard components and the published SDK are proven here.

## Coverage checklist

- [x] Searched Hono registrations, Next App Router handlers, Vercel wrapper and scheduled jobs.
- [x] Expanded all 50 analytics and five PostHog metric selectors.
- [x] Inspected global proxy/auth controls and visitor route-local control.
- [x] Inspected SDK export map, root/browser/server entries, internal-only exports, transport, consumer use, and tests.
- [x] Traced ingestion write, dashboard direct-SQL read, and scheduled side effects.
- [x] Documented definitions, aliases, response/error behavior, project scope and test coverage.
- [ ] Verify deployed gateway policy, production auth configuration, database migration state, and npm tarball/export parity.
- [ ] Confirm product ownership and external consumers for every dashboard selector, especially `skriuw-*` and `/ingest` aliases.
