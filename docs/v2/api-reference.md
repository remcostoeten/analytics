# API reference (draft)

Every route the v2 API will have, who may call it, and what comes back. This is the design the OpenAPI document will be generated from; the live, always-current version will be served at `/v2/openapi` once the API exists.

## Access levels

| Level | Who passes |
| --- | --- |
| `public` | Anyone |
| `project` | Anyone when the project is public; otherwise a signed-in member whose role lists the project, or an API token (any scope) that lists it |
| `detail` | An owner, admin or analyst who lists the project, or an API token that lists it; also anyone when the project is public **and** has `publicVisitorData` switched on. Viewers get aggregates only |
| `admin` | An owner's session, an admin's session for the projects their role lists, or an API token with `admin` scope for its projects. Organization-wide routes (creating projects, tokens) need an owner, or an admin or `admin` token that lists no projects |
| `ingest` | `X-Project-Key: pk_...` or `?key=pk_...` from an allowed Origin, or `Bearer sk_...`. The browser SDK uses `?key=` because `sendBeacon` cannot set headers and a custom header would trigger a CORS preflight |
| `cron` | `Bearer CRON_SECRET` |

A private project answers 404, not 403, to callers without access, so its name does not leak. A project the caller can read but not change or see in detail answers 401 when signed out and 403 otherwise. An unknown or expired `at_` token is 401, never treated as anonymous.

## Routes

| Method | Path | Access | What it does |
| --- | --- | --- | --- |
| POST | `/v2/events` | ingest | Accept 1 to 50 events |
| GET | `/v2/health` | public | Liveness and version |
| GET | `/v2/openapi` | public | Interactive docs (Scalar) |
| GET | `/v2/openapi/json` | public | OpenAPI 3 document |
| GET, POST | `/v2/auth/*` | public | GitHub sign-in, callback, sign-out, current session. Paths come from Better Auth |
| GET | `/v2/projects` | public | Public projects for anyone; all projects for admins, filterable with `visibility=public\|private` |
| POST | `/v2/projects` | admin | Create a project |
| GET | `/v2/projects/:project` | project | Name, domain, visibility, created date |
| PATCH | `/v2/projects/:project` | admin | Change name, `visibility`, `publicVisitorData`, `allowedOrigins`, `retentionDays` |
| POST | `/v2/projects/:project/keys` | admin | Rotate the public or secret key; the secret is returned once |
| GET | `/v2/projects/:project/stats` | project | Headline numbers with the previous period |
| GET | `/v2/projects/:project/timeseries` | project | One metric bucketed by hour or day |
| GET | `/v2/projects/:project/breakdown/:dimension` | project | Top values of one dimension |
| GET | `/v2/projects/:project/realtime` | project | Last 5 minutes |
| GET | `/v2/projects/:project/events` | detail | Raw events, newest first |
| GET | `/v2/projects/:project/visitors` | detail | Visitor list |
| GET | `/v2/projects/:project/visitors/:visitor` | detail | One visitor with traits and history summary |
| PATCH | `/v2/projects/:project/visitors/:visitor` | admin | Mark as internal traffic |
| GET | `/v2/projects/:project/sessions/:session/events` | detail | Every event in one session |
| GET | `/v2/projects/:project/annotations` | project | Annotations that overlap the range, by date, paged |
| POST | `/v2/projects/:project/annotations` | admin | Add an annotation |
| PATCH, DELETE | `/v2/projects/:project/annotations/:annotation` | admin | Change or delete one annotation |
| GET, POST | `/v2/tokens` | admin | List and create API tokens |
| DELETE | `/v2/tokens/:token` | admin | Revoke a token |
| GET | `/v2/admin/metrics` | admin | Ingest counters and job history |
| POST | `/v2/admin/jobs/:job` | cron | Run `rollup`, `cleanup`, `alerts` or `crux`; each run is recorded in the job history |
| GET, PUT | `/v2/projects/:project/alerts/targets` | admin | The project's alert targets; `PUT` replaces them all (`sync`). Only with `alerts()` in the config |
| PUT, DELETE | `/v2/projects/:project/alerts/targets/:name` | admin | Create, replace or remove one target |
| POST | `/v2/projects/:project/alerts/targets/:name/test` | admin | Send a sample alert now |
| POST | `/v2/projects/:project/alerts/targets/:name/rotate` | admin | A new webhook signing secret, shown once |
| GET | `/v2/projects/:project/alerts/deliveries` | admin | Delivery history, `status` filter, paged |
| GET | `/v2/admin/alerts/status` | admin | Enabled channels, the mail transport without secrets, pending count, failing targets |

## Shared query parameters

| Parameter | Values | Default |
| --- | --- | --- |
| `from`, `to` | ISO 8601 timestamps | last 30 days |
| `period` | `24h`, `7d`, `30d`, `90d`, `12mo`, `all`; ignored when `from` and `to` are set | `30d` |
| `traffic` | `human` (bot score under 50, no internal or localhost), `all` | `human` |
| `environment` | `production` (no preview deployments), `preview` (preview deployments only), `all` | `production` |
| `filter[<dimension>]` | a value, or `!value` to exclude; repeatable across dimensions | none |
| `limit`, `cursor` | up to 100; opaque cursor from the previous page | 20 |

