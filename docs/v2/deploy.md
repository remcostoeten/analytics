# Deploying v2

Everything below needs an account the agents cannot use: the Neon database, the Vercel team `remcostoetens-projects`, GitHub settings, a GitHub OAuth app and Google Cloud. Each step is a few clicks; the repo does the rest.

`./setup-vercel.sh` at the repo root does steps 1, 2, 5, 6, 7 and 8 in one run once step 4 is done: it creates the three projects, sets their variables and domains, starts a deploy, sets the ignored build step on the v1 projects and, when `gh` is signed in, fills the GitHub `production` environment. It needs `VERCEL_TOKEN`, `DATABASE_URL`, `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`, keeps the generated secrets in `.env.deploy`, and is safe to rerun. `./setup-vercel.sh --help` lists the optional variables.

## 1. Stop v1 building on every push

In Vercel, for both `ingestion` and `v1.analytics`: Settings, Git, Ignored Build Step, "Run my Bash script":

```bash
git diff --quiet HEAD^ HEAD -- ../../
```

The free plan allows 100 deployments a day, and every v2 merge used one per v1 project.

The v1 dashboard (`v1.analytics`) is served at `v1.analytics.remcostoeten.nl`, a DNS-only CNAME to `cname.vercel-dns.com` at Cloudflare. `analytics.remcostoeten.nl` sits on `v2.analytics-docs` as a 308 redirect to `docs.analytics.remcostoeten.nl`. The GitHub OAuth app v1 signs in with needs its callback URL on the v1 host: `https://v1.analytics.remcostoeten.nl/api/auth/callback`.

## 2. Generate the secrets

Run each once and keep the output:

```bash
openssl rand -hex 32   # IP_HASH_SECRET
openssl rand -hex 32   # BETTER_AUTH_SECRET
openssl rand -hex 32   # CRON_SECRET
```

Webhook alert targets get their signing secret from the API when they are created, so there is no alert secret to generate here.

## 3. Migrate Neon

1. GitHub, Settings, Environments, New environment `production`. Add the secret `DATABASE_URL` with the Neon connection string (the pooled one the v1 `ingestion` project uses).
2. Actions, `migrate`, Run workflow, mode `dry-run`, baseline `0008_add_rollup_daily`. It lists what would change: 0000 to 0008 baselined, 0009 to 0031 to apply.
3. Run it again with mode `apply`.

Every migration is additive, so v1 keeps working on the same database.

## 4. GitHub sign-in

GitHub, Settings, Developer settings, OAuth Apps, New:

| Field | Value |
| --- | --- |
| Homepage URL | `https://api.analytics.remcostoeten.nl` |
| Authorization callback URL | `https://api.analytics.remcostoeten.nl/v2/auth/callback/github` |

Keep the client id and a new client secret.

## 5. The API on Vercel

Project `v2.ingestion` (already created; connect it to the repository `remcostoeten/analytics` under Settings, Git), root directory `apps/api`, framework Elysia. `apps/api/vercel.json` sets Bun, the build and the MaxMind files through a `builds` entry on `@vercel/backends`, so the Build and Development Settings in the dashboard do not apply to this project; the root directory and environment variables still do. Environment variables for Production:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | The Neon connection string |
| `IP_HASH_SECRET`, `BETTER_AUTH_SECRET`, `CRON_SECRET` | From step 2 |
| `API_URL` | `https://api.analytics.remcostoeten.nl` |
| `DASHBOARD_ORIGIN` | `https://docs.analytics.remcostoeten.nl`, the landing origin that serves the dashboard at `/dashboard` and the only origin allowed to sign in and call the API from a browser |
| `AUTH_COOKIE_DOMAIN` | `.remcostoeten.nl` |
| `MAXMIND_LICENSE_KEY` | A free GeoLite2 license key from maxmind.com; the build downloads the geo files with it and checks their checksum |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | From step 4 |
| `MAIL_URL` | Optional: the SMTP server for mail alerts, such as `smtps://you%40gmail.com:<app password>@smtp.gmail.com:465`; without it mail targets stay `paused` |
| `MAIL_FROM` | Optional: the sender of alert mail, such as `Analytics <you@gmail.com>`; with Gmail it must be the account's own address |
| `INTERNAL_PROJECT_SECRET` | Optional: the secret key of a project that should collect the API's own errors |
| `CRUX_API_KEY` | Optional: a Google Cloud API key with the Chrome UX Report API enabled |

Add the domain `api.analytics.remcostoeten.nl`. Check `https://api.analytics.remcostoeten.nl/v2/health` answers `ok: true`.

## 6. The docs site on Vercel

