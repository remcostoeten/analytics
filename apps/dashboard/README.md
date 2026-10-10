# apps/dashboard

The v2 dashboard on Next, laid out after Cloudflare's Web Analytics. It is served under the base path `/dashboard`, and the landing site in `apps/docs` rewrites `/dashboard` to it, so it opens at `https://docs.analytics.remcostoeten.nl/dashboard`.

| Route | Shows |
| --- | --- |
| `/sign-in` | GitHub sign-in through the API, in the landing page's style |
| `/` | Every project you can read, with pageviews and visitors over the last 24 hours |
| `/projects/:id/:metric` | Web analytics for one project: the metric rail, filters, time range, summary chart with annotations, countries and sources |
| `/projects/:id/speed/:vital` | Core Web Vitals per metric and percentile: the vitals rail, thresholds on the chart, routes and slow elements that filter on click |
| `/projects/:id/issues`, `/projects/:id/issues/:issue` | Grouped errors by status, and one issue with its events, stacks and breadcrumbs; admins resolve, ignore and reopen |
| `/projects/:id/realtime` | Visitors now, live events, active visitors and sessions, polled every five seconds through TanStack Query with a visible countdown |
| `/projects/:id/visitors`, `/projects/:id/visitors/:visitor` | The visitor list in the range, and one visitor with their facts and visits |
| `/projects/:id/sessions/:session` | One session as an ordered timeline of pageviews and events |
| `/admin/projects`, `/admin/tokens` | Projects, their settings and keys, and API tokens, for the owner and admins |

Signed out, the home page and the aggregate views (web analytics, speed, realtime's counts and feed) show public projects only; issues, visitors, session trails and the live visitor rows need sign-in, and the status and annotation controls need an admin. The view lives in the URL: `period`, `bots=include`, `split` for the chart, `percentile` for speed, `status` for issues, and one parameter per filter such as `country=NL`, `route=/blog/[slug]` or `page=!/admin`. The `device` filter doubles as the speed view's device.

| Command | Does |
| --- | --- |
| `bun run dev` | Serves on port 3300, at `http://localhost:3300/dashboard` |
| `bun run build` | `next build` |
| `bun run test` | Tests for the view state, formatting, speed thresholds, issue helpers, trails, annotation placement, form helpers and cookie forwarding; `e2e/parity` holds the parity suite against a seeded API |

| Variable | Default | Does |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://api.analytics.remcostoeten.nl` | The API it reads from and signs in through |
| `NEXT_PUBLIC_SITE_URL` | `https://docs.analytics.remcostoeten.nl` | The landing and docs site it links back to |

The API must list the origin the browser sees as `DASHBOARD_ORIGIN`, or sign-in and the session cookie are refused: the landing origin in production, and `http://localhost:3300` when the app runs alone, set in `apps/api/.env.playground` next to the GitHub client id and secret. To try the rewrite locally, run `apps/docs` with `DASHBOARD_URL=http://localhost:3300` and set `DASHBOARD_ORIGIN=http://localhost:3200`.

Server components forward the browser's session cookie to the API through `@spoar/client`. Client components read through the same client with `credentials: "include"` (`src/shared/api/browser-client.ts`) under TanStack Query, keyed by `scope.key(route, ...args)` (decision 24): the realtime panel polls its four reads every five seconds and pauses while the tab is hidden, and the live badge in the project header refetches the five-minute visitor count every 30 seconds and shares the cache entry with the realtime page. Every change goes through a server action in `src/modules/admin/actions.ts` or `src/modules/analytics/actions.ts`.
