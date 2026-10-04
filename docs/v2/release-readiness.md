# Release readiness

State of v2 against a first deploy and a first npm release, as checked on Oct 1, 2026 against master `74e2093`. Each item names what was checked and what is left. Items marked **owner** need an account or a decision that only the owner has; agents do not run them.

## npm release

The five release blockers found on Oct 1 are resolved on Oct 4, 2026:

| Blocker | Resolution |
| --- | --- |
| Packed packages pointed at `src` | `exports` keeps `src` for the workspace. `bun run release` (`scripts/publish.ts`) writes `publishConfig.exports` into `exports` and drops `devDependencies` while it packs, then restores `package.json`. A packed `@spoar/sdk` imports and typechecks from a clean install |
| `catalog:` and `workspace:` versions | The package is packed with `bun pm pack`, which resolves both, and the tarball is published with `npm publish` |
| No release workflow | `.github/workflows/release.yml`: on `master`, `changesets/action` opens the version pull request and, once it merges, runs `bun run release`, which publishes every public package not yet on npm with provenance through trusted publishing (npm 11, `id-token: write`) and prints the `New tag:` lines the action turns into git tags. A manual run with `dry-run` packs and runs `npm publish --dry-run` |
| Names and visibility | `@spoar/sdk` and `@spoar/devtools` are public. `@spoar/contract` is private and bundled into both builds (tsdown `noExternal`), so neither depends on it. Its pending changesets were removed or trimmed to the public packages |
| Core size budget | 5 KB, as `scripts/size-check.ts` checks |

Left for **owner**: the first `@spoar/devtools` version is not on npm, so trusted publishing cannot be set up for it until it is published once by hand; until then the release workflow fails on it after `@spoar/sdk` is published. Then the browser matrix in `docs/release-checklist.md`, and merging the version pull request.

## Before the first deploy

### Migrations

- 0009 to 0030 are additive and not applied to Neon yet. The `migrate` workflow runs them with baseline `0008_add_rollup_daily` (`docs/v2/deploy.md`, step 3). **Owner**.
- 0031 (annotations, pull request #69) follows once it merges. Update the range in `deploy.md` step 3 in the same change.
- A fresh database for a self-hosted copy needs no baseline: `bun run migrate` runs 0000 onward.

### Sign-in

Only logins in `dashboard_users` can sign in. Remco's login is there from v1. A fresh database has none, so a self-hosted copy must insert one first. The new [self-hosting guide](../../apps/docs/content/docs/guides/self-host.mdx) covers it; `deploy.md` assumes the v1 row.

### Manual steps, in order

All are **owner** steps, from `docs/v2/deploy.md`:

1. Set the Ignored Build Step on the v1 `ingestion` and `v1.analytics` Vercel projects. Every pull request currently fails the `ingestion` preview.
2. Generate `IP_HASH_SECRET`, `BETTER_AUTH_SECRET` and `CRON_SECRET`.
3. Run the `migrate` workflow, dry run first.
4. Create the GitHub OAuth app.
5. Set up the `v2.ingestion` Vercel project with the variables in step 5, including `MAIL_URL` and `MAIL_FROM` for mail alerts.
6. Set `API_URL` and `CRON_SECRET` on the GitHub `production` environment so the `jobs` workflow runs.
7. Sign in once and create a token.
8. Run the browser matrix in `docs/release-checklist.md`, and the bot checks in [bot-readiness.md](bot-readiness.md) once real traffic arrives.

## Checks

`ci` runs, on every pull request: build, size, typecheck, lint, format, boundaries, `sherif`, knip, all tests, and the Playwright suite. `openapi` fails a pull request whose routes and `openapi.json` disagree. CodeQL and a secrets scan run as well. Locally, the v1 dashboard and ingestion typechecks fail until the v1 packages are built, which CI does first.

## Open pull requests at the time of writing

| PR | What | State |
| --- | --- | --- |
| #22 | v1 dashboard auth and internal traffic | Superseded: every fix in it is on master through #24; the rest is dashboard UI |
| #64 | Record helpers and shared limits | Being repaired in its own thread |
| #69 | Annotations | Reviewed, no blockers; six product decisions listed in its thread |
| #70 | Bot detection readiness plan | Docs only |
| #71 | Error tracking fixes | CI green |
| #72 | Speed Insights fixes | CI running |
