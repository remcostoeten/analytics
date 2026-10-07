# Deploying v2

Everything below needs an account the agents cannot use: the Neon database, the Vercel team `remcostoetens-projects`, GitHub settings, a GitHub OAuth app and Google Cloud. Each step is a few clicks; the repo does the rest.

`./setup-vercel.sh` at the repo root does steps 1, 2, 5, 6 and 7 in one run once step 4 is done: it creates both projects, sets their variables and domains, starts a deploy, sets the ignored build step on the v1 projects and, when `gh` is signed in, fills the GitHub `production` environment. It needs `VERCEL_TOKEN`, `DATABASE_URL`, `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`, keeps the generated secrets in `.env.deploy`, and is safe to rerun. `./setup-vercel.sh --help` lists the optional variables.

## 1. Stop v1 building on every push

In Vercel, for both `ingestion` and `v1.analytics`: Settings, Git, Ignored Build Step, "Run my Bash script":

```bash
git diff --quiet HEAD^ HEAD -- ../../
```

The free plan allows 100 deployments a day, and every v2 merge used one per v1 project.

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
| `DASHBOARD_ORIGIN` | `https://analytics.remcostoeten.nl` (the dashboard or docs origin that signs in) |
| `AUTH_COOKIE_DOMAIN` | `.remcostoeten.nl` |
| `MAXMIND_LICENSE_KEY` | A free GeoLite2 license key from maxmind.com; the build downloads the geo files with it and checks their checksum |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | From step 4 |
| `MAIL_URL` | Optional: the SMTP server for mail alerts, such as `smtps://you%40gmail.com:<app password>@smtp.gmail.com:465`; without it mail targets stay `paused` |
| `MAIL_FROM` | Optional: the sender of alert mail, such as `Analytics <you@gmail.com>`; with Gmail it must be the account's own address |
| `INTERNAL_PROJECT_SECRET` | Optional: the secret key of a project that should collect the API's own errors |
| `CRUX_API_KEY` | Optional: a Google Cloud API key with the Chrome UX Report API enabled |

Add the domain `api.analytics.remcostoeten.nl`. Check `https://api.analytics.remcostoeten.nl/v2/health` answers `ok: true`.

## 6. The docs site on Vercel

Project `v2.analytics-docs` (already created, with `docs.analytics.remcostoeten.nl`), same repository, root directory `apps/docs`, framework Next.js, build command `bun run build`, install command `bun install`. Optional variable `NEXT_PUBLIC_API_URL` (defaults to `https://api.analytics.remcostoeten.nl`). Add a domain such as `docs.analytics.remcostoeten.nl`.

## 7. Scheduled jobs

GitHub, Settings, Environments, `production`: add the variable `API_URL` (`https://api.analytics.remcostoeten.nl`) and the secret `CRON_SECRET` from step 2. The `jobs` workflow then runs:

| When (UTC) | Job |
| --- | --- |
| Every 10 minutes | `alerts` |
| Daily 02:17 | `rollup`, then `cleanup` |
| Mondays 04:43 | `crux` |

Until both are set, the workflow only prints a notice. A job that is not configured on the API, such as `crux` without `CRUX_API_KEY` or `alerts` without `alerts()` in `apps/api/analytics.config.ts`, is reported as a notice rather than a failure.

Alerts are on in `apps/api/analytics.config.ts` with the mail, webhook and Discord channels. Each project sets its own targets with `PUT /v2/projects/:project/alerts/targets` or `admin.alerts.sync` from `@spoar/sdk/admin`; `POST .../targets/:name/test` checks one at once, and `GET /v2/admin/alerts/status` shows whether mail is ready. To send mail through Resend instead of SMTP, change the transport in the config to `resend(process.env.RESEND_API_KEY)` and set `RESEND_API_KEY`. Run any job by hand from Actions, `jobs`, Run workflow.

## 8. First sign-in and token

Open `https://api.analytics.remcostoeten.nl/v2/setup` and sign in with GitHub. The first login in `dashboard_users` to sign in owns the organization; the v1 database already has your login in that table, and on a fresh database `bun run setup --owner <login>` adds it. The page creates projects, shows their keys once with the env block to paste, rotates secrets and edits allowed origins.

For a token for scripts and the docs site's query page, run this in that tab's console; it is shown once:

```js
const token = await fetch("/v2/tokens", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ name: "docs query page", scope: "sql" }),
});
console.log(await token.json());
```
