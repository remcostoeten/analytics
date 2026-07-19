# Plan: Geo → people filtering + remarkable-behaviour signals

Status: **implemented 2026-07-20** on branch `feat/geo-filtering-and-signals` (all three workstreams; migrations 0005+0006 applied to Neon). Written 2026-07-19 on branch `feat/blazing-fast-example-dashboard` (PR #14 open to master).
Prerequisite context: Geo Explorer already shipped in `1ff1959`; geo capture pipeline in `7e8e68b`; ASN columns in migration `0006`.

## Why

The Geo Explorer (`/geo`) drills world → country → region but ends at aggregates.
Goal: every drill-down ends at *people* (visitor profiles), geo becomes a global
dashboard filter, and the dashboard surfaces computed anomalies instead of
requiring the owner to notice them.

## Current architecture (verified, don't re-derive)

- Dashboard: Next 16, client SWR → `GET /api/analytics?metric=<name>&…` → `apps/example-dashboard/lib/queries/*` (Neon `sql` tag, fragments composed via nested `sql``…``).
- Global filters flow through URL search params (`projectId`, `origin`, `timeRange`, `from/to`) read by `dashboard-content.tsx` and `app-sidebar.tsx`; every query accepts `(from, to, projectId, excludeVisitorId, origin)` and wraps `publicTraffic(...)` from `lib/queries/filters.ts`.
- Geo queries: `lib/queries/geo.ts` (`getGeoExplorer`), name normalization in `lib/geo-names.ts` (**events.country is MIXED**: ISO codes "NL" from edge headers AND full names "Netherlands" from legacy rows — always filter with `countryFilterValues(code)` which returns both forms).
- Geo UI: `components/geo/geo-explorer.tsx` (URL-param drill state: `?country=NL&region=FR`), `components/geo/geo-dot-map.tsx`.
- Visitor profiles: `/visitor/[id]` (id = fingerprint), queries in `lib/queries/visitors.ts`.
- Events columns available: country, region, city, latitude, longitude, timezone, postal_code, continent, asn, as_org, device_type, bot_detected, is_internal + visitors/sessions tables (see `packages/ingestion/src/db/schema.ts`).
- Sidebar was refactored by the user to `MotionSidebarMenu` — Geo Explorer entry already exists there; don't restructure the sidebar.

## Workstream 1 — Visitors-in-scope panel on /geo (smallest, do first)

1. New query `getGeoVisitors(from, to, projectId, country, region, city, limit=20, excludeVisitorId, origin)` in `lib/queries/geo.ts`:
   - Source from `events` (visitors table geo is last-touch only): `SELECT visitor_id, max(ts) last_seen, count(*) events, count(distinct session_id) sessions, mode() WITHIN GROUP (ORDER BY city) city, mode() WITHIN GROUP (ORDER BY as_org) as_org FROM events WHERE <publicTraffic + range + project + scopeFilter> AND visitor_id IS NOT NULL GROUP BY visitor_id ORDER BY last_seen DESC LIMIT …`.
   - Reuse the existing `scopeFilter(country, region)` helper (extend it with optional `city`).
2. API route case `geo-visitors` in `app/api/analytics/route.ts` (validate params like the existing `geo-explorer` case).
3. UI: add a "Visitors in this area" panel to `geo-explorer.tsx` (fifth panel or full-width row below the panels). Each row: fingerprint short-id, city, ISP (as_org), sessions, last seen → `<Link href={`/visitor/${fingerprint}`}>`. Show at world level too (it's just unscoped).
4. Acceptance: drill to NL→FR, click a visitor, land on their profile; back button returns to the drilled state (URL params preserved — use plain Links, profile page already has a back link).

## Workstream 2 — country/region as global dashboard filters

1. Read `country`/`region` params in `components/dashboard-content.tsx` (same pattern as `selectedProject`); pass into `buildQuery()` so every metric fetch carries them.
2. `app/api/analytics/route.ts`: parse/validate once at top (2-letter uppercase country, ≤64-char region requiring country) and thread into queries. **Scope**: only wire the high-value metrics first — overview-extended, trend, pages, referrers, visitors, session-stats, devices, engagement. Others can ignore the params (document which).
3. Query layer: add optional `geoScope?: { country: string; region?: string }` parameter; implement as one shared fragment in `lib/queries/filters.ts` (move/reuse `scopeFilter` + `countryFilterValues` from geo.ts — import direction: filters.ts must not import geo-names.ts if that creates a cycle; check, likely fine since geo-names imports filters. If cyclic, move `COUNTRY_NAME_TO_ISO` into geo-names.ts).
4. Entry points: clicking a country in the existing overview geo panel/map sets `?country=NL` (today it opens the modal — keep modal, add a "Filter dashboard" button inside it). Geo Explorer gets a "View filtered dashboard" breadcrumb action.
5. Filter chip in `dashboard-header.tsx`: "🇳🇱 Netherlands · Friesland ✕" clears the params.
6. Acceptance: `/?country=NL` shows only Dutch traffic in KPIs/trend/pages; chip removes it; works combined with project + origin + range.

## Workstream 3 — Signals panel (remarkable behaviour)

New query `getGeoSignals` (or `lib/queries/signals.ts`) returning a ranked array `{ kind, severity, title, description, href, count }`. Compute in SQL over the selected range, each capped/LIMITed:

- `vpn-suspect`: visitors where browser timezone implies a different country than IP (join events, use the `TIMEZONE_COUNTRIES` map from `lib/geo-names.ts` — export a SQL-usable list or compute in JS over grouped rows like `getGeoExplorer` does). Link → visitor profile.
- `datacenter-traffic`: as_org matching (Amazon|Google Cloud|Microsoft|Hetzner|DigitalOcean|OVH|Vultr|Linode) with bot_detected=false — bots that slipped through. Link → visitor.
- `outlier-visitor`: visitors with events > 10× the median visitor event count in range (compute median via percentile_cont).
- `new-country`: countries whose first-ever event (all-time min(ts)) falls inside the selected range. Link → `/geo?country=XX`.
- `regional-spike`: region whose event count in the last 24h > 3× its trailing 7-day daily average (only when range ≥ 7d).
- `zero-engagement`: sessions with ≥5 pageviews and no scroll/time-on-page events (needs SDK ≥1.6 data).

UI: `components/geo/signals-panel.tsx` rendered on `/geo` (full-width, above the four panels) and optionally on the overview tab. Severity badge (high/med/info), each row links to the relevant visitor/scope. Empty state: "No anomalies in this range".

Acceptance: with seeded/real data at least `new-country` and `outlier-visitor` fire; every signal row navigates somewhere useful.

## Verification (run per workstream)

```sh
cd apps/example-dashboard && bunx tsc --noEmit && bun test && bun run build
```

Commit per workstream (`feat(geo): …`). Do **not** commit files you didn't touch — the working tree may contain the user's parallel edits (shadcn/posthog/dashboard-content churn, bun.lock, tsbuildinfo). Stage explicitly by path.

## Sub-agent orchestration (if user asks to parallelize)

Spawn only when the user asks. Suitable split — workstreams are independent except WS2's shared `scopeFilter` refactor, so land WS1 first or give WS2 the refactor:
- WS1 (visitors panel): **sonnet** — mechanical, pattern exists (copy `geo-explorer` case + panel components).
- WS2 (global filters): **opus** — touches many files incl. the 1250-line `dashboard-content.tsx` that the user also edits; needs care merging.
- WS3 (signals SQL): **opus** for the SQL design, sonnet fine for the panel UI.
Each agent must read this file + `lib/queries/geo.ts` + `components/geo/geo-explorer.tsx` first, and run the verification block before reporting.

## Open/held items (context, not part of this plan)

- Version bumps ON HOLD per user: SDK 1.7.0 (timezone enrichment, unreleased), ingestion 0.2.0 (geo pipeline), consumer repos (skriuw ^1.5, dora ^1.4 ×3, remcostoeten.nl ^1.4).
- Deploy order when releasing: run migrations 0005+0006 → deploy ingestion → publish SDK → consumers. Coordinates/timezone/ASN only populate for events after that deploy.
- npm token used on 2026-07-19 should be revoked; publishing needs a fresh login.