Dimensions for `breakdown` and `filter`: `host`, `page`, `route`, `entry_page`, `exit_page`, `referrer`, `referrer_domain`, `channel`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `country`, `region`, `city`, `continent`, `timezone`, `device`, `browser`, `browser_version`, `os`, `os_version`, `screen`, `viewport`, `language`, `connection`, `visitor_type` (new or returning), `event`, `bot_reason`, `release`, plus `prop:<key>` for any event prop, `trait:<key>` for any visitor trait and `group:<type>` for the group of that type an event was sent in (the SDK's `groups` plugin).

Metrics, for `timeseries` and the `metrics=` list on `breakdown` (default `visitors,pageviews`): `visitors`, `sessions`, `pageviews`, `events`, `bounce_rate`, `session_duration`, `time_on_page`, `scroll_depth`, `pages_per_session`, `conversion_rate` (share of sessions with the event in `filter[event]`; with this metric that filter defines the conversion instead of narrowing the rows, and a request without it answers `400`), plus `sum:prop.<key>` and `avg:prop.<key>` for numeric props such as revenue. `timeseries` also takes `compare=previous` to return the previous period alongside.

Every list or breakdown route also answers `Accept: text/csv` with the same rows as CSV.

An unknown dimension answers `400 VALIDATION_FAILED`, in the `breakdown/:dimension` path and in `filter[<dimension>]` alike.

Events the server SDK sends without a visitor or session share the id `server`. They count in `pageviews`, `events` and every breakdown of events, but never as a visitor or a session: `visitors`, `sessions`, `bounce_rate`, `session_duration`, `pages_per_session`, `conversion_rate`, `paths`, `retention`, `lifecycle`, `stickiness`, the map's visitors and the visitor, session and people lists leave them out.

## Coverage check

Everything the dashboard should be able to show, mapped to the route that answers it. The first table is covered by the routes above; the second lists routes added by this check.

| You want to see | Answered by |
| --- | --- |
| Traffic per site or origin | `filter[host]=...`, `breakdown/host` |
| Browser, OS, device, screen, viewport, language, connection | `breakdown/<dimension>` and `filter[...]` |
| Country, region, city | `breakdown/country`, `region`, `city`, and the new `/map` |
| When people visit | `timeseries` by hour, day, week or month, with `compare=previous` |
| How long they stay on a page | `breakdown/page?metrics=visitors,time_on_page,scroll_depth,bounce_rate` |
| How they arrived | `breakdown/referrer_domain`, `channel`, `utm_*` |
| Where they entered and left | `breakdown/entry_page`, `breakdown/exit_page` |
| One visitor in full | `visitors` (search, sort, filters) then `visitors/:visitor`, their sessions, then `sessions/:session/events` |
| Custom events and their props: revenue, searches, experiments, clicks, forms | `breakdown/event`, `breakdown/prop:<key>` with `filter[event]=...` and `metrics=sum:prop.revenue` |
| Signed-in users by trait, such as plan | `filter[trait:plan]=pro`, `breakdown/trait:plan` |
| Bots, and why they were flagged | `traffic=bots`, `breakdown/bot_reason` |
| Speed and errors | `/speed/*`, `/issues/*` |
| Export | `Accept: text/csv` on any list |

Added routes, all under `/v2/projects/:project` with the shared query parameters:

| Method | Path | Access | Returns |
| --- | --- | --- | --- |
| GET | `/sessions` | detail | All sessions, newest first, with duration, pages, entry, exit, source, geo and device; filter and sort like visitors |
| GET | `/paths?page=/pricing` | project | The pages visitors went to next from a page, or came from with `direction=previous`, with counts and drop-off |
| GET | `/retention?interval=week` | project | Cohorts by first visit week or month and the share returning in each later period |
| GET | `/lifecycle?interval=week` | project | Visitors per day, week or month split into new, returning, resurrected and dormant |
| GET | `/stickiness` | project | How many visitors were active on 1, 2, 3 and more days in the range |
| GET | `/heatmap` | project | Visitors or pageviews by weekday and hour of day, in the project's or a given timezone |
| GET | `/map?level=city` | project | Visitor counts per country, region or city with coordinates for a map |
| GET | `/realtime/events` | project | Incoming events for the live view, with the same filters: long-polling with `after`, or server-sent events with `Accept: text/event-stream`. Visitor and session ids need `detail` |

### Paths, retention, lifecycle, stickiness, heatmap and map

All six take the shared range, traffic and filter parameters, and answer without the project prefix across every project you may read.

- `paths` follows the pageviews of `page` inside each session: `direction=next` (default) gives the page viewed right after it, `previous` the one right before. `dropOff` counts the views that ended the session, or for `previous`, started it. Shares are of `views`. `page` is the query parameter because `from` is the range start.
- `retention` groups visitors by the `week` (default, Monday start, UTC) or `month` of their first visit in the range, and counts how many were active in each later period up to the end of the range. Offset 0 is the cohort itself.
- `lifecycle` splits each `day`, `week` (default, Monday start, UTC) or `month` of the range: `new` visitors were first seen ever in that period, `returning` ones were also active in the period before, `resurrected` ones were seen before but not in the period before, and `dormant` ones were active in the period before and not in this one. The period before the range counts for the first period.
- `stickiness` counts visitors by the number of distinct UTC days they were active in the range, from 1 to the most any visitor reached, with each count's share and the average.
- `heatmap` has all 168 cells, weekday 1 (Monday) to 7 and hour 0 to 23, counting `metric=visitors` (default) or `pageviews` in `timezone` (IANA, default UTC).
- `map` counts visitors per `level=country` (default), `region` or `city`, with the average of their geo lookup coordinates rounded to two decimals, paged like a breakdown.

`GET /v2/projects/remcostoeten.nl/paths?page=/pricing&period=28d`

```json
200 OK
{
  "data": [
    {
      "path": "/signup",
      "count": 38,
      "share": 0.304
    },
    {
      "path": "/docs",
      "count": 21,
      "share": 0.168
    },
    {
      "path": "/",
      "count": 9,
      "share": 0.072
    }
  ],
  "page": "/pricing",
  "direction": "next",
  "views": 125,
  "dropOff": {
    "count": 57,
    "share": 0.456
  },
  "total": 3,
  "nextCursor": null,
  "range": {
    "from": "2026-08-31T00:00:00.000Z",
    "to": "2026-09-28T00:00:00.000Z"
  },
  "traffic": "human",
  "environment": "production",
  "filters": {}
}
```

`GET /v2/projects/remcostoeten.nl/lifecycle?interval=week&period=28d`

```json
200 OK
{
  "data": [
    { "period": "2026-08-31T00:00:00.000Z", "new": 84, "returning": 12, "resurrected": 5, "dormant": 30 },
    { "period": "2026-09-07T00:00:00.000Z", "new": 120, "returning": 22, "resurrected": 9, "dormant": 79 },
    { "period": "2026-09-14T00:00:00.000Z", "new": 97, "returning": 31, "resurrected": 11, "dormant": 120 },
    { "period": "2026-09-21T00:00:00.000Z", "new": 110, "returning": 26, "resurrected": 8, "dormant": 113 }
  ],
  "interval": "week",
  "range": { "from": "2026-08-31T00:00:00.000Z", "to": "2026-09-28T00:00:00.000Z" },
  "traffic": "human",
  "environment": "production",
  "filters": {}
}
```

`GET /v2/projects/remcostoeten.nl/stickiness?period=28d`

```json
200 OK
{
  "data": [
    { "days": 1, "visitors": 402, "share": 0.812 },
    { "days": 2, "visitors": 61, "share": 0.123 },
    { "days": 3, "visitors": 19, "share": 0.038 },
    { "days": 4, "visitors": 13, "share": 0.026 }
  ],
  "visitors": 495,
  "averageDays": 1.28,
  "range": { "from": "2026-08-31T00:00:00.000Z", "to": "2026-09-28T00:00:00.000Z" },
  "traffic": "human",
  "environment": "production",
  "filters": {}
}
```

`GET /v2/projects/remcostoeten.nl/retention?interval=week&period=28d`

```json
200 OK
{
  "data": [
    {
      "cohort": "2026-09-07T00:00:00.000Z",
      "visitors": 120,
      "periods": [
        {
          "offset": 0,
          "visitors": 120,
          "share": 1
        },
        {
          "offset": 1,
          "visitors": 22,
          "share": 0.183
        },
        {
          "offset": 2,
          "visitors": 14,
          "share": 0.117
        },
        {
          "offset": 3,
          "visitors": 9,
          "share": 0.075
        }
      ]
    },
    {
      "cohort": "2026-09-14T00:00:00.000Z",
      "visitors": 96,
      "periods": [
        {
          "offset": 0,
          "visitors": 96,
          "share": 1
        },
        {
          "offset": 1,
          "visitors": 17,
          "share": 0.177
        },
        {
          "offset": 2,
          "visitors": 10,
          "share": 0.104
        }
      ]
    }
  ],
  "interval": "week",
  "range": {
    "from": "2026-08-31T00:00:00.000Z",
    "to": "2026-09-28T00:00:00.000Z"
  },
  "traffic": "human",
  "environment": "production",
  "filters": {}
}
```

`GET /v2/projects/remcostoeten.nl/heatmap?timezone=Europe/Amsterdam&period=28d` (three of the 168 cells shown)

```json
200 OK
{
  "data": [
    {
      "weekday": 1,
      "hour": 0,
      "value": 0
    },
    {
      "weekday": 1,
      "hour": 9,
      "value": 14
    },
    {
      "weekday": 1,
      "hour": 10,
      "value": 21
    }
  ],
  "metric": "visitors",
  "timezone": "Europe/Amsterdam",
  "range": {
    "from": "2026-08-31T00:00:00.000Z",
    "to": "2026-09-28T00:00:00.000Z"
  },
  "traffic": "human",
  "environment": "production",
  "filters": {}
}
```

`GET /v2/projects/remcostoeten.nl/map?level=city&limit=2&period=28d`

```json
200 OK
{
  "data": [
    {
      "country": "NL",
      "region": "Noord-Holland",
      "city": "Amsterdam",
      "latitude": 52.37,
      "longitude": 4.9,
      "visitors": 64,
      "share": 0.213
    },
    {
      "country": "US",
      "region": "California",
      "city": "San Francisco",
      "latitude": 37.77,
      "longitude": -122.42,
      "visitors": 31,
      "share": 0.103
    }
  ],
  "level": "city",
  "total": 142,
  "nextCursor": "eyJvIjoyfQ",
  "range": {
    "from": "2026-08-31T00:00:00.000Z",
    "to": "2026-09-28T00:00:00.000Z"
  },
  "traffic": "human",
  "environment": "production",
  "filters": {}
}
```

### Live events

`GET /v2/projects/:project/realtime/events` without `after` answers at once with the events received in the last five minutes (up to `limit`, default 50). With `after=<nextCursor>` it answers as soon as newer events arrive, or with an empty page and the same cursor after 25 seconds, checking every 2 seconds. Events are ordered by when the API received them. `traffic` and `filter[...]` apply as on every read; `visitor` and `session` appear only with `detail` access.

With `Accept: text/event-stream` the same route streams the pages as server-sent events: one `events` message per batch with the cursor as its `id`, a comment when a wait ends empty, and an `error` message if a read fails. The stream closes after about 55 seconds and the browser reconnects with `Last-Event-ID`, carrying on from the last batch.

`GET /v2/projects/remcostoeten.nl/realtime/events?after=eyJy...` with an admin token

```json
200 OK
{
  "data": [
    {
      "id": "48213",
      "project": "remcostoeten.nl",
      "name": "pageview",
      "ts": "2026-09-27T16:39:58.412Z",
      "path": "/blog/rebuilding-analytics",
      "country": "NL",
      "device": "desktop",
      "visitor": "8c4e1f0a-2b3c-4d5e-8f60-718293a4b5c6",
      "session": "f1a2b3c4-d5e6-4f70-8a91-b2c3d4e5f607"
    },
    {
      "id": "48214",
      "project": "remcostoeten.nl",
      "name": "signup",
      "ts": "2026-09-27T16:39:59.901Z",
      "path": "/blog/rebuilding-analytics",
      "country": "NL",
      "device": "desktop",
      "visitor": "8c4e1f0a-2b3c-4d5e-8f60-718293a4b5c6",
      "session": "f1a2b3c4-d5e6-4f70-8a91-b2c3d4e5f607"
    }
  ],
  "nextCursor": "eyJyIjoiMjAyNi0wOS0yNyAxNjo0MDowMC4xMjM0NTYrMDAiLCJpIjoiNDgyMTQifQ"
}
```

### Returning visitors in detail

Each visitor's full visit history, so you can see how often someone comes back, when, and what they did each time. Clicks appear only on sites that enable the `clicks` plugin.

| Method | Path | Access | Returns |
| --- | --- | --- | --- |
| GET | `/visitors/:visitor/visits` | detail | Every visit, oldest first: visit number (1st, 2nd, 3rd...), start and end time, time since the previous visit, entry URL, referrer and channel, each page viewed with time on page, each click and custom event, exit page |

The visitor detail gains `visitCount`, `firstSeen`, `lastSeen`, `daysActive`, `medianDaysBetweenVisits` and `returnedWithin` (1, 7 and 30 days). Two more dimensions make this reportable across all visitors: `visit_number` (1, 2, 3, 4 to 10, 11+) and `days_since_previous_visit` (same day, 1, 2 to 7, 8 to 30, 31+).

`GET /v2/projects/remcostoeten.nl/visitors/8c4e1f0a-2b3c-4d5e-8f60-718293a4b5c6/visits?limit=1`

```json
200 OK
{
  "data": [
    {
      "visitNumber": 6,
      "sessionId": "f1a2b3c4-d5e6-4f70-8a91-b2c3d4e5f607",
      "startedAt": "2026-09-27T16:38:10.000Z",
      "endedAt": "2026-09-27T16:40:00.000Z",
      "sincePreviousVisitMs": 172800000,
      "entryUrl": "https://remcostoeten.nl/",
      "exitPath": "/blog/rebuilding-analytics",
      "source": { "referrerDomain": "news.ycombinator.com", "channel": "social", "utm": { "source": "hn" } },
      "pages": [
        { "path": "/", "at": "2026-09-27T16:38:10.000Z", "timeOnPageMs": 52000, "scrollDepth": 0.6 },
        { "path": "/projects", "at": "2026-09-27T16:39:02.000Z", "timeOnPageMs": 56000, "scrollDepth": 0.9 },
        { "path": "/blog/rebuilding-analytics", "at": "2026-09-27T16:39:58.412Z", "timeOnPageMs": 1588, "scrollDepth": 0.1 }
      ],
      "actions": [
        { "at": "2026-09-27T16:39:01.200Z", "name": "click", "props": { "element": "nav-projects" } },
        { "at": "2026-09-27T16:39:59.901Z", "name": "signup", "props": { "plan": "pro" } }
      ]
    }
  ],
  "nextCursor": "eyJvIjoxfQ"
}
```

### Export and SQL

Every list and breakdown route (`breakdown`, `paths`, `map`, `events`, `visitors`, `visits`, `sessions`, a session's events and `people`, per project and across projects) returns other formats on request, with the same filters and without the page limit (up to 1 million rows, read 1,000 at a time and streamed as a download):

| Ask for | You get |
| --- | --- |
| `Accept: text/csv` or `?format=csv` | CSV with a header row |
| `?format=json` | The normal response, all pages at once |
| `?format=sql` | A `.sql` file with a `CREATE TABLE` and `INSERT` statements, ready to load into any Postgres or SQLite |

Nested fields become dotted columns (`page.path`, `geo.country`), columns come from the first 1,000 rows, and column types in the `.sql` file are inferred from them (`bigint`, `double precision`, `boolean`, else `text`). An error on the first page answers as usual; one on a later page ends the file (JSON gains an `error` field, SQL a closing comment). Past 1 million rows JSON gains `"truncated": true` and SQL a closing comment.

For questions no route answers, owners, admins and analysts, and tokens with the `sql` scope, get read-only SQL on the projects they list, while each project's `sqlEnabled` switch is on (the owner is exempt):

| Method | Path | Access | Returns |
| --- | --- | --- | --- |
| POST | `/v2/projects/:project/query` | SQL | Runs one `SELECT` against documented views (`events`, `sessions`, `visitors`, `web_vitals`, `issues`) already limited to that project, as a read-only database role, with a 10-second timeout and 10,000 rows; results as JSON or CSV |

```json
request
{ "sql": "select route, count(*) as views from events where name = 'pageview' and ts >= :from group by 1 order by 2 desc limit 5", "params": { "from": "2026-09-20T00:00:00.000Z" } }

200 OK
{ "columns": ["route", "views"], "rows": [["/", 1011], ["/blog/[slug]", 530]], "rowCount": 2, "truncated": false, "durationMs": 41 }
```

The SQL console, complete:

| Method | Path | Returns |
| --- | --- | --- |
| POST | `/v2/query` | The same, across every project you may run SQL on, with `project_id` as a column |
| GET | `/v2/query/schema` | Every queryable view with its columns, types and a one-line description, for autocomplete and a schema sidebar |
| POST | `/v2/query/explain` | Postgres' cost estimate for a query, so the console can warn before running something heavy |
| GET, POST | `/v2/queries` | Saved queries: name, SQL, description, and optionally a chart type (`table`, `line` or `bar`) so a query can become a dashboard panel. Shared by everyone who may run SQL; the SQL passes the same checks as a run when saved |
| GET, PATCH, DELETE | `/v2/queries/:query` | One saved query; only its creator or the owner may change or delete it |
| GET | `/v2/queries/history` | Your last 100 runs with duration, row count and whether they were blocked; the owner sees everyone's |

- **Parameters, not string building**: a query can use `:from`, `:to` and `:project`, sent in `params` from the dashboard's date range and project switcher and passed to Postgres as bound parameters.
- **Errors**: a query the parser rejects, or one Postgres fails (a syntax error, an unknown column, the timeout), answers `400 VALIDATION_FAILED` with the reason; `429` past 30 queries a minute. Every run, blocked or not, is logged.
- **Safety in layers**: a SQL parser accepts only a single `SELECT` or `WITH`; the query runs in a read-only transaction as a database role that can see only the analytics views, never the auth, token or project-secret tables; 10-second statement timeout, 10,000-row cap, and a per-admin rate limit.
- **Results**: table, CSV or JSON download, and a quick line or bar chart built from the result in the browser.
- **Views instead of raw tables**: `events`, `pageviews`, `sessions`, `visitors`, `people`, `web_vitals`, `issues`, `daily` and `daily_vitals`, with stable column names, so a table change in a later migration does not break saved queries.

### All projects combined

Every read route also exists without the `/projects/:project` prefix. Without it, the route covers every project the caller may read: all projects for an admin, only public ones for anyone else. `project` becomes a dimension and a filter, so the dashboard can show everything at once, then narrow to one or a few projects without changing routes.

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/v2/stats`, `/v2/timeseries`, `/v2/breakdown/:dimension`, `/v2/realtime`, `/v2/speed`, `/v2/issues`, and the rest | The same responses as the per-project routes, summed across projects |
| GET | `/v2/breakdown/project` | One row per project: visitors, pageviews, change against the previous period, speed score, open issues, visibility |
| GET | `/v2/visitors`, `/v2/sessions`, `/v2/events` | Rows from every readable project, each with its `projectId` and `host` |
| GET | `/v2/people` | Signed-in people across projects, one row per `userId` |
| GET | `/v2/people/:userId` | That person across every project: which project they first came in through, when, from where, and every visit in every project in time order |

- `filter[project]=remcostoeten.nl,skriuw` narrows any combined route to a set of projects.
- Combined visitor counts are the sum of each project's visitors. Anonymous visitors cannot be matched across different domains without cookies or fingerprinting, which v2 does not do, so one person visiting two of your sites counts twice.
- Signed-in people are the exception: when a site calls `identify(userId)`, visitors with the same `userId` are linked across projects. `/v2/people` is where "which project did they come in from" is answered, as `firstProject` and `firstSource`.
- Subdomains of one site (`remcostoeten.nl` and `docs.remcostoeten.nl`) are best set up as one project with several hosts, so a visitor moving between them is one visitor; `breakdown/host` still separates them.

`GET /v2/breakdown/project?period=7d` has a row per project with traffic in the range. `change` holds each metric's change against the previous range of the same length, null when it was zero. `speedScore` is the Real Experience Score over the range on all devices at p75, null under 20 samples. `openIssues` is null for projects whose visitor-level data the caller may not see. `metrics=` works as on any breakdown.

```json
200 OK
{
  "data": [
    {
      "value": "remcostoeten.nl",
      "visitors": 1840,
      "pageviews": 5210,
      "share": 0.72,
      "name": "remcostoeten.nl",
      "visibility": "public",
      "change": { "visitors": 0.124, "pageviews": -0.031 },
      "speedScore": 94,
      "openIssues": 3
    },
    {
      "value": "skriuw",
      "visitors": 712,
      "pageviews": 3380,
      "share": 0.28,
      "name": "Skriuw",
      "visibility": "private",
      "change": { "visitors": null, "pageviews": null },
      "speedScore": null,
      "openIssues": 0
    }
  ],
  "dimension": "project",
  "total": 2,
  "nextCursor": null,
  "previousRange": { "from": "2026-09-14T00:00:00.000Z", "to": "2026-09-21T00:00:00.000Z" },
  "range": { "from": "2026-09-21T00:00:00.000Z", "to": "2026-09-28T00:00:00.000Z" },
  "traffic": "human",
  "environment": "production",
  "filters": {}
}
```

`GET /v2/people/user_123`

```json
200 OK
{
  "data": {
    "userId": "user_123",
    "traits": { "plan": "pro" },
    "firstSeen": "2026-09-02T08:11:00.000Z",
    "firstProject": "remcostoeten.nl",
    "firstSource": { "referrerDomain": "news.ycombinator.com", "channel": "social" },
    "projects": [
      { "projectId": "remcostoeten.nl", "visitorId": "8c4e1f0a-2b3c-4d5e-8f60-718293a4b5c6", "firstSeen": "2026-09-02T08:11:00.000Z", "visits": 6 },
      { "projectId": "skriuw", "visitorId": "77d0c2e1-9a4b-4f10-8c2d-1e5f6a7b8c9d", "firstSeen": "2026-09-14T19:40:00.000Z", "visits": 4 }
    ],
    "visits": [
      { "projectId": "skriuw", "visitNumber": 4, "startedAt": "2026-09-26T21:02:00.000Z", "entryUrl": "https://skriuw.app/notes", "pages": 7 },
      { "projectId": "remcostoeten.nl", "visitNumber": 6, "startedAt": "2026-09-27T16:38:10.000Z", "entryUrl": "https://remcostoeten.nl/", "pages": 3 }
    ]
  }
}
```

Annotations are built (API and admin SDK; the dashboard draws them later). Still missing after this check, all planned as later epics: Search Console, saved segments and email reports. They fit the same model. Goals, funnels, actions and experiment statistics are not planned; see Product focus in [plan.md](plan.md#product-focus).

## Full examples

One request and its complete response for every route. Field names are camelCase, timestamps are ISO 8601 in UTC, ratios run from 0 to 1, durations are milliseconds. The numbers are made up.

### Ingest

`POST /v2/events` from a browser

```http
POST /v2/events HTTP/1.1
Host: api.analytics.remcostoeten.nl
Origin: https://remcostoeten.nl
Content-Type: text/plain;charset=UTF-8
X-Project-Key: pk_live_3f9c2a7d

{"v":1,"sentAt":"2026-09-27T16:40:00.120Z","events":[{"id":"01928c3e-7a4b-7c1d-9f00-2b7c1e5d8a11","name":"pageview","ts":"2026-09-27T16:39:58.412Z","visitor":"8c4e1f0a-2b3c-4d5e-8f60-718293a4b5c6","session":"f1a2b3c4-d5e6-4f70-8a91-b2c3d4e5f607","page":{"path":"/blog/rebuilding-analytics","referrer":"https://news.ycombinator.com/","title":"Rebuilding analytics"},"props":{},"context":{"screen":"1440x900","viewport":"1280x720","tz":"Europe/Amsterdam","lang":"nl-NL","utm":{"source":"hn"}},"signals":0},{"id":"01928c3e-7a4c-7a02-8b11-3c8d2f6e9b22","name":"signup","ts":"2026-09-27T16:39:59.901Z","visitor":"8c4e1f0a-2b3c-4d5e-8f60-718293a4b5c6","session":"f1a2b3c4-d5e6-4f70-8a91-b2c3d4e5f607","page":{"path":"/blog/rebuilding-analytics"},"props":{"plan":"pro"},"signals":0}]}
```

```json
202 Accepted
{
  "accepted": 2,
  "duplicates": 0,
  "rejected": []
}
```

The same batch sent again returns `{ "accepted": 0, "duplicates": 2, "rejected": [] }`. An event with a bad field is reported by index while the rest are stored. Props follow the same limits the SDK applies: at most 25 flat string, number, boolean or null values, keys up to 255 characters, string values up to 255 characters, except `stack` and `breadcrumbs` on `error` events, which may be up to 2048. An event outside them is rejected with `VALIDATION_FAILED`:

```json
202 Accepted
{
  "accepted": 1,
  "duplicates": 0,
  "rejected": [
    { "index": 1, "code": "VALIDATION_FAILED", "message": "events[1].name must be 1 to 64 characters" }
  ]
}
```

Wrong origin for the key:

```json
403 Forbidden
{ "error": { "code": "FORBIDDEN_ORIGIN", "message": "Origin https://example.com is not allowed for this project" } }
```

Too many requests:

```json
429 Too Many Requests
Retry-After: 30
{ "error": { "code": "RATE_LIMITED", "message": "Too many requests", "details": { "retryAfterSeconds": 30 } } }
```

Browser requests are limited to 100 per minute per project and daily IP hash. A request with the secret key (`Authorization: Bearer sk_...`) is not rate-limited, may come from any origin, and is the only kind whose forwarded visitor details are used: `context.ip` and `context.ua` on an event, or the `X-Visitor-IP` and `X-Visitor-UA` headers a same-origin proxy adds. When a secret-key request forwards neither, the event has no IP and no user agent: the connection's own belong to the calling server, so they are not used for the IP hash, location, network or bot signals, and the edge location headers are skipped too. A missing IP or user agent on a secret-key request adds no bot weight. Without the secret key the IP comes from `cf-connecting-ip`, then `x-real-ip`, then the first `x-forwarded-for` entry, and the user agent from `User-Agent`.

### Health and docs

`GET /v2/health`

```json
200 OK
{ "ok": true, "version": "2.0.0", "time": "2026-09-27T16:40:01.004Z" }
```

`GET /v2/openapi/json` returns the OpenAPI 3 document; `GET /v2/openapi` returns the interactive HTML page.

### Sign-in

`GET /v2/auth/session` while signed in

```json
200 OK
{
  "user": { "id": "usr_01J8Z3", "login": "remcostoeten", "name": "Remco Stoeten", "avatarUrl": "https://avatars.githubusercontent.com/u/57683378" },
  "session": { "expiresAt": "2026-10-27T16:40:01.000Z" },
  "role": "owner",
  "isAdmin": true
}
```

Signed out:

```json
200 OK
{ "user": null, "session": null, "role": null, "isAdmin": false }
```

Sign-in starts at the Better Auth GitHub route and ends in a `302` back to the dashboard with a `Set-Cookie` header; sign-out is a `POST` that clears it. Both are browser redirects, not JSON.

### Projects

`GET /v2/projects` signed out

```json
200 OK
{
  "data": [
    { "id": "remcostoeten.nl", "name": "remcostoeten.nl", "domain": "remcostoeten.nl", "visibility": "public", "createdAt": "2025-03-02T10:14:00.000Z" },
    { "id": "skriuw", "name": "Skriuw", "domain": "skriuw.app", "visibility": "public", "createdAt": "2025-06-18T08:02:00.000Z" }
  ],
  "nextCursor": null
}
```

`GET /v2/projects?visibility=private` as admin

```json
200 OK
{
  "data": [
    {
      "id": "client-portal",
      "name": "Client portal",
      "domain": "portal.example.nl",
      "visibility": "private",
      "publicVisitorData": false,
      "allowedOrigins": ["https://portal.example.nl"],
      "retentionDays": 90,
      "publicKey": "pk_live_a81d44e0",
      "createdAt": "2026-01-11T09:30:00.000Z",
      "updatedAt": "2026-08-02T12:00:00.000Z"
    }
  ],
  "nextCursor": null
}
```

`POST /v2/projects` as admin

```json
request
{ "id": "docs", "name": "Docs", "domain": "docs.remcostoeten.nl", "visibility": "public", "allowedOrigins": ["https://docs.remcostoeten.nl"] }

201 Created
{
  "data": {
    "id": "docs",
    "name": "Docs",
    "domain": "docs.remcostoeten.nl",
    "visibility": "public",
    "publicVisitorData": false,
    "allowedOrigins": ["https://docs.remcostoeten.nl"],
    "retentionDays": 90,
    "publicKey": "pk_live_c07b19e2",
    "secretKey": "sk_live_5d0e7c1f9a2b4c6d8e0f",
    "createdAt": "2026-09-27T16:41:00.000Z",
    "updatedAt": "2026-09-27T16:41:00.000Z"
  }
}
```

`secretKey` appears only in this response and in key rotation; the API stores its hash.

`GET /v2/projects/remcostoeten.nl` signed out

```json
200 OK
{ "data": { "id": "remcostoeten.nl", "name": "remcostoeten.nl", "domain": "remcostoeten.nl", "visibility": "public", "createdAt": "2025-03-02T10:14:00.000Z" } }
```

`GET /v2/projects/client-portal` signed out

```json
404 Not Found
{ "error": { "code": "NOT_FOUND", "message": "Project not found" } }
```

`PATCH /v2/projects/client-portal` as admin

```json
request
{ "visibility": "public", "retentionDays": 180 }

200 OK
{ "data": { "id": "client-portal", "visibility": "public", "publicVisitorData": false, "retentionDays": 180, "updatedAt": "2026-09-27T16:42:00.000Z" } }
```

`POST /v2/projects/docs/keys` as admin

```json
request
{ "kind": "secret" }

200 OK
{ "data": { "kind": "secret", "key": "sk_live_9b8a7f6e5d4c3b2a1f0e", "rotatedAt": "2026-09-27T16:43:00.000Z" } }
```

### Aggregate reads

`GET /v2/projects/remcostoeten.nl/stats?period=7d`

```json
200 OK
{
  "data": {
    "visitors": { "value": 1204, "previous": 1011, "change": 0.191 },
    "sessions": { "value": 1530, "previous": 1290, "change": 0.186 },
    "pageviews": { "value": 3822, "previous": 3105, "change": 0.231 },
    "pagesPerSession": { "value": 2.5, "previous": 2.41, "change": 0.037 },
    "bounceRate": { "value": 0.46, "previous": 0.49, "change": -0.061 },
    "sessionDurationMs": { "value": 71000, "previous": 64000, "change": 0.109 }
  },
  "range": { "from": "2026-09-20T00:00:00.000Z", "to": "2026-09-27T00:00:00.000Z" },
  "previousRange": { "from": "2026-09-13T00:00:00.000Z", "to": "2026-09-20T00:00:00.000Z" },
  "traffic": "human",
  "environment": "production",
  "filters": {}
}
```

`GET /v2/projects/remcostoeten.nl/timeseries?metric=visitors&interval=day&period=7d&filter[country]=NL`

```json
200 OK
{
  "data": [
    { "bucket": "2026-09-20T00:00:00.000Z", "value": 61 },
    { "bucket": "2026-09-21T00:00:00.000Z", "value": 48 },
    { "bucket": "2026-09-22T00:00:00.000Z", "value": 97 },
    { "bucket": "2026-09-23T00:00:00.000Z", "value": 102 },
    { "bucket": "2026-09-24T00:00:00.000Z", "value": 88 },
    { "bucket": "2026-09-25T00:00:00.000Z", "value": 76 },
    { "bucket": "2026-09-26T00:00:00.000Z", "value": 70 }
  ],
  "metric": "visitors",
  "interval": "day",
  "range": { "from": "2026-09-20T00:00:00.000Z", "to": "2026-09-27T00:00:00.000Z" },
  "traffic": "human",
  "environment": "production",
  "filters": { "country": "NL" }
}
```

`GET /v2/projects/remcostoeten.nl/breakdown/page?period=7d&limit=3`

```json
200 OK
{
  "data": [
    { "value": "/", "visitors": 702, "pageviews": 1011, "bounceRate": 0.52, "avgTimeMs": 38000, "share": 0.583 },
    { "value": "/blog/rebuilding-analytics", "visitors": 412, "pageviews": 530, "bounceRate": 0.71, "avgTimeMs": 142000, "share": 0.342 },
    { "value": "/projects", "visitors": 188, "pageviews": 240, "bounceRate": 0.33, "avgTimeMs": 51000, "share": 0.156 }
  ],
  "dimension": "page",
  "total": 64,
  "nextCursor": "eyJvIjozfQ",
  "range": { "from": "2026-09-20T00:00:00.000Z", "to": "2026-09-27T00:00:00.000Z" },
  "traffic": "human",
  "environment": "production",
  "filters": {}
}
```

`GET /v2/projects/remcostoeten.nl/breakdown/web_vital?period=30d` returns 75th percentiles per page:

```json
200 OK
{
  "data": [
    { "value": "/", "samples": 812, "lcpMs": 1840, "inpMs": 96, "cls": 0.02, "fcpMs": 1020, "ttfbMs": 310, "rating": "good" },
    { "value": "/blog/rebuilding-analytics", "samples": 344, "lcpMs": 2710, "inpMs": 180, "cls": 0.09, "fcpMs": 1380, "ttfbMs": 350, "rating": "needs-improvement" }
  ],
  "dimension": "web_vital",
  "percentile": 75,
  "minSamples": 20,
  "total": 2,
  "nextCursor": null,
  "range": { "from": "2026-08-28T00:00:00.000Z", "to": "2026-09-27T00:00:00.000Z" },
  "traffic": "human",
  "environment": "production",
  "filters": {}
}
```

`GET /v2/projects/remcostoeten.nl/realtime`

```json
200 OK
{
  "data": {
    "visitors": 7,
    "pageviewsPerMinute": 2.4,
    "pages": [ { "value": "/blog/rebuilding-analytics", "visitors": 4 }, { "value": "/", "visitors": 3 } ],
    "countries": [ { "value": "NL", "visitors": 3 }, { "value": "US", "visitors": 2 }, { "value": "DE", "visitors": 2 } ]
  },
  "window": { "from": "2026-09-27T16:35:00.000Z", "to": "2026-09-27T16:40:00.000Z" }
}
```

### Visitor-level reads

`GET /v2/projects/remcostoeten.nl/events?name=signup&limit=1`

```json
200 OK
{
  "data": [
    {
      "id": "01928c3e-7a4c-7a02-8b11-3c8d2f6e9b22",
      "name": "signup",
      "ts": "2026-09-27T16:39:59.901Z",
      "visitor": "8c4e1f0a-2b3c-4d5e-8f60-718293a4b5c6",
      "session": "f1a2b3c4-d5e6-4f70-8a91-b2c3d4e5f607",
      "page": { "path": "/blog/rebuilding-analytics", "referrer": "https://news.ycombinator.com/" },
      "props": { "plan": "pro" },
      "groups": { "company": "acme" },
      "geo": { "country": "NL", "region": "Friesland", "city": "Leeuwarden" },
      "device": { "type": "desktop", "browser": "Firefox", "browserVersion": "143", "os": "Linux" },
      "bot": { "score": 0, "reasons": [] },
      "isInternal": false
    }
  ],
  "nextCursor": "eyJ0cyI6IjIwMjYtMDktMjdUMTY6Mzk6NTkuOTAxWiJ9"
}
```

`GET /v2/projects/remcostoeten.nl/visitors?period=7d&limit=1`

```json
200 OK
{
  "data": [
    {
      "id": "8c4e1f0a-2b3c-4d5e-8f60-718293a4b5c6",
      "firstSeen": "2026-09-02T08:11:00.000Z",
      "lastSeen": "2026-09-27T16:39:59.901Z",
      "sessions": 6,
      "pageviews": 19,
      "country": "NL",
      "device": "desktop",
      "browser": "Firefox",
      "isInternal": false,
      "identified": true
    }
  ],
  "nextCursor": "eyJvIjoxfQ"
}
```

`GET /v2/projects/remcostoeten.nl/visitors/8c4e1f0a-2b3c-4d5e-8f60-718293a4b5c6`

```json
200 OK
{
  "data": {
    "id": "8c4e1f0a-2b3c-4d5e-8f60-718293a4b5c6",
    "firstSeen": "2026-09-02T08:11:00.000Z",
    "lastSeen": "2026-09-27T16:39:59.901Z",
    "sessions": 6,
    "pageviews": 19,
    "events": 27,
    "isInternal": false,
    "identity": { "userId": "user_123", "traits": { "plan": "pro" } },
    "experiments": { "hero-copy": "b" },
    "geo": { "country": "NL", "region": "Friesland", "city": "Leeuwarden", "timezone": "Europe/Amsterdam" },
    "device": { "type": "desktop", "browser": "Firefox", "browserVersion": "143", "os": "Linux", "screen": "1440x900", "language": "nl-NL" },
    "topPages": [ { "value": "/blog/rebuilding-analytics", "pageviews": 7 }, { "value": "/", "pageviews": 6 } ],
    "recentSessions": [
      { "id": "f1a2b3c4-d5e6-4f70-8a91-b2c3d4e5f607", "startedAt": "2026-09-27T16:38:10.000Z", "durationMs": 109901, "pageviews": 3, "entryPage": "/", "exitPage": "/blog/rebuilding-analytics", "referrer": "https://news.ycombinator.com/" }
    ]
  }
}
```

`PATCH /v2/projects/remcostoeten.nl/visitors/8c4e1f0a-2b3c-4d5e-8f60-718293a4b5c6` as admin

```json
request
{ "isInternal": true }

200 OK
{ "data": { "id": "8c4e1f0a-2b3c-4d5e-8f60-718293a4b5c6", "isInternal": true, "eventsUpdated": 27, "sessionsUpdated": 6 } }
```

`GET /v2/projects/remcostoeten.nl/sessions/f1a2b3c4-d5e6-4f70-8a91-b2c3d4e5f607/events`

```json
200 OK
{
  "session": { "id": "f1a2b3c4-d5e6-4f70-8a91-b2c3d4e5f607", "visitor": "8c4e1f0a-2b3c-4d5e-8f60-718293a4b5c6", "startedAt": "2026-09-27T16:38:10.000Z", "durationMs": 109901, "bot": { "score": 0, "reasons": [] } },
  "data": [
    { "id": "01928c3d-0f10-7b00-8a00-000000000001", "name": "pageview", "ts": "2026-09-27T16:38:10.000Z", "page": { "path": "/" }, "props": {} },
    { "id": "01928c3d-5a20-7b00-8a00-000000000002", "name": "pageview", "ts": "2026-09-27T16:39:02.000Z", "page": { "path": "/projects" }, "props": {} },
    { "id": "01928c3e-7a4b-7c1d-9f00-2b7c1e5d8a11", "name": "pageview", "ts": "2026-09-27T16:39:58.412Z", "page": { "path": "/blog/rebuilding-analytics" }, "props": {} },
    { "id": "01928c3e-7a4c-7a02-8b11-3c8d2f6e9b22", "name": "signup", "ts": "2026-09-27T16:39:59.901Z", "page": { "path": "/blog/rebuilding-analytics" }, "props": { "plan": "pro" } }
  ],
  "nextCursor": null
}
```

The same route for a visitor-level read without access:

```json
401 Unauthorized
{ "error": { "code": "UNAUTHORIZED", "message": "Sign in or use a token with read scope" } }
```

### Tokens

`POST /v2/tokens` as admin

```json
request
{ "name": "GitHub Actions report", "scope": "read", "projectIds": ["remcostoeten.nl"], "expiresAt": "2027-09-27T00:00:00.000Z" }

201 Created
{ "data": { "id": "tok_01J8Z7", "name": "GitHub Actions report", "scope": "read", "projectIds": ["remcostoeten.nl"], "token": "at_live_7c2e9f1a4b6d8e0c", "expiresAt": "2027-09-27T00:00:00.000Z", "createdAt": "2026-09-27T16:44:00.000Z" } }
```

`GET /v2/tokens` never returns the token itself:

```json
200 OK
{ "data": [ { "id": "tok_01J8Z7", "name": "GitHub Actions report", "scope": "read", "projectIds": ["remcostoeten.nl"], "lastUsedAt": null, "expiresAt": "2027-09-27T00:00:00.000Z", "createdAt": "2026-09-27T16:44:00.000Z" } ], "nextCursor": null }
```

`DELETE /v2/tokens/tok_01J8Z7` returns `204 No Content`.

### Operations

`GET /v2/admin/metrics` as admin

```json
200 OK
{
  "data": {
    "ingest": { "last24h": { "requests": 18230, "accepted": 40112, "duplicates": 311, "rejected": 42, "rateLimited": 9 } },
    "bots": { "last24h": { "scoredAbove50": 5120, "topReasons": [ { "reason": "ua_crawler", "events": 3011 }, { "reason": "asn_datacenter", "events": 1402 } ] } },
    "jobs": [
      { "job": "rollup", "lastRunAt": "2026-09-27T02:30:04.000Z", "status": "ok", "durationMs": 4120, "rowsWritten": 1880 },
      { "job": "cleanup", "lastRunAt": "2026-09-27T03:00:02.000Z", "status": "ok", "durationMs": 2210, "rowsDeleted": 30551 },
      { "job": "crux", "lastRunAt": "2026-09-27T04:00:01.000Z", "status": "failed", "durationMs": 310, "message": "The Chrome UX Report answered 429" }
    ],
    "speedChecks": [
      { "project": "remcostoeten.nl", "metric": "lcp", "checkedAt": "2026-09-21T04:00:01.000Z", "ours": 2710, "crux": 2100, "gap": 0.29, "flagged": true }
    ]
  }
}
```

These counters come from Postgres, not instance memory, so they are correct across serverless instances. `ingest` counts requests to `/v2/events` per hour; `bots` counts stored events scored 50 or more; `jobs` holds each job's last run; `speedChecks` holds the last Chrome UX Report comparison per project and metric, where `gap` is `|ours - crux| / crux` and a gap over 0.25 is `flagged`. `ours` is null under 20 samples and `crux` is null when Google has no data for the origin.

`POST /v2/admin/jobs/cleanup` deletes events, sessions and raw speed rows older than each project's `retentionDays`, up to 50,000 of each per run, and rate limit windows older than a day. `POST /v2/admin/jobs/crux` needs `CRUX_API_KEY` and is meant to run weekly. A job that fails or is not configured answers the error envelope (503 for a missing setting) and is recorded as `failed` with its message.

`POST /v2/admin/jobs/rollup?days=8` with the cron secret rolls the last `days` UTC days of `web_vitals` into `rollup_vitals`, drops raw speed rows past 30 days, and runs the session bot signals (`session_velocity`, `ip_fanout`) over the previous UTC day. Each reason is added once, so a rerun changes nothing. `rowsWritten` counts rollup rows plus events the session signals raised.

```json
200 OK
{ "data": { "job": "rollup", "status": "ok", "startDay": "2026-09-19", "days": 8, "rowsWritten": 1880, "durationMs": 4120 } }
```

### Speed insights

Four more routes at the `project` access level, all taking `device=mobile|desktop|all` (mobile includes tablets; default all), `environment=production|preview|all` (default production), `percentile=50|75|90|95|99` (default 75), the date range, and `filter[route]`, `filter[page]` and `filter[country]`: `/v2/projects/:project/speed`, `/speed/timeseries?metric=`, `/speed/routes` and `/speed/elements?metric=`. Without the project prefix they cover every readable project. Speed is human traffic only, and a value, rating or score under 20 samples is `null`; each metric carries its `samples`. Raw speed rows are kept 30 days; days before that come from the daily rollup, where a day's percentile is the sample-weighted mean of its per-route and per-device percentiles. The rollup has no page, country or selector, so `filter[page]`, `filter[country]` and `/speed/elements` cover the last 30 days only, and `/speed/routes` leaves out rolled-up samples without a route. `/speed/timeseries` takes `interval=hour|day` (default day); hourly series cover at most 7 days and raw rows only. `/speed/routes` takes `group=route|path` (default route; `path` covers raw rows only) and `minShare` (default 0.005), which leaves out entries with under that share of the samples, as Vercel hides URLs under 0.5% of visits; `minShare=0` keeps them all. The rollup holds production rows only, so `environment=preview` covers the last 30 days.

Each metric's percentile is scored 0 to 100 on a log-normal curve where the good threshold scores 90 and the poor threshold 50, and the score is LCP 30%, INP 30%, CLS 25% and FCP 15% of those (TTFB is shown, not scored); metrics without enough samples drop out and the weights of the rest are scaled up. With the values below, LCP 2710 ms scores 86, INP 140 ms 96, CLS 0.06 98 and FCP 1520 ms 96, so the score is 0.3 × 86 + 0.3 × 96 + 0.25 × 98 + 0.15 × 96 = 93.5, shown as 94.

`GET /v2/projects/remcostoeten.nl/speed?period=30d&device=mobile`

```json
200 OK
{
  "data": {
    "score": 94,
    "rating": "good",
    "samples": 1204,
    "metrics": {
      "lcp": {
        "value": 2710,
        "rating": "needs-improvement",
        "score": 86,
        "samples": 1204,
        "shares": {
          "good": 0.64,
          "needsImprovement": 0.27,
          "poor": 0.09
        }
      },
      "inp": {
        "value": 140,
        "rating": "good",
        "score": 96,
        "samples": 988,
        "shares": {
          "good": 0.88,
          "needsImprovement": 0.1,
          "poor": 0.02
        }
      },
      "cls": {
        "value": 0.06,
        "rating": "good",
        "score": 98,
        "samples": 1204,
        "shares": {
          "good": 0.91,
          "needsImprovement": 0.07,
          "poor": 0.02
        }
      },
      "fcp": {
        "value": 1520,
        "rating": "good",
        "score": 96,
        "samples": 1204,
        "shares": {
          "good": 0.8,
          "needsImprovement": 0.15,
          "poor": 0.05
        }
      },
      "ttfb": {
        "value": 420,
        "rating": "good",
        "score": null,
        "samples": 1204,
        "shares": {
          "good": 0.86,
          "needsImprovement": 0.11,
          "poor": 0.03
        }
      }
    }
  },
  "percentile": 75,
  "device": "mobile",
  "environment": "production",
  "range": {
    "from": "2026-08-28T00:00:00.000Z",
    "to": "2026-09-27T00:00:00.000Z"
  },
  "traffic": "human",
  "environment": "production"
}
```

`GET /v2/projects/remcostoeten.nl/speed/timeseries?metric=lcp&device=mobile&from=2026-09-25&to=2026-09-27`

```json
200 OK
{
  "data": [
    {
      "bucket": "2026-09-25T00:00:00.000Z",
      "value": 2640,
      "samples": 41
    },
    {
      "bucket": "2026-09-26T00:00:00.000Z",
      "value": null,
      "samples": 12
    }
  ],
  "metric": "lcp",
  "percentile": 75,
  "device": "mobile",
  "environment": "production",
  "interval": "day",
  "range": {
    "from": "2026-09-25T00:00:00.000Z",
    "to": "2026-09-27T00:00:00.000Z"
  }
}
```

`GET /v2/projects/remcostoeten.nl/speed/routes?limit=2` (worst score first)

```json
200 OK
{
  "data": [
    {
      "route": "/blog/[slug]",
      "score": 85,
      "samples": 344,
      "lcp": 3120,
      "inp": 180,
      "cls": 0.12,
      "fcp": 1680,
      "ttfb": 460
    },
    {
      "route": "/",
      "score": 99,
      "samples": 812,
      "lcp": 1840,
      "inp": 96,
      "cls": 0.02,
      "fcp": 1020,
      "ttfb": 310
    }
  ],
  "nextCursor": "eyJvIjoyfQ"
}
```

`GET /v2/projects/remcostoeten.nl/speed/elements?metric=lcp&limit=2`, the selectors most often behind needs-improvement and poor values, each with at least 20 samples

```json
200 OK
{
  "data": [
    {
      "selector": "main>article>img.hero",
      "route": "/blog/[slug]",
      "samples": 290,
      "value": 3200
    },
    {
      "selector": "main>h1",
      "route": "/",
      "samples": 610,
      "value": 1790
    }
  ],
  "metric": "lcp",
  "nextCursor": null
}
```

`POST /v2/admin/jobs/rollup?days=2` with the cron secret rolls the last `days` UTC days of `web_vitals` into `rollup_vitals` (p50 to p99 and rating counts per project, day, route, device and metric), drops raw speed rows older than 30 days, and runs the session bot signals over the previous UTC day.

### Issues

Issue ids read `iss_<id>`. `status=open|resolved|ignored` narrows the list, newest `lastSeen` first; `/v2/issues` lists every project whose visitor-level data you may see. An issue's events carry the parsed stack (Chrome, Edge, Firefox and Safari formats), up to 20 breadcrumbs, release, environment, page and device. Error messages, stacks and breadcrumbs are scrubbed of emails, tokens, long numbers and query strings other than `utm_` before they are stored.

`GET /v2/projects/remcostoeten.nl/issues?status=open&limit=1`

```json
200 OK
{
  "data": [
    {
      "id": "iss_01J8ZC",
      "title": "TypeError: Cannot read properties of undefined (reading 'slug')",
      "culprit": "src/components/post-card.tsx in PostCard",
      "level": "error",
      "status": "open",
      "isRegression": false,
      "count": 37,
      "visitors": 21,
      "firstSeen": "2026-09-25T09:12:00.000Z",
      "lastSeen": "2026-09-27T16:31:44.000Z",
      "firstRelease": "a1b2c3d",
      "lastRelease": "e4f5a6b"
    }
  ],
  "nextCursor": "eyJvIjoxfQ"
}
```

`GET /v2/projects/remcostoeten.nl/issues/iss_01J8ZC/events?limit=1`

```json
200 OK
{
  "data": [
    {
      "id": "01928c41-2b10-7c00-9a00-00000000abcd",
      "ts": "2026-09-27T16:31:44.000Z",
      "visitor": "8c4e1f0a-2b3c-4d5e-8f60-718293a4b5c6",
      "release": "e4f5a6b",
      "environment": "production",
      "page": { "path": "/blog" },
      "error": {
        "type": "TypeError",
        "message": "Cannot read properties of undefined (reading 'slug')",
        "stack": [
          { "file": "/_next/static/chunks/app/blog/page-3f2a.js", "line": 1, "column": 20411, "function": "PostCard", "inApp": true },
          { "file": "/_next/static/chunks/framework-9c1d.js", "line": 1, "column": 88210, "function": "renderWithHooks", "inApp": false }
        ]
      },
      "breadcrumbs": [
        { "ts": "2026-09-27T16:31:40.100Z", "kind": "navigation", "message": "/ to /blog" },
        { "ts": "2026-09-27T16:31:43.900Z", "kind": "fetch", "message": "GET /api/posts 500" }
      ],
      "device": { "type": "mobile", "browser": "Safari", "os": "iOS" }
    }
  ],
  "nextCursor": "eyJvIjoxfQ"
}
```

`PATCH /v2/projects/remcostoeten.nl/issues/iss_01J8ZC` as admin

```json
request
{ "status": "resolved" }

200 OK
{ "data": { "id": "iss_01J8ZC", "status": "resolved", "resolvedAt": "2026-09-27T16:50:00.000Z" } }
```

Every error body also carries `requestId` and a `docs` link, as described in the Errors section of the plan.

Also for issues:

| Method | Path | Access | Returns |
| --- | --- | --- | --- |
| GET | `/breakdown/:dimension?filter[issue]=iss_01J8ZC` | detail | Any breakdown for one issue: browsers, OS, pages, releases, countries affected |
| GET, POST | `/error-rules` | admin | Ignore rules per project: message or stack patterns, and mute an issue until a date or a count |
| DELETE | `/error-rules/:rule` | admin | Remove a rule |

```http
POST /v2/projects/remcostoeten.nl/error-rules
{ "kind": "ignore", "field": "message", "pattern": "ResizeObserver loop" }

201 Created
{ "data": { "id": "rule_7f3c2a10-5b1e-4c8d-9a2f-0e6d4b8c1a33", "kind": "ignore", "field": "message", "pattern": "ResizeObserver loop", "issue": null, "until": null, "remaining": null, "createdAt": "2026-09-27T16:50:00.000Z" } }

POST /v2/projects/remcostoeten.nl/error-rules
{ "kind": "mute", "issue": "iss_01J8ZC", "until": "2026-10-27T00:00:00.000Z", "count": 100 }

201 Created
{ "data": { "id": "mute_iss_01J8ZC", "kind": "mute", "field": null, "pattern": null, "issue": "iss_01J8ZC", "until": "2026-10-27T00:00:00.000Z", "remaining": 100, "createdAt": null } }
```

An ignore pattern matches new errors' message or stack as a case-insensitive substring and drops them before grouping. A mute sets the issue to `ignored` until the date passes or `count` more occurrences arrive, whichever comes first, then reopens it; it needs `until`, `count` or both. `GET` lists ignore patterns, then muted issues. Deleting a `mute_iss_` rule unmutes and reopens the issue.

### Alerts

The routes below exist only when `alerts()` is in `apps/api/analytics.config.ts`; `docs/v2/alerts.md` is the design. All need a project admin.

```text
PUT /v2/projects/remcostoeten.nl/alerts/targets
{ "targets": [
  { "channel": "mail", "to": ["remco@gmail.com"] },
  { "channel": "webhook", "name": "ops", "url": "https://ops.example.com/hooks/analytics" },
  { "channel": "discord", "url": "https://discord.com/api/webhooks/1/abc", "on": ["issue.regression"] }
] }

200 OK
{ "data": { "created": ["mail", "ops", "discord"], "updated": [], "removed": [], "secrets": { "ops": "whsec_9f86d0..." } } }

GET /v2/projects/remcostoeten.nl/alerts/targets

200 OK
{ "data": [
  { "id": "alt_4c1f...", "project": "remcostoeten.nl", "name": "ops", "channel": "webhook", "url": "https://ops.example.com/hooks/analytics",
    "on": ["issue.new", "issue.regression"], "enabled": true, "state": "failing", "stateReason": "POST https://ops.example.com/hooks/analytics answered 502",
    "createdAt": "2026-09-29T12:00:00.000Z", "updatedAt": "2026-09-29T12:00:00.000Z" }
], "nextCursor": null }
```

- `name` defaults to the channel, `on` to every issue event and `enabled` to `true`. Sending the same list twice changes nothing. A channel the config does not enable, or two targets with one name, answer `VALIDATION_FAILED` with the field's path in `details.fields`, such as `/targets/0/to/0`.
- `state` is `paused` when a target is disabled or its channel is off or not ready (an empty `MAIL_URL`, say), `failing` when its last delivery failed, else `active`.
- `PUT .../targets/:name` creates or replaces one target, `DELETE` removes it with its history, `POST .../test` sends a sample alert now and answers `{ name, channel, delivered, message }` with what the provider said, and `POST .../rotate` answers `{ name, secret }` for a webhook target.
- `GET .../deliveries?status=pending|sent|failed&limit=&cursor=` lists deliveries newest first with `attempts`, `lastError`, `nextAttemptAt`, `sentAt` and the event as `payload`.
- `GET /v2/admin/alerts/status` answers `{ channels: [{ name, ready, problem }], transport: { name, host, from }, pending, failing: [{ project, name, channel, reason }] }`.

`POST /v2/admin/jobs/alerts` with the cron secret first queues new issues and regressions, up to 100 per run, as one delivery per enabled target subscribed to the event, never twice for the same target, event and subject; then it sends every due delivery, one mail or request per target, and settles each by the retry policy (5 attempts after 1, 5, 30, 120 and 720 minutes, within 24 hours, unless the config says otherwise). `rowsWritten` is the number sent. Without `alerts()` in the config it answers 503 "Alerts are off".

A webhook target receives `{ v: 1, sentAt, events: [{ name, project, issue: { id, title, culprit, level, count, firstSeen, lastSeen, lastRelease, url } }] }` with `x-analytics-timestamp` (Unix seconds) and `x-analytics-signature: sha256=<hex hmac of "<timestamp>.<body>">` under the target's secret. `alertRoute` and `verifyAlert` in `@spoar/sdk/server` check both.

### Annotations

An annotation is a dated label on a project's time series: a release, a post, a content update, an incident or another event worth seeing next to the numbers. Ids read `ann_<uuid>`. Anyone who may read the project's numbers may list its annotations; only its admins add, change or delete them. A private project answers 404 to anyone else.

```text
POST /v2/projects/remcostoeten.nl/annotations
{ "title": "v2.0 released", "date": "2026-10-01T09:30:00+02:00", "kind": "release",
  "url": "https://github.com/remcostoeten/analytics/releases/tag/v2.0.0" }

201 Created
{ "data": { "id": "ann_0192f0c4-3b1e-7d2a-9c4f-1a2b3c4d5e6f", "project": "remcostoeten.nl", "title": "v2.0 released",
  "date": "2026-10-01T07:30:00.000Z", "endDate": null, "kind": "release", "note": null,
  "url": "https://github.com/remcostoeten/analytics/releases/tag/v2.0.0",
  "createdAt": "2026-10-01T07:31:00.000Z", "updatedAt": "2026-10-01T07:31:00.000Z" } }

GET /v2/projects/remcostoeten.nl/annotations?from=2026-09-01T00:00:00Z&to=2026-10-02T00:00:00Z

200 OK
{ "data": [ { "id": "ann_0192f0c4-...", "title": "v2.0 released", "date": "2026-10-01T07:30:00.000Z", ... } ], "nextCursor": null }
```

- `title` (1 to 120 characters) and `date` are required. `endDate` makes it a range and may not be before `date`. `kind` is `release`, `post`, `content`, `incident` or `other` (the default). `note` holds up to 2,000 characters and `url` an `http://` or `https://` URL of up to 2,048.
- `date` and `endDate` take a calendar date such as `2026-10-01`, read as the start of that day in UTC, or an ISO 8601 timestamp with an offset. Answers are always UTC timestamps.
- The list takes the read range (`from` and `to`, or `period`, default `30d`) and answers the annotations that overlap it, oldest first, paged with `limit` (1 to 100, default 20) and `cursor`. A range annotation is listed when any part of it falls inside.
- `PATCH .../annotations/:annotation` changes the fields sent and leaves the rest; `null` clears `endDate`, `note` or `url`. An empty body answers `VALIDATION_FAILED`. `DELETE` answers 204.
- An `endDate` before `date`, on create or after a change, answers `VALIDATION_FAILED` with `/endDate` in `details.fields`. An id from another project answers `NOT_FOUND`.

### Error codes

| Status | Code | When |
| --- | --- | --- |
| 400 | `VALIDATION_FAILED` | Body, query or path fails the schema; `details` lists each field |
| 401 | `UNAUTHORIZED` | No or invalid session, token or key |
| 403 | `FORBIDDEN_ORIGIN` | Public key used from an origin not in the project's list |
| 403 | `FORBIDDEN` | The token scope or the signed-in member's role does not allow the action |
| 404 | `NOT_FOUND` | Unknown route, project, visitor or session, or a private project without access |
| 409 | `CONFLICT` | Creating a project whose id exists |
| 413 | `PAYLOAD_TOO_LARGE` | Ingest body over 60 KB or more than 50 events |
| 429 | `RATE_LIMITED` | Per-IP-hash limit hit; `Retry-After` header set |
| 500 | `INTERNAL` | Unexpected failure; the message never includes internals |
| 503 | `UNAVAILABLE` | Database unreachable, or a feature the route needs is not configured: a job's store, alerts, `CRUX_API_KEY`, SMTP or Resend; ingest clients retry |
