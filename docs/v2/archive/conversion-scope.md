# Conversion scope (archived)

Archived on Oct 1, 2026 with decision 17 in [`plan.md`](../plan.md#product-focus). v2 serves reach, traffic sources and app performance; conversion optimization is not a goal for now. Nothing below was built, so nothing is removed from the code.

| Item | Where it was planned | Why it is dropped |
| --- | --- | --- |
| Goals | Capabilities and gaps, "Gaps worth closing" item 1; the later epics list in Epics and prompts; the missing list in the API reference | A saved conversion rule per project only pays off when conversions are measured, which is not the focus |
| Funnels | Capabilities and gaps, item 2 and the PostHog table; later epics list | Built on goals; ordered drop-off steps answer a conversion question |
| Actions | Capabilities and gaps, PostHog table and "next cheapest win"; later epics list; the open decision on an actions table and migration | Answered no by Remco on Oct 1, 2026: no table, no migration |
| Experiment statistics and A/B analysis | Capabilities and gaps, PostHog table and comparison row; later epics list | Variant uplift and Bayesian chance to win are conversion analysis |
| Feature flags, click heatmaps, surveys | Capabilities and gaps, PostHog table, marked maybe | Mostly in service of experiments and conversion; out of scope for now |
| "A goal reached" webhook event | Plan, "Other ways to use the data" | No goals to reach |

## Kept on purpose

These are built, work, and stay documented as they are:

- The `experiments` plugin: an `experiment:<id>` prop on every event, one `experiment_exposure` per page load, and the `experiments` field on visitor profiles and in the `visitors` SQL view. Removing it would break SDK users and stored data for no gain.
- The `conversion_rate` metric with `filter[event]` on `timeseries` and `breakdown`: one small read option over existing data, tested, and useful for "share of visits that clicked through to the app".
- `register(props)`, `identify()` and custom events with props, which serve many uses beyond experiments.
- The two-step SQL example in [`sql-reference.md`](../sql-reference.md): an example query over existing views, not a feature.
- The 1.x dashboard's experiments card in `v1/`: 1.x is frozen and retires in phase 5.

If conversion work becomes a goal again, start from goals: a saved rule per project (event name or path pattern) with a conversion rate in `stats`; funnels, actions and experiment statistics build on it and need no new data collection.
