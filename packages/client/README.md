# @spoar/client

The typed client for the v2 analytics API. One chainable scope per project, one method per read route, and the admin routes under their own namespaces. Every call resolves to a `Result` and never throws.

## Install

```sh
bun add @spoar/client@next
```

## Quick start

```ts
import { createClient } from "@spoar/client";

const api = createClient({
  endpoint: "https://api.analytics.remcostoeten.nl",
  token: process.env.RA_READ_TOKEN,
  projects: ["skriuw", "dora"],
});

const nl = api.skriuw.period("7d").human().where({ country: "NL" });

const [stats, pages, series] = await Promise.all([
  nl.stats(),
  nl.breakdown("page", { metrics: ["visitors", "bounce_rate"], limit: 50 }),
  nl.timeseries("visitors", { compare: "previous" }),
]);

if (!pages.ok) console.error(pages.error.code, pages.error.message);
else console.table(pages.value.data);
```

## Scopes

The client itself is the combined scope over every project the caller may read, on the routes under `/v2`. `api.project("skriuw")`, or `api.skriuw` for a name passed in `projects`, is the scope over one project under `/v2/projects/skriuw`. A project named like a client method is still reachable through `project()`.

Links return a new scope and leave the old one untouched, so one scope can feed many reads.

| Link | Sets |
| --- | --- |
| `period("24h" \| "7d" \| "30d" \| "90d" \| "12mo" \| "all")` | `period`, clearing an explicit range |
| `between(from, to)` | `from` and `to`, as `Date` or ISO 8601 strings, clearing `period` |
| `traffic("human" \| "bots" \| "internal" \| "all")`, `human()` | `traffic` |
| `environment("production" \| "preview" \| "all")` | `environment` |
| `where({ country: "NL", page: "!/admin" })` | one `filter[<dimension>]` per key; a leading `!` excludes |
| `exclude({ page: "/admin" })` | the same filters, negated |
| `apply(options)` | a plain options object, for URL state |
| `toQuery()` | the exact query string the API receives |

Dimensions are the registry names (`page`, `route`, `referrer_domain`, `country`, `browser`, `device`, `utm_source`, `event`, `release`, ...) plus `prop:<key>`, `trait:<key>` and `group:<type>`. On the combined scope `project` is a dimension too. Metrics are `visitors`, `sessions`, `pageviews`, `events`, `bounce_rate`, `session_duration`, `pages_per_session`, `time_on_page`, `scroll_depth`, `conversion_rate`, and `sum:prop.<key>` or `avg:prop.<key>` over a numeric prop. All of them are literal types, so a typo fails the typecheck.

## Reads

Every terminal is named after its route and takes only that route's own options; the scope supplies the rest.

| Method | Route |
| --- | --- |
| `stats()` | `stats` |
| `timeseries(metric, { interval, compare })` | `timeseries` |
| `breakdown(dimension, { metrics, limit, cursor })` | `breakdown/:dimension` |
| `realtime({ include, limit })`, `realtimeEvents({ limit, after })` | `realtime`, `realtime/events` |
| `liveEvents({ signal })` | an async iterable over `realtime/events`, following the cursor |
| `liveVisitors({ everyMs, limit, signal })` | on a project, an async iterable over `realtime/visitors`, read every 5 seconds by default |
| `paths(page, { direction, limit, cursor })` | `paths` |
| `retention({ interval })`, `lifecycle({ interval })`, `stickiness()` | `retention`, `lifecycle`, `stickiness` |
| `heatmap({ metric, timezone })`, `map({ level, limit, cursor })` | `heatmap`, `map` |
| `speed(...)`, `speedTimeseries(...)`, `speedRoutes(...)`, `speedElements(...)` | `speed/*` |
| `issues({ status, limit, cursor })` | `issues` |
| `events({ name, limit, cursor })`, `visitors(...)`, `sessions(...)` | `events`, `visitors`, `sessions` |
| `query(sql, params)` | `query` |

A project scope adds `realtimeVisitors`, `realtimeSessions`, `overview`, `annotations`, `issue`, `issueEvents`, `updateIssue`, `errorRules`, `createErrorRule`, `removeErrorRule`, `visitor`, `visitorVisits`, `updateVisitor` and `sessionEvents`. The combined scope adds `projectBreakdown`, `people` and `person`.

`scope.download` has the list routes as files: `breakdown`, `paths`, `map`, `events`, `visitors`, `sessions`, and on a project `visitorVisits` and `sessionEvents`. Each takes `{ format: "csv" | "sql", limit }` and answers the file's text.

## Admin

`api.projects`, `api.tokens`, `api.alerts`, `api.annotations`, `api.sql` and `api.system` hold the routes that are not reads: project settings, keys and the owner-only `remove`, API tokens, alert targets and deliveries, annotations, saved queries with `explain`, `schema` and `history`, and `health`, `session`, `metrics` and `runJob`. `mail`, `webhook` and `discord` build alert targets.

## Auth and errors

Pass `token` for an `at_` API token, or `credentials: "include"` from a browser signed in to the dashboard. A public project needs neither. A `token` that is the empty string answers `NO_TOKEN` without a request, which is what an unset environment variable looks like.

Every method resolves to `{ ok: true, value }` or `{ ok: false, error }`. `error.code` is a code from the API's error catalog, or `NO_TOKEN`, `NETWORK`, `TIMEOUT`, `ABORTED`, `BAD_URL` or `BAD_RESPONSE` when no answer came back. `error.status`, `error.details` and `error.requestId` carry what the API sent.

## Example

[`examples/dashboard`](../../examples/dashboard) is a small React app on this client: stats, a timeseries chart, breakdowns, a country table and a live event stream for one project, each view from one scope method. `bun run --cwd examples/dashboard dev` serves it on port 3301.

## Development

```sh
bun run --cwd packages/client typecheck
bun run --cwd packages/client test
bun run --cwd packages/client build
```

Tests run against a fake `fetch` and assert the exact path and query of every method.

---

xxx, Remco Stoeten <small>MIT</small>
