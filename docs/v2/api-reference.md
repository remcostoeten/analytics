# API reference (draft)

Every route the v2 API will have, who may call it, and what comes back. This is the design the OpenAPI document will be generated from; the live, always-current version will be served at `/v2/openapi` once the API exists.

## Access levels

| Level | Who passes |
| --- | --- |
| `public` | Anyone |
| `project` | Anyone when the project is public; otherwise an admin session or an API token with `read` scope for that project |
| `detail` | Admin or `read` token; also anyone when the project is public **and** has `publicVisitorData` switched on |
| `admin` | Admin session or an API token with `admin` scope |
| `ingest` | `X-Project-Key: pk_...` or `?key=pk_...` from an allowed Origin, or `Bearer sk_...`. The browser SDK uses `?key=` because `sendBeacon` cannot set headers and a custom header would trigger a CORS preflight |
| `cron` | `Bearer CRON_SECRET` |

A private project answers 404, not 403, to callers without access, so its name does not leak.

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
| GET, POST | `/v2/tokens` | admin | List and create API tokens |
| DELETE | `/v2/tokens/:token` | admin | Revoke a token |
| GET | `/v2/admin/metrics` | admin | Ingest counters and job history |
| POST | `/v2/admin/jobs/:job` | cron | Run `rollup` or `cleanup` |

## Shared query parameters

| Parameter | Values | Default |
| --- | --- | --- |
| `from`, `to` | ISO 8601 timestamps | last 30 days |
| `period` | `24h`, `7d`, `30d`, `90d`, `12mo`, `all`; ignored when `from` and `to` are set | `30d` |
| `traffic` | `human` (bot score under 50, no internal, localhost or preview), `all` | `human` |
| `filter[<dimension>]` | a value, or `!value` to exclude; repeatable across dimensions | none |
| `limit`, `cursor` | up to 100; opaque cursor from the previous page | 20 |

Dimensions for `breakdown` and `filter`: `host`, `page`, `route`, `entry_page`, `exit_page`, `referrer`, `referrer_domain`, `channel`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `country`, `region`, `city`, `continent`, `timezone`, `device`, `browser`, `browser_version`, `os`, `os_version`, `screen`, `viewport`, `language`, `connection`, `visitor_type` (new or returning), `event`, `bot_reason`, `release`, plus `prop:<key>` for any event prop and `trait:<key>` for any visitor trait.

Metrics, for `timeseries` and the `metrics=` list on `breakdown` (default `visitors,pageviews`): `visitors`, `sessions`, `pageviews`, `events`, `bounce_rate`, `session_duration`, `time_on_page`, `scroll_depth`, `pages_per_session`, `conversion_rate` (share of sessions with the filtered event), plus `sum:prop.<key>` and `avg:prop.<key>` for numeric props such as revenue. `timeseries` also takes `compare=previous` to return the previous period alongside.

Every list or breakdown route also answers `Accept: text/csv` with the same rows as CSV.

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
| GET | `/paths?from=/pricing` | project | The pages visitors went to next from a page, or came from with `direction=previous`, with counts and drop-off |
| GET | `/retention?interval=week` | project | Cohorts by first visit week or month and the share returning in each later period |
| GET | `/heatmap` | project | Visitors or pageviews by weekday and hour of day, in the project's or a given timezone |
| GET | `/map?level=city` | project | Visitor counts per country, region or city with coordinates for a map |
| GET | `/realtime/events` | detail | Server-sent events stream of incoming events for the live view, with the same filters |

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

Every list and breakdown route returns other formats on request, with the same filters and without the page limit (up to 1 million rows, streamed):

| Ask for | You get |
| --- | --- |
| `Accept: text/csv` or `?format=csv` | CSV with a header row |
| `?format=json` | The normal response, all pages at once |
| `?format=sql` | A `.sql` file with a `CREATE TABLE` and `INSERT` statements, ready to load into any Postgres or SQLite |

For questions no route answers, admins get read-only SQL:

| Method | Path | Access | Returns |
| --- | --- | --- | --- |
| POST | `/v2/projects/:project/query` | admin | Runs one `SELECT` against documented views (`events`, `sessions`, `visitors`, `web_vitals`, `issues`) already limited to that project, as a read-only database role, with a 10-second timeout and 10,000 rows; results as JSON or CSV |

```json
request
{ "sql": "select route, count(*) as views from events where name = 'pageview' and ts > now() - interval '7 days' group by 1 order by 2 desc limit 5" }

200 OK
{ "columns": ["route", "views"], "rows": [["/", 1011], ["/blog/[slug]", 530]], "rowCount": 2, "durationMs": 41 }
```

The SQL console, complete:

| Method | Path | Returns |
| --- | --- | --- |
| POST | `/v2/query` | The same, across every project, with `project_id` as a column |
| GET | `/v2/query/schema` | Every queryable view with its columns, types and a one-line description, for autocomplete and a schema sidebar |
| POST | `/v2/query/explain` | Postgres' cost estimate for a query, so the console can warn before running something heavy |
| GET, POST | `/v2/queries` | Saved queries: name, SQL, description, and optionally a chart type so a query can become a dashboard panel |
| GET, PATCH, DELETE | `/v2/queries/:query` | One saved query |
| GET | `/v2/queries/history` | Your last 100 runs with duration and row count |

