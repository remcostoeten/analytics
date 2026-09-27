# SQL reference (draft)

The spec for the SQL console: nine read-only views, their columns, what is allowed, and example queries. The views are the contract; the tables under them can change without breaking saved queries.

## Rules

- One statement, `SELECT` or `WITH ... SELECT`. Anything else is rejected before it reaches Postgres.
- Every view is already limited to the projects you may read; `/v2/projects/:project/query` limits it further to one project.
- Bound parameters: `:from`, `:to` (timestamps) and `:project` (text), filled from the dashboard's date range and project switcher.
- Allowed: all standard aggregates, `percentile_cont`, `percentile_disc`, window functions, `date_trunc`, `generate_series`, date and string functions, and jsonb operators (`props->>'plan'`). Not allowed: `pg_*` and `set_config` functions, `dblink`, anything that writes, sleeps or reads files.
- Limits: 10-second timeout, 10,000 rows, 30 queries a minute per admin.
- Every view has `is_human`: true when not a bot (score under 50), not internal, not localhost and not a preview. Add `where is_human` to match what the dashboard shows.

## Views

### events

One row per event: pageviews, custom events, clicks, errors.

| Column | Type | Meaning |
| --- | --- | --- |
| `event_id` | text | The SDK's UUIDv7 id |
| `project_id` | text | Project slug |
| `name` | text | `pageview`, `click`, `signup`, ... |
| `ts` | timestamptz | When it happened, clock-corrected |
| `received_at` | timestamptz | When the API received it |
| `visitor_id`, `session_id` | text | Links to `visitors` and `sessions` |
| `host`, `path`, `route`, `title` | text | Where it happened; `route` is the template such as `/blog/[slug]` |
| `referrer`, `referrer_domain`, `channel` | text | Where the visitor came from |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` | text | Campaign tags |
| `country`, `region`, `city`, `continent`, `timezone` | text | From the IP address |
| `latitude`, `longitude` | double | City centre |
| `device`, `browser`, `browser_version`, `os`, `os_version` | text | From the user agent |
| `screen`, `viewport`, `language`, `connection` | text | From the browser |
| `asn`, `as_org` | integer, text | Network |
| `props` | jsonb | The event's own fields, such as `props->>'plan'` |
| `release` | text | App version sent by the SDK |
| `bot_score`, `bot_reasons` | smallint, text\[\] | Bot scoring |
| `is_human`, `is_internal`, `is_localhost`, `is_preview` | boolean | Traffic flags |
| `issue_id` | bigint | For errors, the issue it was grouped into |

### pageviews

`events` where `name = 'pageview'`, with the per-page facts already joined in.

| Column | Type | Meaning |
| --- | --- | --- |
| all `events` columns |  |  |
| `time_on_page_ms` | bigint | Visible time on this page before the next page or leaving |
| `scroll_depth` | real | Deepest scroll, 0 to 1 |
| `is_entry`, `is_exit` | boolean | First or last page of the visit |
| `previous_path`, `next_path` | text | The page before and after, null at the ends |
| `page_number` | integer | Position in the visit, 1 for the entry page |

### sessions

One row per visit.

| Column | Type | Meaning |
| --- | --- | --- |
| `session_id`, `project_id`, `visitor_id` | text |  |
| `visit_number` | integer | 1 for the visitor's first visit, 2 for the second, ... |
| `since_previous_visit_ms` | bigint | Gap since the visitor's previous visit, null on the first |
| `started_at`, `ended_at` | timestamptz |  |
| `duration_ms` | bigint | Visible time on the site |
| `pageviews`, `events` | integer | Counts in this visit |
| `is_bounce` | boolean | One pageview and no interaction |
| `entry_path`, `entry_route`, `exit_path`, `exit_route` | text |  |
| `referrer_domain`, `channel`, `utm_source`, `utm_campaign` | text | How this visit started |
| `country`, `city`, `device`, `browser`, `os` | text |  |
| `bot_score`, `is_human`, `is_internal` |  |  |

### visitors

One row per visitor per project.

| Column | Type | Meaning |
| --- | --- | --- |
| `visitor_id`, `project_id` | text |  |
| `first_seen`, `last_seen` | timestamptz |  |
| `visits`, `pageviews`, `events` | integer | Lifetime counts |
| `total_duration_ms` | bigint |  |
| `is_returning` | boolean | More than one visit |
| `user_id` | text | Set after `identify` |
| `traits`, `experiments` | jsonb | Such as `traits->>'plan'` |
| `first_referrer_domain`, `first_channel`, `first_utm_campaign` | text | How they first arrived |
| `country`, `city`, `device`, `browser`, `os` | text | Latest known |
| `is_internal` | boolean |  |

### people

Identified users across projects.

| Column | Type | Meaning |
| --- | --- | --- |
| `user_id` | text |  |
| `first_seen`, `last_seen` | timestamptz |  |
| `first_project` | text | Where they first came in |
| `projects` | text\[\] | Every project they used |
| `visits` | integer | Across projects |
| `traits` | jsonb | Latest traits |

### web\_vitals, issues, daily, daily\_vitals

- `web_vitals`: one row per measured metric, columns as in the Schemas and types tab (`metric`, `value`, `rating`, `route`, `path`, `device`, `country`, `connection`, `selector`, `sample_rate`, `navigation_type`, `ts`, `session_id`, `is_human`).
- `issues`: one row per grouped error, columns as in the Schemas and types tab.
- `daily`: the pre-aggregated `rollup_daily` (`day`, `dimension`, `value`, `visitors`, `sessions`, `pageviews`, `events`), fast for long ranges.
- `daily_vitals`: the pre-aggregated `rollup_vitals` with p50 to p99 per day, route, device and metric.

## Example queries

Top routes by average time on page, last 30 days:

```sql
select route, count(*) as views, round(avg(time_on_page_ms) / 1000.0, 1) as avg_seconds
from pageviews
where is_human and ts between :from and :to
group by route
order by views desc
limit 20;
```

How many visits it takes people to sign up:

```sql
select s.visit_number, count(*) as signups
from events e
join sessions s using (session_id)
where e.name = 'signup' and e.is_human and e.ts between :from and :to
group by s.visit_number
order by s.visit_number;
```

Pricing to signup, as a two-step funnel within one visit:

```sql
with saw_pricing as (
  select distinct session_id from pageviews
  where route = '/pricing' and is_human and ts between :from and :to
),
signed_up as (
  select distinct session_id from events where name = 'signup'
)
select
  count(*) as saw_pricing,
  count(*) filter (where session_id in (select session_id from signed_up)) as then_signed_up
from saw_pricing;
```

Mobile LCP at p75 per route:

```sql
select route, count(*) as samples,
  percentile_cont(0.75) within group (order by value) as lcp_p75_ms
from web_vitals
where metric = 'lcp' and device = 'mobile' and is_human and ts between :from and :to
group by route
having count(*) >= 20
order by lcp_p75_ms desc;
```

Revenue per campaign:

```sql
select utm_campaign, sum((props->>'revenue')::numeric) as revenue, count(*) as orders
from events
where name = 'checkout' and is_human and ts between :from and :to
group by utm_campaign
order by revenue desc nulls last;
```

People who first came in through one project and later used another:

```sql
select user_id, first_project, projects, first_seen
from people
where first_project = 'remcostoeten.nl' and 'skriuw' = any(projects);
```

## How it is built

- The views live in a migration of their own (0022) and are owned by an `analytics_reader` role with `SELECT` on the views only. The API runs console queries as that role inside `BEGIN READ ONLY`.
- Project scoping is a Postgres row-level security policy on the views, keyed on a `app.project_ids` setting the API sets per query, so a query cannot read outside the caller's projects even if it tries.
- The views, their columns and the descriptions in this tab are generated into `/v2/query/schema`, so the console's sidebar and this spec cannot drift apart.
