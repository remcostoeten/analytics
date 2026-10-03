# apps/api

The v2 API on Elysia, deployed to Vercel with the Bun runtime. See `docs/v2/api-reference.md` for the routes and `docs/decisions/0016-elysia-on-vercel.md` for why Elysia.

## Routes so far

| Route | Does |
| --- | --- |
| `GET /`, `GET /v2` | Landing page: the health details, the repository's commits per day for the last year from GitHub (cached an hour), and every documented route by tag, read from the route definitions; HTML for browsers, the same data as JSON for any other `Accept`. Hidden from the OpenAPI document |
| `GET /v2/health` | `{ ok, version, time }` plus the runtime, a cold-start flag, the header the caller's IP came from, and which MaxMind files loaded |
| `POST /v2/events` | Ingest through the engine: `text/plain` or `application/json`, at most 60 KB and 50 events, `X-Project-Key` from an allowed origin or `Authorization: Bearer sk_...` |
| `GET /v2/openapi`, `/v2/openapi/json` | Interactive docs and the OpenAPI 3 document |
| `GET /v2/auth/session`, `/v2/auth/*` | The current session, role and `isAdmin`; every other path is Better Auth: GitHub sign-in, callback, sign-out, organization routes |
| `GET, POST /v2/projects`, `GET, PATCH /v2/projects/:project`, `POST /v2/projects/:project/keys` | Projects, with the access levels from the API reference; a private project answers 404 to callers who may not read it |
| `GET, POST /v2/tokens`, `DELETE /v2/tokens/:token` | API tokens for organization admins; a token's value is returned once and stored hashed |
| `GET /v2/projects/:project/stats`, `timeseries`, `breakdown/:dimension`, `realtime` | Aggregate reads with the shared `period`, `from`/`to`, `traffic` and `filter[...]` parameters; dimensions come from the engine's registry in `packages/engine/src/dimensions/`. `breakdown` pages with `limit` and `cursor` |
| `format=csv\|json\|sql` on every list and breakdown route | The whole list as one streamed download, up to 1 million rows; `Accept: text/csv` also gives CSV |
| `GET /v2/projects/:project/paths`, `retention`, `heatmap`, `map` | Page paths (`page`, `direction`), weekly or monthly retention cohorts, the weekday and hour heatmap in a `timezone`, and visitors per country, region or city with coordinates |
| `GET /v2/projects/:project/realtime/events` | The live feed through the engine's `RealtimeFeed` port: long-polls with `after` (25 s wait, a check every 2 s) or streams server-sent events for `Accept: text/event-stream`, resuming from `Last-Event-ID`. Visitor and session ids need `detail` access |
| `GET /v2/projects/:project/speed`, `speed/timeseries`, `speed/routes`, `speed/elements`, and the same under `/v2/speed` | Speed insights from `web_vitals`: the Real Experience Score and per-metric percentiles by `device` and `percentile`, per day, per route worst first, and the selectors behind slow values; values under 20 samples are null |
| `GET /v2/projects/:project/issues`, `issues/:issue`, `issues/:issue/events`, `PATCH issues/:issue`, `GET /v2/issues` | Error tracking: errors grouped into issues by fingerprint at ingest, with counts, visitors, releases and regressions; lists and events at the `detail` level, status changes for admins; `filter[issue]=iss_<id>` on any breakdown |
| `GET, POST /v2/projects/:project/error-rules`, `DELETE error-rules/:rule` | Admin error rules: ignore patterns on the message or stack, and mutes until a date or a count, listed as `mute_iss_<id>` |
| `GET, POST /v2/projects/:project/annotations`, `PATCH, DELETE annotations/:annotation` | Dated labels on the time series (release, post, content, incident, other): listed by overlap with the read range for anyone who may read the project, written by its admins. See `docs/v2/api-reference.md#annotations` |
| `POST /v2/admin/jobs/rollup?days=` | Cron-secret job: rolls `web_vitals` into `rollup_vitals` and drops raw speed rows past 30 days |
| `POST /v2/admin/jobs/alerts` | Cron-secret job: queues new issues and regressions for each project's alert targets and sends the due ones by mail, webhook or Discord, retrying failures by the retry policy |
| `GET, PUT /v2/projects/:project/alerts/targets`, `PUT, DELETE alerts/targets/:name`, `POST alerts/targets/:name/test`, `POST alerts/targets/:name/rotate`, `GET alerts/deliveries`, `GET /v2/admin/alerts/status` | Alerts for admins, present only when `alerts()` is in `analytics.config.ts`: a project's targets (`sync` replaces them all), a sample alert, a new webhook secret, the delivery history, and which channels are ready. See `docs/v2/alerts.md` |
| `POST /v2/admin/jobs/cleanup` | Cron-secret job: deletes events and sessions past each project's retention |
| `POST /v2/admin/jobs/crux` | Cron-secret job, weekly: compares each project's p75 with the Chrome UX Report and flags gaps over 25% |
| `GET /v2/admin/metrics` | Admins: ingest counters and bots over 24 hours, each job's last run, and the Chrome UX Report checks |
| `GET /v2/projects/:project/events`, `visitors`, `visitors/:visitor`, `visitors/:visitor/visits`, `sessions`, `sessions/:session/events`; `PATCH visitors/:visitor` | Visitor-level reads at the `detail` level, never cached publicly; events and session trails page with a time-ordered cursor, lists with an offset cursor. Admins mark a visitor internal with `{ "isInternal": true }` |
| `GET /v2/stats`, `timeseries`, `breakdown/:dimension`, `paths`, `retention`, `heatmap`, `map`, `realtime`, `realtime/events`, `events`, `visitors`, `sessions` | The same reads across every project the caller may read (visitor-level ones: every project whose visitor-level data they may see), narrowed with `filter[project]=a,b`; `breakdown/project` has one row per project. Only anonymous aggregate answers are cached publicly |
| `POST /v2/projects/:project/query`, `POST /v2/query`, `POST /v2/query/explain`, `GET /v2/query/schema`, `GET /v2/queries/history`, `/v2/queries` and `/v2/queries/:query` | The SQL console, with saved queries shared by everyone who may run SQL: one read-only `SELECT` or `WITH` against the views of migration 0024, as the `analytics_reader` role with a 10-second timeout and 10,000 rows, for owners, admins and analysts who list the project and `sql` tokens, while the project's `sqlEnabled` is on. `:from`, `:to` and `:project` are bound from `params`; every run is logged in `query_runs`. See `docs/v2/sql-reference.md` |
| `GET /v2/people`, `/v2/people/:userId` | Identified users linked across projects by `identify(userId)`; needs a signed-in member or a token |

