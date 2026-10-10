# v2 plan

The plan and technical reference for the v2 rebuild. The decisions table in `plan.md` is binding.

| File | Holds |
| --- | --- |
| [plan.md](plan.md) | Decisions, product focus, architecture, monorepo, engine, API, access and roles, realtime, storage, bot detection, speed, errors, tooling, branching, phases |
| [sdk-design.md](sdk-design.md) | The public SDK API, config, usage in every environment, internal structure |
| [api-reference.md](api-reference.md) | Every route with full example responses |
| [schemas-and-types.md](schemas-and-types.md) | Semantic types, contract types, draft SQL tables |
| [alerts.md](alerts.md) | Alert events, mail and webhook channels, the admin client, storage and how to extend them |
| [deploy.md](deploy.md) | The one-time setup for Neon, Vercel, GitHub sign-in and the scheduled jobs |
| [sql-reference.md](sql-reference.md) | The SQL console's views, rules and example queries |
| [bot-readiness.md](bot-readiness.md) | How to validate and tune the bot score against real traffic before relying on it |

When a decision changes, update the file here in the same pull request as the code.
