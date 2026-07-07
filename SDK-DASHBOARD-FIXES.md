# SDK + Dashboard Review Fixes — Handoff

Source: 2026-07-07 review of `packages/sdk` and `apps/example-dashboard`. Agreed fix order below. **Changes are applied but NOT committed** — the working tree also carries prior unrelated dirty changes, so review `git diff` before committing.

## Status

| Group | Fix | Status |
|-------|-----|--------|
| 1 | SDK dedupe key | ✅ done |
| 2 | Geo ISO round-trip + fake bounce column | ✅ done |
| 3 | Trend bucketing + axis labels | ✅ done |
| 4 | View-gated SWR + keepPreviousData | ✅ done |
| 5 | Remaining SDK unload/cleanup | ✅ done |
| — | SDK SPA-aware scroll/time reset (#6) | ✅ done |
| — | identify/setExperiment persist to visitor | ✅ done |
| — | calculateTrend "new" state for previous=0 | ✅ done |
| — | Retention year-boundary bug + unbounded cohort scan | ✅ done |
| — | Referrers grouped by domain, not full URL | ✅ done |
| — | KPI bounce-rate/pages-per-session 0% flash | ✅ done |
| — | fallbackData: [] defeating `|| mockData` fallback | ✅ done |
| — | getFlagEmoji/formatNumber duplication → lib/format.ts | ✅ done |
| — | API timeRange missing 24h/7d | ✅ done |

## What was changed

### 1. SDK dedupe (`packages/sdk/src/api/track.ts`)
`createEventKey` now includes `meta.eventName`. Before, all custom events shared `type: "event"`, so at unload `scroll` / `time-on-page` / `web-vitals` collided and only the first survived.

### 2. Geo + bounce
- `packages/sdk`… n/a — dashboard only.
- `apps/example-dashboard/lib/queries/content.ts` — `getGeoDistribution` and `getGeoDetail` keep the full country **name** in `country` and put the ISO code in `countryCode`. Fixes: legend showing codes, and the country-detail modal querying `country = 'US'` against DB `"United States"` (was returning zeros for top countries).
- `apps/example-dashboard/components/data-table.tsx` — removed the fake "Bounce" column (`getTopPages` never selected `bounceRate`, so it always showed 0%).

### 3. Trend bucketing (`apps/example-dashboard/lib/queries/overview.ts`, `components/trend-chart.tsx`, `lib/types.ts`)
- `getPageviewsTrend` / `getVisitorsTrend` pick granularity: ranges > 3 days bucket by `day`, else `hour` (was always `date_trunc('hour')` → 4320 points for 180d).
- Gaps are zero-filled (`zeroFill` helper, UTC-aligned to match DB `date_trunc`; project TZ is UTC).
- `TimeSeries.granularity` added to the type; `trend-chart.tsx` formats X-axis labels per granularity (day → "Jul 7", hour → "14:00").

### 4. View-gated SWR (`apps/example-dashboard/components/dashboard-content.tsx`)
- Added `viewKey(views, metric)` — returns the query only when `activeView` is in the owning view set, else `null` (SWR skips). Previously all ~25 hooks fired on every tab.
- Added `keepPreviousData: true` to all hooks (no full-flash on time-range/project switch).
- `overview-extended`, `session-stats`, `projects` stay always-on (KPI header + nav need them).

### 5. SDK unload / cleanup
- **New `packages/sdk/src/utilities/unload.ts`** — `onUnload(handler)` registers `visibilitychange`→hidden + `pagehide` (reliable on mobile, unlike `beforeunload`) and returns a cleanup fn. Exported from `utilities/index.ts`.
- `observers/performance.ts` — observers now returned and `disconnect()`-ed on cleanup; uses `onUnload`; `send` guarded by `sent`.
- `observers/scroll.ts`, `observers/heartbeat.ts` — use `onUnload`; added `sent` guard so the final event fires once.
- `utilities/offline-queue.ts` — failed batch POST now **re-enqueues** events instead of dropping them; `write()` catch uses `noop()` instead of a silent comment.
- `types/index.ts` + `api/track.ts` — added client `ts` (ISO) to `EventPayload` so offline-queued events keep their original time.

## Session 2 — what was changed
- **SDK #6 (SPA-aware scroll/heartbeat)**: `observers/pageview.ts` now exports `onRouteChange(handler)`, tracking `window.location.pathname` and firing on the existing navigation event + `popstate`. `observers/scroll.ts` and `observers/heartbeat.ts` subscribe to it: on route change they flush the current value (`sendScroll`/`sendTimeOnPage`) then reset their counters (`maxScroll`/`sent`, `totalTimeMs`/`lastStartTime`/`isPaused`/`sent`), so each route gets its own scroll-depth/time-on-page event instead of one blended value at final unload.
- **identify/setExperiment persistence**: `packages/ingestion/src/handlers/ingest.ts` — `resolveVisitorMetaMerge(payload)` inspects `meta.eventName`; for `"identify"` it merges `userProperties` into `visitors.meta.identity`, for `"experiment_exposure"` it merges `experiments` into `visitors.meta.experiments`. Merge is done with `jsonb_set` + `||` at the nested key (not a top-level `||`) so repeated exposures/identify calls accumulate instead of clobbering each other.
- **calculateTrend "new" state** (`lib/queries/filters.ts`): `previous === 0 && current > 0` now returns `direction: "new"` instead of `"flat"` with 0%. `KPIMetric.trend.direction` type extended; `kpi-cards.tsx` renders "New" text for that case.
- **Retention query** (`lib/queries/sessions.ts`): replaced `EXTRACT(WEEK FROM e.ts) - EXTRACT(WEEK FROM vc.cohort_week)` (breaks across year boundary) with `FLOOR(EXTRACT(EPOCH FROM (DATE_TRUNC('week', e.ts) - vc.cohort_week)) / 604800)`. Also bounded the previously-unbounded `visitor_cohorts` full-table scan to a 180-day lookback.
- **Referrers grouped by domain** (`lib/queries/content.ts`): `getTopReferrers` now extracts the domain in SQL (`regexp_replace` on the referrer URL) and groups by that, instead of grouping by the full URL and only extracting domain per-row afterward (which fragmented visits across query-string/path variants of the same referrer).
- **KPI 0% flash** (`dashboard-content.tsx`): bounce-rate/pages-per-session cards show "—" instead of "0.0%"/"0" until `sessionStats` has loaded at least once.
- **fallbackData truthiness bug** (`dashboard-content.tsx`): removed `fallbackData: []` from the `pages`, `referrers`, `geo` SWR hooks so `pages || initialData...`-style fallbacks actually trigger when the query is skipped or hasn't resolved yet, instead of permanently short-circuiting on an always-truthy `[]`.
- **Dedupe helpers** — new `lib/format.ts` exports `formatNumber`/`getFlagEmoji`; `dashboard-content.tsx`, `data-table.tsx`, `visitors-table.tsx`, `geo-map.tsx` now import from it instead of each declaring their own copy; `lib/queries/filters.ts` re-exports `formatNumber` from the same source instead of duplicating it server-side.
- **API ranges**: added `24h`/`7d` to the `VALID_RANGES` set and hour mapping in `app/api/analytics/route.ts`, and to the time-range pickers in `command-palette.tsx` and `app-sidebar.tsx`.

## Verification (session 2)
- `packages/sdk`, `packages/ingestion`, `apps/example-dashboard`: `npx tsc --noEmit` — clean.
- `apps/example-dashboard`: `bun test` — 7/7 pass.
- `packages/ingestion`: `bun test` — 137/137 pass.
- `packages/sdk`: `bun test` — 75 pass / 22 fail. Confirmed via `git stash` that baseline (before these changes) is 75/21 — same pre-existing dedupe-Set test-pollution issue noted below, not a regression.

## Other known issues from the review (not in the agreed fix order, untouched)
- SDK: `offline-queue` empty-catch was fixed; remaining minor items noted above.
- `packages/sdk` test suite: module-level dedupe `Set` in `track.ts` leaks across tests (no reset in `beforeEach`), causing flaky cross-test pollution (~21-22 fail out of 97). Separate task — fix the test harness to reset dedupe state between tests.

## Verification
- `packages/sdk` and `apps/example-dashboard`: `npx tsc --noEmit` — clean.
- `apps/example-dashboard`: `bun test` — 7/7 pass.
- `packages/sdk`: `bun test` — ~21 fail, but **pre-existing**. The module-level dedupe `Set` in `track.ts` leaks across tests (no reset in `beforeEach`), so tests pollute each other. Baseline (before these changes) fails the same set; the dedupe-key change only reshuffles which flaky ones fail. Fixing the test harness (reset dedupe state between tests) is a separate task.
