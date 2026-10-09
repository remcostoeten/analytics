# apps/dashboard

The v2 dashboard on Next, laid out after Cloudflare's Web Analytics. It is served under the base path `/dashboard`, and the landing site in `apps/docs` rewrites `/dashboard` to it, so it opens at `https://docs.analytics.remcostoeten.nl/dashboard`.

| Route | Shows |
| --- | --- |
| `/sign-in` | GitHub sign-in through the API, in the landing page's style |
| `/` | Every project you can read, with pageviews and visitors over the last 24 hours |
| `/projects/:id/:metric` | Web analytics for one project: the metric rail, filters, time range, summary chart, countries and sources |
| `/admin/projects`, `/admin/tokens` | Projects, their settings and keys, and API tokens, for the owner and admins |

Signed out, the home page and the analytics views show public projects only. The view lives in the URL: `period`, `bots=include`, `split` for the chart, and one parameter per filter such as `country=NL` or `page=!/admin`.

| Command | Does |
| --- | --- |
| `bun run dev` | Serves on port 3300, at `http://localhost:3300/dashboard` |
| `bun run build` | `next build` |
| `bun run test` | Tests for the view state, formatting, form helpers and cookie forwarding |

| Variable | Default | Does |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://api.analytics.remcostoeten.nl` | The API it reads from and signs in through |
| `NEXT_PUBLIC_SITE_URL` | `https://docs.analytics.remcostoeten.nl` | The landing and docs site it links back to |

The API must list the origin the browser sees as `DASHBOARD_ORIGIN`, or sign-in and the session cookie are refused: the landing origin in production, and `http://localhost:3300` when the app runs alone, set in `apps/api/.env.playground` next to the GitHub client id and secret. To try the rewrite locally, run `apps/docs` with `DASHBOARD_URL=http://localhost:3300` and set `DASHBOARD_ORIGIN=http://localhost:3200`.

Server components forward the browser's session cookie to the API through `@spoar/client`; the browser itself only calls the sign-in and sign-out routes. Every change goes through a server action in `src/modules/admin/actions.ts`.
