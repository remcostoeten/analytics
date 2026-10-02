# Bot detection readiness

How to check the v2 bot score against real traffic before the dashboard and reports rely on it, and how to tune it without building anything new. The scoring itself is described in the docs page [Bots](../../apps/docs/content/docs/edge-cases/bots.mdx); this file is the plan for validating it.

Nothing here needs code. Every step is a read against the database, a `bun run rescore --dry-run`, or a weight change in one signal file followed by a rescore. The steps that touch the production database are for the owner to run.

## Where it stands

- The weights in `packages/engine/src/signals/` are the starting values from the plan, not measured ones. No v2-scored production traffic exists yet, because the v2 API is not deployed and migrations 0009 to 0030 are not applied.
- Events are stored whatever their score and reads filter at 50, so a wrong weight costs a rescore, not lost data.
- The threshold of 50 is repeated as a local constant in `reads/scope.ts`, `speed/vitals.ts`, `adapters/drizzle.ts`, `adapters/drizzle-ops.ts`, `adapters/drizzle-speed.ts`, `jobs/rescore.ts` and `jobs/session-signals.ts`. Changing the threshold means changing all seven; changing a weight means changing one signal file.

## How a score reads

| Score | Meaning | Typical cause |
| --- | --- | --- |
| 100 | One strong signal | `ua_crawler`, `ua_automation` or `edge_verified_bot` |
| 50 to 99 | Two or more weak signals together, or `client_webdriver` | Hosting network plus a missing header, a fast session, or no input |
| 1 to 49 | One weak signal alone, counted as human | A VPN or cloud network alone (40), a shared IP alone (40) |
| 0 | Nothing fired | Most real visitors |

The reasons array on each event says which signals fired. The `bot_reason` dimension breaks a range down by reason, and `traffic=bots` shows only events at 50 or more.

## Known false positive risks

These follow from the current signals and weights. Each one is a hypothesis to check with the queries below, not a confirmed bug.

| Risk | Combination | Score | Who it hits |
| --- | --- | --- | --- |
| VPN in a background tab | `asn_datacenter` (40) + `client_no_input` (20) | 60 | A visitor on a VPN that exits through M247, Datacamp, Google, AWS or another listed network, who opens a link in a background tab. The pageview is sent on load while the tab is hidden, so the `botSignals` plugin marks it as never visible with no input |
| Shared IP in a background tab | `ip_fanout` (40) + `client_no_input` (20) | 60 | Mobile carrier NAT, offices and campuses with more than 20 visitors on one IP in a day. Applied by the daily job, so it lands a day later |
| Shared IP without a language header | `ip_fanout` (40) + `headers_missing` (15) | 55 | Same networks, with a privacy browser or extension that strips `accept-language` |
| VPN without a language header | `asn_datacenter` (40) + `headers_missing` (15) | 55 | Same as the first row |
| Prerendered pages | `client_no_input` on its own | 20 | Pages that Chrome or Next.js prerenders and the visitor never opens. These stay human at 20, but they are counted as pageviews. This is a counting question, not a bot question |

A session's score is the highest score of its events, so one event at 60 marks the whole session as bot.

Brave, Firefox strict mode, Safari and ad blockers should all stay at 0. The plan's phase 3 browser run covers them; repeat it after any weight change.

## Step 1: shadow-score v1 history

Before v2 serves traffic, the v1 events in the same database show what the v2 user agent and network signals would say. Headers and client bits were not stored in v1, so only `ua_crawler`, `ua_automation` and `asn_datacenter` can fire here.

```bash
DATABASE_URL=... bun run rescore --from 2026-09-01 --to 2026-10-01 --include-legacy --dry-run
```

`--dry-run` only counts. Then compare with what v1 decided:

