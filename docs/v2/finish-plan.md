# Finish plan

Everything left between today and a finished v2, in order. Each step names who does it and when it counts as done. The epics and their prompts stay in [epics-and-prompts.md](epics-and-prompts.md); this file only orders them and adds the steps that are not epics.

Owner **Remco** means an account, a secret, a setting or a product decision. Owner **agent** means code in a pull request.

## Where it stands

Live on `api.analytics.remcostoeten.nl` from `master` (`7470ed0`, 4 October 2026):

- Ingest (`POST /v2/events`) with bot scoring, geo lookup, sessions and rate limits.
- Reads: stats, time series, breakdowns, paths, retention, heatmap, map, lifecycle, stickiness, realtime (long polling and server-sent events), visitor and session detail, cross-project reads, speed insights, error tracking, annotations, the SQL console, alerts and the cron jobs.
- Sign-in through GitHub with Better Auth, roles, project visibility and API tokens.
- The OpenAPI document (80 paths, 94 operations) at `/v2/openapi`, checked in CI.
- The docs site on `docs.analytics.remcostoeten.nl`.
- The landing page at `/` and `/v2` with a database check.

Built but not published: `@spoar/sdk` 2.0 and `@spoar/devtools`, both `private: true`.

Not built: the v2 dashboard (E4.5) and the retirement of v1 (E5.1).

## Milestone 1: production clean

| Step | Owner | Done when |
| --- | --- | --- |
| Add `GITHUB_TOKEN` (fine-grained, public repositories read-only) to the `v2.ingestion` Vercel project | Remco | The landing page shows the commit chart |
| Delete the duplicate Vercel project `v2.analytics-docs`; `v2.analytics.docs` serves the docs domain | Remco | One docs project builds per push |
| Check the `jobs` workflow has `API_URL` and `CRON_SECRET` in the `production` environment ([deploy.md](deploy.md) step 7) | Remco | The last rollup, cleanup and alerts runs show in `GET /v2/admin/metrics` |
| Sign in once on the API, create the organization and a first `admin` token ([deploy.md](deploy.md) step 8) | Remco | `GET /v2/auth/session` returns `isAdmin: true` |
| Download MaxMind GeoLite2 with an own free license key instead of the third-party mirror in `apps/api/scripts/download-geo.ts`: Remco creates the key as `MAXMIND_LICENSE_KEY`, the agent changes the script with a checksum check and a mirror fallback for local work | Remco, agent | Production builds fetch from `download.maxmind.com` |
| Refresh `bot-readiness.md` and `release-readiness.md`: both still say the v2 API is not deployed | agent | The docs match production |

## Milestone 2: SDK 2.0 on npm under `next`

The five blockers in [release-readiness.md](release-readiness.md), then the browser matrix.

| Step | Owner | Done when |
| --- | --- | --- |
| Keep the core size budget at 5 KB, as `scripts/size-check.ts` checks today (core is 4.91 KB), and drop the 4.5 KB figure from the notes | agent | One number everywhere |
| Point `exports` at `dist` and resolve source in the workspace through a `source` condition (`tsconfig` `customConditions`, Bun `--conditions`) for `@spoar/sdk` and `@spoar/devtools` | agent | `bun pm pack` of each package imports from a clean install |
| Bundle `@spoar/contract` into the SDK build (tsdown `noExternal`, bundled declarations) and keep it private; drop `private: true` from `@spoar/sdk` and `@spoar/devtools` | agent | A packed SDK has no `@spoar/contract` dependency; `bun run changeset` versions both packages |
| Add a `release` workflow: `changesets/action` opens the version pull request, a publish step runs `bun publish` per public package, then `changeset tag`, with provenance | agent | The workflow runs green on a dry run |
| Set up npm trusted publishing in the browser: on npmjs.com, `@spoar/sdk` (already published as the 0.0.1 placeholder), Settings, Trusted Publisher, GitHub Actions, repository `remcostoeten/analytics`, workflow `release.yml`. `@spoar/devtools` is not on npm yet, so its first version goes out once by hand or with a short-lived token, and gets the same trusted publisher afterwards | Remco | Both packages publish from CI with provenance |
| Run the blocker matrix in [release-checklist.md](../release-checklist.md): Brave standard and aggressive, uBlock Origin with EasyPrivacy, Firefox strict, Safari | Remco | Every row passes through the `/_ra` proxy and every human run scores under 50 |
| Merge the version pull request | Remco | `@spoar/sdk@2.0.0-next.x` is on npm under `next` |