- **Parameters, not string building**: a query can use `:from`, `:to` and `:project`, filled from the dashboard's date range and project switcher and passed to Postgres as bound parameters.
- **Safety in layers**: a SQL parser accepts only a single `SELECT` or `WITH`; the query runs in a read-only transaction as a database role that can see only the analytics views, never the auth, token or project-secret tables; 10-second statement timeout, 10,000-row cap, and a per-admin rate limit.
- **Results**: table, CSV or JSON download, and a quick line or bar chart built from the result in the browser.
- **Views instead of raw tables**: `events`, `sessions`, `visitors`, `people`, `web_vitals`, `issues` and the rollups, with stable column names, so a table change in a later migration does not break saved queries.

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

Still missing after this check, all planned as later epics: goals and funnels, annotations, saved segments, and email reports. They fit the same model and need no new data collection.

## Full examples

One request and its complete response for every route. Field names are camelCase, timestamps are ISO 8601 in UTC, ratios run from 0 to 1, durations are milliseconds. The numbers are made up.

### Ingest

`POST /v2/events` from a browser

```http
POST /v2/events HTTP/1.1
Host: api.remcostoeten.nl
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

The same batch sent again returns `{ "accepted": 0, "duplicates": 2, "rejected": [] }`. An event with a bad field is reported by index while the rest are stored:

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

Browser requests are limited to 100 per minute per project and daily IP hash. A request with the secret key (`Authorization: Bearer sk_...`) is not rate-limited, may come from any origin, and is the only kind whose forwarded visitor details are used: `context.ip` and `context.ua` on an event, or the `X-Visitor-IP` and `X-Visitor-UA` headers a same-origin proxy adds. Without the secret key the IP comes from `cf-connecting-ip`, then `x-real-ip`, then the first `x-forwarded-for` entry, and the user agent from `User-Agent`.

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
  "isAdmin": true
}
```

Signed out:

```json
200 OK
{ "user": null, "session": null, "isAdmin": false }
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
      { "job": "cleanup", "lastRunAt": "2026-09-27T03:00:02.000Z", "status": "ok", "durationMs": 2210, "rowsDeleted": 30551 }
    ]
  }
}
```

These counters come from Postgres, not instance memory, so they are correct across serverless instances.

`POST /v2/admin/jobs/rollup?days=8` with the cron secret

```json
200 OK
{ "data": { "job": "rollup", "status": "ok", "startDay": "2026-09-19", "days": 8, "rowsWritten": 1880, "durationMs": 4120 } }
```

### Speed insights

Four more routes at the `project` access level, all taking `device=mobile|desktop|all`, `percentile=75|90|95|99`, the date range and filters: `/v2/projects/:project/speed`, `/speed/timeseries?metric=`, `/speed/routes` and `/speed/elements?metric=`.

`GET /v2/projects/remcostoeten.nl/speed?period=30d&device=mobile`

```json
200 OK
{
  "data": {
    "score": 86,
    "rating": "needs-improvement",
    "samples": 1204,
    "metrics": {
      "lcp": { "value": 2710, "rating": "needs-improvement", "score": 78, "shares": { "good": 0.64, "needsImprovement": 0.27, "poor": 0.09 } },
      "inp": { "value": 140, "rating": "good", "score": 95, "shares": { "good": 0.88, "needsImprovement": 0.1, "poor": 0.02 } },
      "cls": { "value": 0.06, "rating": "good", "score": 93, "shares": { "good": 0.91, "needsImprovement": 0.07, "poor": 0.02 } },
      "fcp": { "value": 1520, "rating": "good", "score": 92, "shares": { "good": 0.8, "needsImprovement": 0.15, "poor": 0.05 } },
      "ttfb": { "value": 420, "rating": "good", "score": null, "shares": { "good": 0.86, "needsImprovement": 0.11, "poor": 0.03 } }
    }
  },
  "percentile": 75,
  "device": "mobile",
  "range": { "from": "2026-08-28T00:00:00.000Z", "to": "2026-09-27T00:00:00.000Z" },
  "traffic": "human"
}
```

`GET /v2/projects/remcostoeten.nl/speed/routes?limit=2`

```json
200 OK
{
  "data": [
    { "route": "/blog/[slug]", "score": 71, "samples": 344, "lcp": 3120, "inp": 180, "cls": 0.12, "fcp": 1680, "ttfb": 460 },
    { "route": "/", "score": 94, "samples": 812, "lcp": 1840, "inp": 96, "cls": 0.02, "fcp": 1020, "ttfb": 310 }
  ],
  "nextCursor": "eyJvIjoyfQ"
}
```

`GET /v2/projects/remcostoeten.nl/speed/elements?metric=lcp&limit=2`

```json
200 OK
{
  "data": [
    { "selector": "main>article>img.hero", "route": "/blog/[slug]", "samples": 290, "value": 3200 },
    { "selector": "main>h1", "route": "/", "samples": 610, "value": 1790 }
  ],
  "metric": "lcp",
  "nextCursor": null
}
```

### Issues

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

### Error codes

| Status | Code | When |
| --- | --- | --- |
| 400 | `VALIDATION_FAILED` | Body, query or path fails the schema; `details` lists each field |
| 401 | `UNAUTHORIZED` | No or invalid session, token or key |
| 403 | `FORBIDDEN_ORIGIN` | Public key used from an origin not in the project's list |
| 403 | `FORBIDDEN` | Token scope does not allow the action |
| 404 | `NOT_FOUND` | Unknown route, project, visitor or session, or a private project without access |
| 409 | `CONFLICT` | Creating a project whose id exists |
| 413 | `PAYLOAD_TOO_LARGE` | Ingest body over 60 KB or more than 50 events |
| 429 | `RATE_LIMITED` | Per-IP-hash limit hit; `Retry-After` header set |
| 500 | `INTERNAL` | Unexpected failure; the message never includes internals |
| 503 | `UNAVAILABLE` | Database unreachable; ingest clients retry |
