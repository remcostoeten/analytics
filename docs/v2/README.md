# v2 plan

The plan for the v2 rebuild, exported from the "Analytics SDK v2 plan" doc on Sep 27, 2026. These files are the copy agents read; the decisions table in `plan.md` is binding.

| File | Holds |
| --- | --- |
| [plan.md](plan.md) | Decisions, product focus, architecture, monorepo, engine, API, access and roles, realtime, storage, bot detection, speed, errors, tooling, branching, phases |
| [sdk-design.md](sdk-design.md) | The public SDK API, config, usage in every environment, internal structure |
| [api-reference.md](api-reference.md) | Every route with full example responses |
| [schemas-and-types.md](schemas-and-types.md) | Semantic types, contract types, draft SQL tables |
| [alerts.md](alerts.md) | Alert events, mail and webhook channels, the admin client, storage and how to extend them |
| [deploy.md](deploy.md) | The one-time setup for Neon, Vercel, GitHub sign-in and the scheduled jobs |
| [sql-reference.md](sql-reference.md) | The SQL console's views, rules and example queries |
| [capabilities-and-gaps.md](capabilities-and-gaps.md) | What v2 tracks, how it compares with other tools, and which gaps matter for the product focus |
| [epics-and-prompts.md](epics-and-prompts.md) | The work, split into epics with ready-to-paste prompts |
| [archive/](archive/) | Scope that was planned and dropped, with the reason |

When a decision changes, update the file here in the same pull request as the code.
