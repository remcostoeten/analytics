# Release readiness

State of v2 against its first npm release, first checked on Oct 1, 2026 against master `74e2093` and updated on Oct 4, 2026 after the release pipeline (#96) and the first version pull request (#97). Each item names what was checked and what is left. Items marked **owner** need an account or a decision that only the owner has; agents do not run them.

## npm release

The five release blockers found on Oct 1 are resolved on Oct 4, 2026:

| Blocker | Resolution |
| --- | --- |
| Packed packages pointed at `src` | `exports` keeps `src` for the workspace. `bun run release` (`scripts/publish.ts`) writes `publishConfig.exports` into `exports` and drops `devDependencies` while it packs, then restores `package.json`. A packed `@spoar/sdk` imports and typechecks from a clean install |
| `catalog:` and `workspace:` versions | The package is packed with `bun pm pack`, which resolves both, and the tarball is published with `npm publish` |
| No release workflow | `.github/workflows/release.yml`: on every push to `master`, `changesets/action` pushes the version changes to the `changeset-release/master` branch and, once the version pull request from it merges, runs `bun run release`, which publishes every public package not yet on npm with provenance through trusted publishing (npm 11, `id-token: write`) and prints the `New tag:` lines the action turns into git tags. A manual run with `dry-run` packs and runs `npm publish --dry-run` |
| Names and visibility | `@spoar/sdk` and `@spoar/devtools` are public. `@spoar/contract` is private and bundled into both builds (tsdown `noExternal`), so neither depends on it. Its pending changesets were removed or trimmed to the public packages |
| Core size budget | 5 KB, as `scripts/size-check.ts` checks |

Left for **owner**:

- `@spoar/devtools@0.1.0-next.0` is on npm, so it can now get the same trusted publisher as `@spoar/sdk` (GitHub Actions, `remcostoeten/analytics`, `release.yml`). Without one, the release workflow fails on it after `@spoar/sdk` is published.
- GitHub Actions cannot open pull requests in this repository until "Allow GitHub Actions to create and approve pull requests" is enabled. Until then the version pull request is opened by hand from `changeset-release/master`.
- The browser matrix in `docs/release-checklist.md`, then merging the version pull request.

`latest` on `@spoar/sdk` stays the 0.0.1 placeholder until stable 2.0.0. 1.x is on npm as `@remcostoeten/analytics`.

## Deploy

The API runs in production on `api.analytics.remcostoeten.nl` (Vercel project `v2.ingestion`) and the docs site on `docs.analytics.remcostoeten.nl`. `docs/v2/deploy.md` holds the one-time setup; the owner steps still open are in milestone 1 of [finish-plan.md](finish-plan.md).

For a self-hosted copy:

- A fresh database needs no baseline: `bun run migrate` runs 0000 onward.
- Only logins in `dashboard_users` can sign in. A fresh database has none, so a self-hosted copy must insert one first. The [self-hosting guide](../../apps/docs/content/docs/guides/self-host.mdx) covers it; `deploy.md` assumes the v1 row.
- The bot checks in [bot-readiness.md](bot-readiness.md) apply once real traffic arrives.

## Checks

`ci` runs, on every pull request: build, size, typecheck, lint, format, boundaries, `sherif`, knip, all tests, and the Playwright suite. `openapi` fails a pull request whose routes and `openapi.json` disagree. CodeQL and a secrets scan run as well. `release` runs on every push to `master` and publishes only when the version pull request merges. Locally, the v1 dashboard and ingestion typechecks fail until the v1 packages are built, which CI does first.
