# Capabilities and gaps

Sep 27, 2026, scope updated Oct 1, 2026

v2 covers core web analytics, custom typed events, web vitals, error tracking, public dashboards and a documented read API. Its focus is reach, traffic sources and app performance (decision 17, [Product focus](plan.md#product-focus)). Next to Plausible, Umami, Fathom, PostHog and GA4, the gaps that matter for that focus are Search Console, saved segments and email reports. Goals, funnels, actions and experiment statistics are left out on purpose; [archive/conversion-scope.md](archive/conversion-scope.md) says why.

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
| `identify()`, `experiments` plugin | User id and traits, experiment variant and one exposure per page load, attached to later events | Manual, consent-gated |
| Server SDK | Events from API routes, jobs and webhooks, with the visitor's UA and IP forwarded for hashing | Manual |

Reports the API returns: headline stats against the previous period, time series by hour or day, top values for 18 dimensions, filters on any dimension, realtime, raw events, visitor profiles, session trails, and internal-traffic marking.

## Compared with other tools

Yes means the vendor's docs describe the feature; unverified means the research did not find it on a page it opened. The v2 column is the plan as of the scope update. Goals, funnels and experiment statistics are not in the table because v2 does not plan them.

| Capability | v2 plan | Plausible | Umami | Fathom | PostHog | GA4 |
| --- | --- | --- | --- | --- | --- | --- |
| Public dashboards | Yes, per project | Yes | Yes | Yes | Yes | Unverified |
| Read API | Yes, with OpenAPI | Yes | Yes | Yes | Yes | Unverified |
| Custom events with props | Yes, typed | Yes | Yes | Name and value only | Yes | Unverified |
| Retention and cohorts | Yes, `GET /retention` | Unverified | Yes | Unverified | Yes | Yes |
| Journeys and paths | Yes, `GET /paths` and session trails | Yes | Yes | Unverified | Yes | Yes |
| Revenue | Events with revenue props, no report | Yes | Yes | Yes | Yes | Unverified |
| UTM and campaigns | Yes | Yes | Yes | Yes | Yes | Unverified |
| Outbound links, file downloads | Yes, `outboundLinks` plugin | Opt-in | Unverified | Manual | Outbound only | Yes |
| 404 pages | Yes, `notFound` plugin | Yes | Unverified | Custom event | Partial | Custom event |
| Web vitals | Yes, with a speed score per route | Unverified | Yes | Unverified | Yes | Unverified |
| Session replay, heatmaps | No | Unverified | Yes | Unverified | Yes | Unverified |
| Email reports and alerts | Alerts by mail, webhook and Discord; no email reports yet | Yes | Yes | Yes | Yes | Unverified |
| Annotations | Yes, API and admin SDK; drawn by the v2 dashboard | Yes | Yes | Yes | Yes | Yes |
| CSV export and import | Export as CSV, JSON or SQL; no import | Yes | Yes | Yes | Partial | Unverified |
| Search Console | Planned | Yes | Unverified | Yes | Yes | Yes |
| Saved segments | Per-request filters only | Yes | Yes | Yes | Yes | Yes |
| Bot filtering | Scored: headers, ASN, client signals, session behaviour | UA list, referrer spam, data-center IP ranges | Manual IP filters | Bot UAs, data-center IPs | Client-side known-bot list | Automatic, not configurable |
| Cookieless by default | Yes | Yes | Yes | Yes | No | Unverified |

## Gaps worth closing

In priority order, for the focus on reach, traffic sources and app performance. Each is one more resource in the API.

1. **Search Console**: search queries, impressions, clicks and position per page next to traffic, from Google's API with a per-project connection.
2. **Saved segments**: named filter sets reusable across reports and the public dashboard.
3. **Email reports**: a weekly digest from the cron job, on the alerts channels.

Built since this comparison: file downloads and 404 pages (plugins), CSV export, retention, paths, lifecycle, stickiness, group analytics, alerts, annotations (dated labels for releases, posts, content updates and incidents; the dashboard draws them later).

Left out on purpose: goals, funnels, actions and experiment statistics, because conversion optimization is not a goal for now; and session replay, heatmaps and feature flags, because they need a much larger client and much more stored data, and conflict with the bundle budget and the privacy stance. GA import is possible later but depends on an external API.

## Ideas from PostHog

PostHog is a product analytics suite rather than a web analytics tool, so much of it goes further than v2 plans. These are its features that fit v2's data and privacy stance. Its retention, paths, experiments, heatmaps and replay were confirmed in the research above; the rest is from general knowledge of the product. Funnels, actions and experiment statistics were rows here; they are dropped with the scope update of Oct 1, 2026.

| PostHog feature | What it would be here | New data needed | Effort | Take it |
| --- | --- | --- | --- | --- |
| Lifecycle | Visitors each week split into new, returning, resurrected (back after a gap) and dormant | None | Small | Built: `GET /lifecycle`, per day, week or month |
| Stickiness | How many days per week or month people come back, to tell daily users from one-off visitors | None | Small | Built: `GET /stickiness`, active days over the range |
| Cohorts | Saved groups such as "pro users who visited pricing twice", usable as a filter everywhere | None | Medium | Yes, as the saved segments epic |
| Group analytics | `group("company", id, traits)` so SaaS apps like Skriuw can report per company or workspace, not only per person | One `groups` field on events | Medium | Built: the `groups` plugin, `group()` on the server client, and the `group:<type>` dimension |
| Saved insights and dashboards | Any breakdown, timeseries or SQL query saved and pinned to a custom dashboard | None | Medium | Yes: extends saved queries |
| Feature flags | Flags with a rollout percentage, evaluated by hashing the visitor id | A flags table and one SDK call | Medium | No: mainly useful for experiments, which are out of scope |
| Click heatmaps | Where on a page people click and how far they scroll, aggregated per route; no recording | Click position relative to the page, in the `clicks` plugin | Medium | No, for now: conversion-oriented |
| Surveys | A small one-question or NPS prompt from the SDK, answers stored as events | None | Medium | No, for now |
| Metric alerts and email digests | "Tell me when signups drop 30% or LCP gets worse" and a weekly summary | None | Small | Yes, joins webhooks and email reports |
| Toolbar | An overlay on your own site showing clicks and speed per element while you browse it | None | Large | Later |
| Session replay | Recording and replaying sessions | Full DOM recording | Large | No: conflicts with bundle size and privacy |
| LLM observability, data warehouse, CDP destinations | Tracking AI calls, joining external data, piping events to other tools | Varies | Large | No, out of scope; webhooks cover simple forwarding |

Lifecycle, stickiness and group analytics are built. Next from this list are metric alerts and email digests, which build on the alerts plugin.

## Sources

- Plausible: [docs](https://plausible.io/docs), [custom props](https://plausible.io/docs/custom-props/introduction), [bot filtering](https://plausible.io/docs/bot-traffic-filtering), [data policy](https://plausible.io/data-policy)
- Umami: [docs](https://docs.umami.is/docs/), [tracker configuration](https://docs.umami.is/docs/tracker-configuration), [email reports](https://docs.umami.is/docs/cloud/email-reports)
- Fathom: [features](https://usefathom.com/features), [events](https://usefathom.com/docs/events/overview), [bot detection](https://usefathom.com/docs/features/bot-detection), [changelog](https://usefathom.com/changelog)
- PostHog: [web analytics](https://posthog.com/docs/web-analytics), [product analytics](https://posthog.com/docs/product-analytics), [sharing](https://posthog.com/docs/product-analytics/sharing), [cookieless](https://posthog.com/docs/tutorials/cookieless-tracking), [experiments](https://posthog.com/docs/experiments)
- GA4: [help 9216061](https://support.google.com/analytics/answer/9216061), [help 7579450](https://support.google.com/analytics/answer/7579450), [help 10737381](https://support.google.com/analytics/answer/10737381), [help 9888366](https://support.google.com/analytics/answer/9888366)