## Milestone 3: own sites on v2

| Step | Owner | Done when |
| --- | --- | --- |
| Create a project per site through the API (`POST /v2/projects`) | Remco or agent with a token | Each site has a public and a secret key |
| Install `@spoar/sdk@next` on remcostoeten.nl and the other sites, through the `/_ra` proxy, next to 1.x | agent, per site repository | Events arrive in v2 for every site |
| Run v1 and v2 side by side for two weeks | none | Two weeks of v2 traffic exist |

## Milestone 4: bot detection tuned

Follows [bot-readiness.md](bot-readiness.md) once two weeks of v2 traffic exist.

| Step | Owner | Done when |
| --- | --- | --- |
| Move the threshold of 50 into one constant in `@spoar/contract`; it is repeated in seven files today | agent | One place to change it |
| Step 1: shadow-score the v1 history with `bun run rescore --dry-run` | Remco runs, agent reads | The report lists borderline combinations |
| Step 2: read the first two weeks of v2 traffic with the queries in the readiness doc | agent | Every borderline combination is judged |
| Step 3: tune weights, rescore | agent, Remco runs the rescore | The "Ready when" list in the readiness doc holds |

## Milestone 5: dashboard on v2 (E4.5)

On hold until Remco delivers the dashboard design system.

| Step | Owner | Done when |
| --- | --- | --- |
| Remco delivers the dashboard design system | Remco | E4.5 is off hold |
| Build `apps/dashboard` v2 on the Eden Treaty client, one view per commit: overview, pages and referrers, geo, devices, visitors and session trails, realtime, speed, issues, annotations on the time series | agent | Every view reads only from `/v2` |
| A parity test per view against the seeded dataset | agent | All parity tests pass |
| Sign-in through the API; remove the dashboard's own GitHub OAuth routes | agent | One sign-in for the API and the dashboard |
| Its own Vercel project on `master` | Remco | The dashboard is live |

## Milestone 6: stable 2.0.0 and v1 retired (E5.1)

| Step | Owner | Done when |
| --- | --- | --- |
| Release `@spoar/sdk@2.0.0` under `latest` after milestones 2 to 4 | Remco merges | 2.0.0 is the default install |
| Confirm no `schema_version = 0` events arrived for 14 days | agent reports, Remco confirms | No site sends 1.x events |
| Deprecate 1.x on npm with the command the agent writes | Remco | `npm deprecate` is done |
| Remove `v1/`, the legacy `/e` routes and the old dashboard API routes; keep one cleanup cron | agent | `v1/` is gone from the repository |
| Delete the v1 Vercel projects `ingestion` and `v1.analytics` | Remco | Only v2 projects remain |
| Self-hosting: root README setup, `.env.example`, `bun run setup` that migrates and creates the owner and first project, Vercel deploy buttons | agent | A fresh clone reaches a working API with one command |
| Rewrite `AGENTS.md` for the v2-only layout | agent | The guide has no v1 sections |

## After 2.0

In the order of [plan.md](plan.md) decision 17 and [capabilities-and-gaps.md](capabilities-and-gaps.md):

1. Search Console: queries, impressions, clicks and position per page, per-project connection.
2. Saved segments, reusable across reports and the public dashboard.
3. Email reports: a weekly digest on the alerts channels.
4. Metric alerts and outgoing webhooks.
5. Source maps for error stack traces.
6. Share links and embeds.
7. An MCP server over the read API.
8. A Durable Object realtime hub with WebSockets, only if long polling and server-sent events fall short.

Left out on purpose: goals, funnels, experiments, feature flags, session replay, click heatmaps and surveys.

## Decisions

| Decision | Choice | Date |
| --- | --- | --- |
| Core size budget | 5 KB, as checked today | 4 October 2026 |
| `@spoar/contract` | Bundled into the SDK, not published: it only exists to share types and validation between the SDK and the API, and a second package would mean a second install and a second version to keep in step | 4 October 2026 |
| npm publishing | Trusted publishing. Set up for `@spoar/sdk` (GitHub Actions, `remcostoeten/analytics`, `release.yml`, publish only); `@spoar/devtools` follows after its first version | 4 October 2026 |
| Dashboard design | A design system from Remco, still to come | 4 October 2026 |
| Vercel plan | Hobby. Keep the deployments per push low: v1 deploys from `master` only (#82), one docs project | 4 October 2026 |
