# SDK 2.0 release checklist

Automated tests cover one Chromium build. Before the 2.0.0 version pull request is merged, Remco runs the fixture site by hand in the browsers and blockers below and records what reached the database. The goal is to know, per setup, whether events arrive through the direct transport and through the `/_ra` proxy, and whether real visitors are scored as humans.

## Setup

1. `bun install`, then `bun run --filter @spoar/sdk build`.
2. `bun run --cwd e2e serve`. The fixture site runs on `http://localhost:4200` and the API on `http://localhost:4100`, both against an in-memory PGlite database that starts empty.
3. Open `http://localhost:4200/direct/<run>` and `http://localhost:4200/proxy/<run>`, where `<run>` is a word naming the browser, such as `brave-aggressive`.
4. On each page: move the mouse, type in the input, press **Next page**, press **Throw an error**, then close the tab.
5. Read what was stored at `http://localhost:4200/__e2e/events?run=<run>`.

## Matrix

For each row, record for both transports: whether the pageviews, the `web_vital` events and the `error` event were stored, the highest `bot_score`, and any `bot_reasons`.

| Browser | Setting | Direct | Proxy | Highest bot score | Notes |
| --- | --- | --- | --- | --- | --- |
| Brave | Shields standard | | | | |
| Brave | Shields aggressive | | | | |
| Chrome | uBlock Origin with EasyPrivacy | | | | |
| Firefox | Enhanced Tracking Protection strict | | | | |
| Safari | Default, with Advanced Tracking and Fingerprinting Protection | | | | |
| Chrome | No extensions, as the baseline | | | | |

## What passes

- The proxy transport stores every event in every row. A blocker that stops `/_ra` is a release blocker.
- The direct transport may be blocked; record it, because it shows what sites without the proxy lose.
- Every human run scores under 50. Brave's randomised screen and hardware values must not add bot weight.
- Nothing is stored after `?ra=ignore`, and nothing is stored on the consent page before **Grant consent**.

## After the matrix

- Note any blocker rule that matched, from the extension's logger, in the Notes column.
- File an issue for each failed row before merging the version pull request.
- Merging the Changesets version pull request publishes to npm; that step is Remco's. `.github/workflows/release.yml` runs on every push to `master`: it runs `bun run release` (`scripts/publish.ts`), which publishes every stable public package version not yet on npm to the `latest` tag with provenance and prints a `New tag:` line per package, then keeps the version changes on the `changeset-release/master` branch. Until GitHub Actions may create pull requests in this repository, Remco opens the version pull request from that branch by hand.