Project `v2.analytics-docs` (already created, with `docs.analytics.remcostoeten.nl`), same repository, root directory `apps/docs`, framework Next.js, build command `bun run build`, install command `bun install`. Optional variables `NEXT_PUBLIC_API_URL` (defaults to `https://api.analytics.remcostoeten.nl`) and `DASHBOARD_URL` (defaults to `https://dashboard.analytics.remcostoeten.nl`, the target of the `/dashboard` rewrite). Add a domain such as `docs.analytics.remcostoeten.nl`.

The site tracks itself and shows its own numbers on the landing page. Create its project once, as an owner or with an `admin` token:

```bash
curl -X POST https://api.analytics.remcostoeten.nl/v2/projects \
  -H "authorization: Bearer $SPOAR_TOKEN" \
  -H "content-type: application/json" \
  -d '{"id":"docs.analytics.remcostoeten.nl","name":"Spoar docs","domain":"docs.analytics.remcostoeten.nl","allowedOrigins":["https://docs.analytics.remcostoeten.nl"]}'
```

Then set on `v2.analytics-docs`:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SPOAR_CONFIG` | `{"project":"docs.analytics.remcostoeten.nl","key":"<publicKey>","endpoint":"/_ra"}` |
| `SPOAR_SECRET` | The `secretKey` from the answer |
| `SPOAR_SQL_TOKEN` | An `at_live_` token with the `sql` scope that lists the docs project, from the dashboard's API tokens page. It turns on the tools section on the landing page; without it the section is left out |

Until the project exists the landing page renders with empty numbers and the site sends nothing.

## 7. Scheduled jobs

GitHub, Settings, Environments, `production`: add the variable `API_URL` (`https://api.analytics.remcostoeten.nl`) and the secret `CRON_SECRET` from step 2. The `jobs` workflow then runs:

| When (UTC) | Job |
| --- | --- |
| Every 10 minutes | `alerts` |
| Daily 02:17 | `rollup`, then `cleanup` |
| Mondays 04:43 | `crux` |

Until both are set, the workflow only prints a notice. A job that is not configured on the API, such as `crux` without `CRUX_API_KEY` or `alerts` without `alerts()` in `apps/api/analytics.config.ts`, is reported as a notice rather than a failure.

Alerts are on in `apps/api/analytics.config.ts` with the mail, webhook and Discord channels. Each project sets its own targets with `PUT /v2/projects/:project/alerts/targets` or `admin.alerts.sync` from `@spoar/sdk/admin`; `POST .../targets/:name/test` checks one at once, and `GET /v2/admin/alerts/status` shows whether mail is ready. To send mail through Resend instead of SMTP, change the transport in the config to `resend(process.env.RESEND_API_KEY)` and set `RESEND_API_KEY`. Run any job by hand from Actions, `jobs`, Run workflow.

## 8. The dashboard on Vercel

Project `v2.dashboard` (created 8 October 2026, with `dashboard.analytics.remcostoeten.nl`), same repository, root directory `apps/dashboard`, framework Next.js, build command `bun run build`, install command `bun install`. Variable `NEXT_PUBLIC_API_URL` set to `https://api.analytics.remcostoeten.nl`. Optional variable `NEXT_PUBLIC_SITE_URL` (defaults to `https://docs.analytics.remcostoeten.nl`) for the links back to the docs.

The app's `basePath` is `/dashboard`, and `v2.analytics-docs` rewrites `/dashboard` and everything under it to this project (decision 24), so people open the dashboard at `https://docs.analytics.remcostoeten.nl/dashboard`. Set `DASHBOARD_URL` on `v2.analytics-docs` to `https://dashboard.analytics.remcostoeten.nl` (the default) and the API's `DASHBOARD_ORIGIN` to the landing origin, because the browser sends sign-in requests from there. `AUTH_COOKIE_DOMAIN` covers both hosts; sign-in only works on a custom domain, never on the `vercel.app` one, because the session cookie is set on `.remcostoeten.nl`. The rewrite is a `beforeFiles` rewrite on purpose: as an `afterFiles` rewrite, Vercel first turns the dashboard's RSC prefetches into `.rsc` and `.segments/…` paths for the docs app, and the dashboard answers those with 404.

