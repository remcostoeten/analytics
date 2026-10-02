# Release readiness

State of v2 against a first deploy and a first npm release, as checked on Oct 1, 2026 against master `74e2093`. Each item names what was checked and what is left. Items marked **owner** need an account or a decision that only the owner has; agents do not run them.

## Blockers for an npm release

### 1. Published packages would point at source files

`packages/sdk` and `packages/contract` keep `exports` pointing at `./src/*.ts` for the workspace and put the `./dist` paths in `publishConfig.exports`. Only pnpm applies `publishConfig.exports`. Neither `npm pack` nor `bun pm pack` does: a packed `@remcostoeten/analytics-contract` still has `"default": "./src/index.ts"`, while `files` ships only `dist`. An install of either package would fail to import.

Options, for the owner to pick:

- Swap the two: `exports` points at `dist`, and the workspace resolves source through a custom condition such as `"source"`, set in `tsconfig` `customConditions` and Bun's `--conditions`.
- Rewrite `exports` from `publishConfig` in a `prepack` script and restore it in `postpack`.
- Publish with pnpm, which applies `publishConfig` natively.

### 2. `catalog:` and `workspace:` versions must be resolved at publish

`packages/contract` depends on `"@sinclair/typebox": "catalog:typebox"`, and the SDK on `"@remcostoeten/analytics-contract": "workspace:*"`. `npm pack` keeps both strings as they are, which no registry install can resolve. `bun pm pack` and `bun publish` replace them with real versions (checked: `catalog:typebox` becomes `0.34.52`). `changeset publish` calls `npm publish`, so the release must publish with `bun publish` per package and then run `changeset tag`.

### 3. No release workflow

`docs/release-checklist.md` and the plan say merging the Changesets version pull request publishes from CI with provenance, but `.github/workflows` has only `ci`, `codeql`, `jobs`, `migrate` and `openapi`. A `release` workflow needs: `changesets/action` to open the version pull request, a publish step that runs `bun publish` for each public package, npm trusted publishing or an `NPM_TOKEN` secret, and `id-token: write` for provenance. **Owner**: the npm side (token or trusted publisher) and approving the workflow.

### 4. Package names and visibility

- `packages/sdk` is named `@remcostoeten/analytics-sdk` and is `private: true`. Decision 0005 recommends publishing 2.0 as `@remcostoeten/analytics`, the 1.x name, under the `next` tag first. **Owner**: confirm 0005, then rename and drop `private`.
- `packages/contract` is public with version `0.0.0` and 19 pending minor changesets, so the first version pull request would release it as `0.1.0`. The SDK imports it at runtime (`plugins.mjs` for `signals`, `proxy.mjs`) and in its type declarations, so it must be published with the SDK or bundled into it.
- 8 pending changesets name `@remcostoeten/analytics-sdk`. While it is private, Changesets does not version it (`privatePackages.version: false`).

### 5. Core size budget

`bun run size` measures the core `index.mjs` at 4.91 KB gzip against a 5 KB budget in `scripts/size-check.ts`. The project notes put the budget at 4.5 KB. **Owner**: confirm which limit holds; at 4.5 KB the core is 0.41 KB over.

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
