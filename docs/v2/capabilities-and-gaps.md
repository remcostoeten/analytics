# Capabilities and gaps

Sep 27, 2026

v2 as planned covers core web analytics, custom typed events, web vitals, public dashboards and a documented read API. Next to Plausible, Umami, Fathom, PostHog and GA4, it lacks goals, funnels, email reports, annotations and export. Error tracking, speed insights, 404 pages and file downloads were added to the plan after this comparison.

## What v2 tracks

| Source | What is recorded | On by default |
| --- | --- | --- |
| Core | Pageviews including SPA navigation, referrer, UTM tags, entry and exit page, visitor and session, country, region, city, device, browser, OS, screen, language, timezone | Yes |
| Server-side enrichment | Geo from MaxMind, ASN and network, daily-rotating IP hash, bot score with reasons, internal, localhost and preview flags | Yes |
| `speedInsights` plugin | LCP, INP, CLS, FCP, TTFB per page | Opt-in |
| `scrollDepth` plugin | Maximum scroll depth per page | Opt-in |
| `engagement` plugin | Visible time on page | Opt-in |
| `clicks` plugin | Clicks on elements marked with a data attribute | Opt-in |
| `outboundLinks` plugin | Clicks on links to other domains | Opt-in |
| `forms` plugin | Form submissions, by form name, no field values | Opt-in |
| `errors` plugin | Uncaught errors and unhandled rejections, message and stack | Opt-in |
| `track()` | Any custom event with typed props, including revenue and search | Manual |
| `identify()`, `experiment()` | User id and traits, experiment variant, attached to later events | Manual, consent-gated |
| Server SDK | Events from API routes, jobs and webhooks, with the visitor's UA and IP forwarded for hashing | Manual |

Reports the API returns: headline stats against the previous period, time series by hour or day, top values for 18 dimensions, filters on any dimension, realtime, raw events, visitor profiles, session trails, and internal-traffic marking.

## Compared with other tools

Yes means the vendor's docs describe the feature; unverified means the research did not find it on a page it opened. The v2 column is this plan, not shipped code.

| Capability | v2 plan | Plausible | Umami | Fathom | PostHog | GA4 |
| --- | --- | --- | --- | --- | --- | --- |
| Public dashboards | Yes, per project | Yes | Yes | Yes | Yes | Unverified |
| Read API | Yes, with OpenAPI | Yes | Yes | Yes | Yes | Unverified |
| Custom events with props | Yes, typed | Yes | Yes | Name and value only | Yes | Unverified |
| Goals and conversions | No | Yes | Yes | Yes | Yes | Unverified |
| Funnels | No | Yes | Yes | Unverified | Yes | Yes |
| Retention and cohorts | No, today's dashboard has a basic cohort view | Unverified | Yes | Unverified | Yes | Yes |
| Journeys and paths | Per session only | Yes | Yes | Unverified | Yes | Yes |
| Revenue | Events with revenue props, no report | Yes | Yes | Yes | Yes | Unverified |
| UTM and campaigns | Yes | Yes | Yes | Yes | Yes | Unverified |
| Outbound links, file downloads | Yes, `outboundLinks` plugin | Opt-in | Unverified | Manual | Outbound only | Yes |
| 404 pages | Yes, `notFound` plugin | Yes | Unverified | Custom event | Partial | Custom event |
| Web vitals | Yes, with a speed score per route | Unverified | Yes | Unverified | Yes | Unverified |
| Session replay, heatmaps | No | Unverified | Yes | Unverified | Yes | Unverified |
| Experiments with statistics | Exposure only | Unverified | Unverified | Unverified | Yes | Unverified |
| Email reports and alerts | No | Yes | Yes | Yes | Yes | Unverified |
| Annotations | No | Yes | Yes | Yes | Yes | Yes |
| CSV export and import | No | Yes | Yes | Yes | Partial | Unverified |
| Search Console | No | Yes | Unverified | Yes | Yes | Yes |
| Saved segments | Per-request filters only | Yes | Yes | Yes | Yes | Yes |
| Bot filtering | Scored: headers, ASN, client signals, session behaviour | UA list, referrer spam, data-center IP ranges | Manual IP filters | Bot UAs, data-center IPs | Client-side known-bot list | Automatic, not configurable |
| Cookieless by default | Yes | Yes | Yes | Yes | No | Unverified |

## Gaps worth closing

These fit the existing event model and need no new data collection. Each is one more resource in the API.