Access is one route option, `{ access: "public" | "project" | "detail" | "admin" | "cron" }`, from `src/plugins/access.ts`; the rules are in `src/access/`. Only GitHub logins in `dashboard_users` can sign in, checked again on every request. The first to sign in owns the organization; later ones join as viewers of no projects. Events sent with an owner's or admin's session cookie are stored as internal traffic.

Every response carries `x-request-id`, and every error uses the envelope `{ error: { code, message, details?, requestId, docs } }` with the status from the contract's error catalog.

## Environment

| Variable | Needed | Does |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon Postgres, migrated with `bun run migrate` |
| `IP_HASH_SECRET` | Yes in production | At least 32 characters; production refuses to start without it (`openssl rand -hex 32`) |
| `DASHBOARD_ORIGIN` | No | The one origin that gets CORS with credentials, and Better Auth's trusted origin |
| `BETTER_AUTH_SECRET` | Yes in production | At least 32 characters; signs session cookies; production refuses to start without it |
| `API_URL` | Yes in production | The API's public URL, such as `https://api.analytics.remcostoeten.nl`, for the GitHub callback |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | For sign-in | The GitHub OAuth app, with callback `${API_URL}/v2/auth/callback/github` |
| `AUTH_COOKIE_DOMAIN` | In production | `.remcostoeten.nl`, so the dashboard and every tracked subdomain receive the session cookie |
| `CRON_SECRET` | For jobs | `Authorization: Bearer` value for `cron` routes |
| `PUBLIC_READ_LIMIT` | No | Anonymous reads per minute per daily IP hash; defaults to 120 |
| `QUERY_LIMIT` | No | SQL console queries per minute per user or token; defaults to 30 |
| `CLIENT_REPORT_LIMIT` | No | Dev widget client report requests per minute per project; defaults to 60 |
| `DOCS_BASE` | No | Base of the `docs` link in errors; defaults to `https://api.analytics.remcostoeten.nl/v2/openapi` |
| `INGEST_RATE_LIMIT` | No | Browser requests per minute per project and IP hash; defaults to 100 |
| `GEOIP_CITY_PATH`, `GEOIP_ASN_PATH` | No | Explicit MaxMind paths; otherwise `data/` from the build |
| `MAIL_URL` | For mail alerts | The SMTP server, `smtps://user:password@host:465` or `smtp://...:587` (`STARTTLS`); read by `analytics.config.ts` |
| `MAIL_FROM` | No | The sender of alert mail; defaults to `Analytics <remco@gmail.com>` |
| `CRUX_API_KEY` | For the crux job | A Google API key with the Chrome UX Report API enabled |
| `GITHUB_TOKEN` | No | A GitHub token with public repository read access; raises the commit history rate limit on the landing page from 60 to 5000 requests an hour |
| `INTERNAL_PROJECT_SECRET` | No | A project's secret key; the API records its own `INTERNAL` errors there |

## Commands

- `bun run dev` serves on port 3100.
- `bun run build` downloads the GeoLite2 City and ASN files into `data/`.
- `bun test` runs the integration tests through `app.handle` on PGlite, including a check that `openapi.json` matches the routes.
- `bun run openapi` writes the OpenAPI document to `openapi.json`; the docs site reads it and the `openapi` workflow fails a pull request that breaks it.
