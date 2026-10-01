# 0017 Product scope

## Context

The plan listed goals, funnels, actions and experiment statistics as later epics, next to annotations, Search Console and the v2 dashboard. Analytics is used to bring more visitors to Remco's own apps and to show their reach, traffic sources and performance. Conversion optimization is not needed now.

## Decision

v2 serves reach, traffic sources and app performance. In order: visitors, pages, traffic sources and realtime; bot detection; speed insights and error tracking; annotations to compare campaigns, posts and releases; Search Console; reliability, privacy and self-hosting; the v2 dashboard last. Goals, funnels, actions and experiment statistics are not planned. What is already built stays.

## Status

Settled on Oct 1, 2026. Source: row 17 of the decisions table in [`docs/v2/plan.md`](../v2/plan.md#decisions-needed).

## Consequences

- No actions table and no migration for it.
- The `experiments` plugin and the `conversion_rate` metric stay, documented as they are, without plans to extend them.
- The dropped items and their reasons are in [`docs/v2/archive/conversion-scope.md`](../v2/archive/conversion-scope.md).