1. **Goals**: a saved rule per project (event name, or pageview path pattern) with a conversion rate in `stats`. Most other features build on this.
2. **Funnels**: an ordered list of goals, computed per session or per visitor over a date range.
3. **File downloads and 404 pages**: two small plugins. Downloads extend `outboundLinks` by file extension; 404 needs one call on the not-found page.
4. **Annotations**: dated notes per project, drawn on the time series.
5. **Saved segments**: named filter sets reusable across reports and the public dashboard.
6. **CSV export**: any `breakdown` or `events` response with `Accept: text/csv`.
7. **Email reports**: a weekly digest from the cron job.

Left out on purpose: session replay, heatmaps and feature flags. They need a much larger client and much more stored data, and they conflict with the bundle budget and the privacy stance. Search Console and GA import are possible later but depend on external APIs.

## Ideas from PostHog

PostHog is a product analytics suite rather than a web analytics tool, so much of it goes further than v2 plans. These are its features that fit v2's data and privacy stance, ordered by value for the effort. Its retention, paths, experiments, heatmaps and replay were confirmed in the research above; the rest is from general knowledge of the product.

| PostHog feature | What it would be here | New data needed | Effort | Take it |
| --- | --- | --- | --- | --- |
| Funnels | Ordered steps (pages or events) with conversion and drop-off per step, within a visit or within N days | None | Medium | Yes, already a later epic |
| Lifecycle | Visitors each week split into new, returning, resurrected (back after a gap) and dormant | None | Small | Built: `GET /lifecycle`, per day, week or month |
| Stickiness | How many days per week or month people come back, to tell daily users from one-off visitors | None | Small | Built: `GET /stickiness`, active days over the range |
| Cohorts | Saved groups such as "pro users who visited pricing twice", usable as a filter everywhere | None | Medium | Yes, as the saved segments epic |
| Actions | Named events defined afterwards from existing data, such as "Clicked upgrade" = click on `upgrade-button`, so reports work on history | None | Small | Yes: definitions stored per project, applied at read time |
| Group analytics | `group("company", id, traits)` so SaaS apps like Skriuw can report per company or workspace, not only per person | One `groups` field on events | Medium | Built: the `groups` plugin, `group()` on the server client, and the `group:<type>` dimension |
| Saved insights and dashboards | Any breakdown, timeseries, funnel or SQL query saved and pinned to a custom dashboard | None | Medium | Yes: extends saved queries |
| Experiments with statistics | Pick a goal; the API reports each variant's conversion, the uplift and the chance it is better (Bayesian) | None, exposures already exist | Medium | Yes, later |
| Feature flags | Flags with a rollout percentage, evaluated by hashing the visitor id, and variants that feed experiments | A flags table and one SDK call | Medium | Maybe: useful with experiments, but a separate product to keep running |
| Click heatmaps | Where on a page people click and how far they scroll, aggregated per route; no recording | Click position relative to the page, in the `clicks` plugin | Medium | Maybe, as an opt-in plugin |
| Surveys | A small one-question or NPS prompt from the SDK, answers stored as events | None | Medium | Maybe, as a plugin |
| Metric alerts and email digests | "Tell me when signups drop 30% or LCP gets worse" and a weekly summary | None | Small | Yes, joins webhooks and email reports |
| Toolbar | An overlay on your own site showing clicks and speed per element while you browse it | None | Large | Later |
| Session replay | Recording and replaying sessions | Full DOM recording | Large | No: conflicts with bundle size and privacy |
| LLM observability, data warehouse, CDP destinations | Tracking AI calls, joining external data, piping events to other tools | Varies | Large | No, out of scope; webhooks cover simple forwarding |

Lifecycle and stickiness are built. The next cheapest win is actions: a read-time feature over data v2 already stores, so it needs no SDK change and no migration.

## Sources

- Plausible: [docs](https://plausible.io/docs), [custom props](https://plausible.io/docs/custom-props/introduction), [bot filtering](https://plausible.io/docs/bot-traffic-filtering), [data policy](https://plausible.io/data-policy)
- Umami: [docs](https://docs.umami.is/docs/), [tracker configuration](https://docs.umami.is/docs/tracker-configuration), [email reports](https://docs.umami.is/docs/cloud/email-reports)
- Fathom: [features](https://usefathom.com/features), [events](https://usefathom.com/docs/events/overview), [bot detection](https://usefathom.com/docs/features/bot-detection), [changelog](https://usefathom.com/changelog)
- PostHog: [web analytics](https://posthog.com/docs/web-analytics), [product analytics](https://posthog.com/docs/product-analytics), [sharing](https://posthog.com/docs/product-analytics/sharing), [cookieless](https://posthog.com/docs/tutorials/cookieless-tracking), [experiments](https://posthog.com/docs/experiments)
- GA4: [help 9216061](https://support.google.com/analytics/answer/9216061), [help 7579450](https://support.google.com/analytics/answer/7579450), [help 10737381](https://support.google.com/analytics/answer/10737381), [help 9888366](https://support.google.com/analytics/answer/9888366)