Public projects render for anonymous visitors, and every breakdown row links to the same page with one more filter, so the URL space has no end. On 18 October 2026 an automated client walked it at about one page every four seconds, each page rendering on the server and calling the API about 17 times, which cost `v2.dashboard` about a minute of Active CPU an hour. Three things keep compliant crawlers out: `apps/docs/app/robots.ts` disallows `/dashboard`, the dashboard serves `Disallow: /` at `/dashboard/robots.txt` (its own host's `/robots.txt` redirects there) and sends `X-Robots-Tag: noindex, nofollow, noarchive`, and its links are `nofollow`. Custom Vercel Firewall rules need a paid plan, so the apps refuse the clients that ignore robots.txt themselves: `apps/docs/proxy.ts` and `apps/dashboard/src/proxy.ts` answer 403 under `/dashboard` to the user agents `isAiCrawler` in `@spoar/shared/crawlers` names. That list came from 21 to 23 October 2026, when `meta-externalagent` sent about 66,000 requests to the public pages in two days, each render also reading the session and the project list, until the API on Workers Free hit its 100,000 requests a day and answered 1027 to every call, sign-in included. Anonymous renders no longer read the session, and the public project list is shared for a minute. A per-IP rate limit does not catch it, because that client rotated through many AWS addresses; `vercel metrics vercel.request.count --project v2.dashboard --group-by client_ja4_digest --group-by client_user_agent` shows the TLS fingerprint and user agent to match on.

## 9. First sign-in and token

Open `https://docs.analytics.remcostoeten.nl/dashboard` and sign in with GitHub. The first login in `dashboard_users` to sign in owns the organization; the v1 database already has your login in that table, and on a fresh database `bun run setup --owner <login>` adds it. The projects page under `/dashboard/admin/projects` creates projects, shows their keys once with the env block to paste, rotates secrets and edits allowed origins. The members page under `/dashboard/admin/members` is where the owner allows other GitHub logins, with a role and projects (decision 34); set `GITHUB_TOKEN` on the API to lift GitHub's 60 lookups an hour. `GET /v2/setup`, the old setup page, redirects there (decision 21).

For a token for scripts and the docs site's query page, create one under `/dashboard/admin/tokens` with the `sql` scope; it is shown once.

## 10. Releasing to npm

Every push to `master` runs `release.yml`. It first runs `bun run release` (`scripts/publish.ts`), which publishes each public package whose `master` version is stable and not yet on npm, to the `latest` tag with provenance, and turns each published version into a git tag and a GitHub release. It then runs `changeset version` and, when there are pending changesets, force-pushes the result to `changeset-release/master` behind one "version packages" pull request. Merging that pull request is the release: the push it makes publishes the new versions.

There is no `next` tag and no pre mode. Prerelease versions are skipped, never published. A package that fails to publish does not stop the others; the job goes red with a `::error::` line naming it, and the next push to `master` retries it, so fixing the cause and pushing (or running the workflow by hand with `dry-run` off) is all a failed release needs.

A 404 on `PUT https://registry.npmjs.org/@spoar%2f<name>` after the provenance line means npm did not accept the GitHub Actions identity for that package: its trusted publisher is missing or names another repository or workflow. Fix it on npmjs.com under the package's Settings, Trusted Publisher: GitHub Actions, repository `remcostoeten/analytics`, workflow `release.yml`, no environment.

### A new package

Trusted publishing only works for a package that already exists on npm. The first version of a new package is published by hand once:

```sh
bun run --filter './packages/*' build
cd packages/<name>
cp package.json /tmp/package.json.bak
bun -e 'import { publishManifest } from "../../scripts/publish.ts"; const m = JSON.parse(await Bun.file("package.json").text()); await Bun.write("package.json", `${JSON.stringify(publishManifest(m), null, "\t")}\n`)'
npm publish --access public
mv /tmp/package.json.bak package.json
```

Then add the trusted publisher as above. The hand-published version gets no git tag or GitHub release.

## 11. Deploying on demand

Git deploys are off for all five Vercel projects: each `vercel.json` (`apps/api`, `apps/docs`, `apps/dashboard`, `v1/apps/ingestion`, `v1/apps/dashboard`) sets `"git": { "deploymentEnabled": false }`, so pushes and pull requests create no deployments and the free plan's deployment quota is spent only on purpose. Deploy a project when it should go live:

- Vercel dashboard: open the project, Deployments, Create Deployment, and pick `master` (or a commit). It builds with the project's settings and, from `master`, goes to production.
- CLI, from the repository root with the project linked: `vercel deploy --prod --cwd apps/api` (likewise `apps/docs`, `apps/dashboard`).
- `bun run deploy`: fetches `origin/master`, shows each v2 project's live production deployment (state, commit, age, how many commits it is behind and how many touch its paths, and a newer failed or canceled attempt), asks which to deploy, confirms, starts production deploys of `master` and follows them until `READY` or `ERROR`. It reads `VERCEL_TOKEN`, or the token `vercel login` saved. `--status` only prints the table, `bun run deploy dashboard docs` skips the picker, `--yes` skips the confirmation, and `VERCEL_TEAM` overrides the team.

To turn automatic deploys back on for one project, remove its `git` block.