```sql
select
  bot_detected as v1_bot,
  asn in (16509, 14618, 8987, 15169, 396982, 8075, 24940, 213230, 16276, 14061,
          63949, 20473, 31898, 45102, 132203, 12876, 51167, 9009, 60068, 212238) as hosting,
  count(*) as events,
  count(distinct visitor_id) as visitors
from events
where schema_version = 0 and ts >= now() - interval '30 days'
group by 1, 2
order by 1, 2;
```

What to look for: hosting-network events that v1 counted as human, since those are the visitors the first two risks above would hit once a weak client or header signal joins them.

## Step 2: watch the first two weeks of v2 traffic

Once v2 is live, run these against production every few days. All of them leave internal, localhost and preview traffic out.

Reason mix across all scored traffic:

```sql
select reason, count(*) as events, count(distinct session_id) as sessions
from events, unnest(bot_reasons) as reason
where schema_version >= 1 and ts >= now() - interval '7 days'
  and not is_internal and not is_localhost and not is_preview
group by reason
order by events desc;
```

The borderline band, where false positives live. Every combination here is two or more weak signals:

```sql
select bot_reasons, count(*) as events, count(distinct session_id) as sessions
from events
where schema_version >= 1 and ts >= now() - interval '7 days'
  and bot_score between 50 and 99
  and not is_internal and not is_localhost and not is_preview
group by bot_reasons
order by events desc;
```

Behaviour of the borderline sessions. Real visitors scroll, click and come back; scrapers do one pageview each:

```sql
with borderline as (
  select distinct session_id
  from events
  where schema_version >= 1 and ts >= now() - interval '7 days'
    and bot_score between 50 and 99 and session_id is not null
)
select
  count(*) as sessions,
  count(*) filter (where pageviews > 1) as multi_page,
  count(*) filter (where interactions > 0) as with_interactions,
  round(avg(pageviews), 1) as avg_pageviews
from (
  select e.session_id,
    count(*) filter (where e.name = 'pageview') as pageviews,
    count(*) filter (where e.name in ('click', 'scroll_depth', 'engagement', 'outbound_click', 'form_submit')) as interactions
  from events e
  join borderline b using (session_id)
  group by e.session_id
) per_session;
```

Hosting networks among human traffic, to see which providers carry real visitors:

```sql
select as_org, asn, count(distinct visitor_id) as visitors,
  count(*) filter (where bot_score >= 50) as bot_events,
  count(*) filter (where bot_score < 50) as human_events
from events
where schema_version >= 1 and ts >= now() - interval '7 days'
  and 'asn_datacenter' = any(bot_reasons)
group by as_org, asn
order by visitors desc;
```

Pick ten sessions from the borderline band and read their events in order (path, referrer, ts, user agent). A session with a search or social referrer, several pages and scroll events is a person.

## Step 3: tune

Only change something when a query above shows a concrete group of people being counted as bots, or bots being counted as people.

1. Change the weight in that one signal file under `packages/engine/src/signals/`, and update the table in the Bots docs page in the same PR.
2. Check the effect: `bun run rescore --from <date> --to <date> --dry-run`. The changed count is the number of events whose score moves.
3. After the PR is merged and deployed, run the same command without `--dry-run`. Sessions and past reports follow.

Likely first adjustments if the risks above are confirmed. Each keeps the scale and the threshold the same:

- `client_no_input` from 20 to 5, so a hidden pageview alone never tips a hosting or shared-IP visitor over 50. Webdriver and headless still carry their own weight.
- Remove a provider from the hosting list when it is mainly a consumer VPN egress for real visitors, rather than lowering `asn_datacenter` for every cloud.

## Ready when

- The borderline band (50 to 99) is under 2% of non-internal sessions, or every combination in it has been read and judged.
- No hosting network with a meaningful share of human visitors is in the hosting list without a reason.
- The phase 3 browser run (Brave standard and aggressive, uBlock Origin with EasyPrivacy, Firefox strict, Safari) scores 0.
- A rescore dry run after the last weight change reports the expected number of changed events.
