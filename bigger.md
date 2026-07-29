# Task: City-level dot/bubble maps for the analytics dashboard

## Context

Monorepo: `apps/example-dashboard` (Next.js dashboard, typed routes, Tailwind, shadcn), `packages/ingestion` (event ingestion). Package manager is bun; run `bunx tsc --noEmit` inside `apps/example-dashboard` to verify.

**Important — the hard part is already done.** Ingestion already resolves and stores coordinates per event:

- `packages/ingestion/src/db/schema.ts` — `events.latitude` / `events.longitude` (`double precision`), added in migration `0005_add_geo_detail.sql`.
- Resolution happens in `packages/ingestion/src/utilities/geo-mmdb.ts` (MaxMind City MMDB, `record.location.latitude/longitude`) with header fallback (`x-vercel-ip-latitude`) in `utilities/geo.ts`, merged in `utilities/resolve-geo.ts`.

So this task is **dashboard-side only**: query the coordinates and render city dots/bubbles. Do NOT touch the ingestion package.

## Existing dashboard geo code to build on

- `apps/example-dashboard/src/components/geo-map.tsx` — world choropleth via `react-simple-maps` (`ComposableMap`/`Geographies`), topojson from `https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json`, exports `isoCodeToNumericCode`.
- `apps/example-dashboard/src/components/country-mini-map.tsx` — single-country SVG shape used in the country-detail modal; uses `d3-geo` (`geoMercator().fitExtent`) + `topojson-client` directly (both are direct deps of the app). Follow this pattern for projecting dots.
- `apps/example-dashboard/src/lib/queries/content.ts` — geo queries (`getGeoDistribution`, `getGeoCities`, `getGeoDetail`, `getCountryDetail`). All use the `publicTraffic(...)` filter from `./filters` — every new query MUST apply it too.
- API surface: `apps/example-dashboard/src/app/api/analytics/route.ts` — metric-name switch (`case "country-detail":` etc.). Add new metrics here.
- The country-detail modal lives in `apps/example-dashboard/src/components/dashboard-content.tsx` (search `countryDetail`). Modal open state is URL-driven via the `countryDetail` search param.
- `/geo` page: `apps/example-dashboard/src/app/geo/` — check what it renders before adding to it.

## What to build

1. **Query: `getCityPoints`** in `apps/example-dashboard/src/lib/queries/content.ts`
   - Aggregate events with non-null lat/lon in the requested range: `GROUP BY city, region, country` (use rounded lat/lon or `AVG(latitude)::numeric` per city to get one point per city), returning `{ city, region, country, countryCode, latitude, longitude, events, visitors }`.
   - Optional `country` argument to scope to one country (for the modal mini map).
   - Respect `publicTraffic(excludeVisitorId, origin)`, `projectId`, and date range exactly like sibling queries. Reuse `COUNTRY_NAME_TO_ISO` from `./filters` for codes.
   - Expose as `metric=city-points` (+ optional `&country=`) in the analytics API route, following the existing `case` pattern.

2. **Dot layer on the world `GeoMap`**
   - Render proportional-radius circles (sqrt scale, e.g. r 2–10) on top of the existing choropleth using `react-simple-maps`' `<Marker coordinates={[lon, lat]}>`.
   - Tooltip on hover: city name, events, visitors (reuse the existing tooltip approach in `geo-map.tsx`).
   - Clicking a dot should call the existing `onCountryClick` path or, better, deep-link to the country modal (`?countryDetail=XX`).
   - Make the layer toggleable (small "Cities" toggle in the card header) and keep it off for the loading state.

3. **Dots on `CountryMiniMap`** (country-detail modal)
   - Add an optional `points` prop; project each with the same fitted `geoMercator` projection already computed for the shape and render circles with a subtle label for the top 3 cities.
   - The modal already fetches `country-detail`; either extend `getCountryDetail` with `cityPoints` (preferred — one fetch) or have the modal fetch `metric=city-points&country=X` alongside.

4. **`/geo` page**: if it renders the world map, pass the dot layer there too; keep prop drilling minimal.

## Constraints / house rules

- Global user rules apply (see `~/.claude/CLAUDE.md`): standalone functions use the `function` keyword, callbacks are arrows; single non-exported type per file is named `Props`; no explanatory comments; no empty catch blocks.
- Tab indentation, match surrounding style. Typed routes: cast hrefs with `as Route` where needed.
- No new dependencies — `d3-geo`, `topojson-client`, `react-simple-maps` are already installed.
- Events older than migration 0005 have NULL coordinates — queries must filter `latitude IS NOT NULL AND longitude IS NOT NULL`, and the UI should not imply completeness (label the layer "cities with location data" somewhere subtle if counts look sparse).
- Verify with `bunx tsc --noEmit` in `apps/example-dashboard`. Do not commit unless asked.
