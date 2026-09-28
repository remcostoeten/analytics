# e2e

Playwright tests of the built SDK against the v2 API. `serve.ts` starts one Bun process with three parts:

- The API from `apps/api` on port 4100, backed by an in-memory PGlite database with the migrations applied and one project (`pk_test`, `sk_test`, every origin allowed).
- A fixture site on port 4200 whose pages load `packages/sdk/dist` through a Bun bundle, with `/direct/<run>`, `/proxy/<run>` and `/consent/<run>` pages.
- `createProxy` on `/_ra`, and `/__e2e/events?run=<run>` returning the rows stored for one run.

Each test uses its own `<run>` path segment, so tests can share the database and run in parallel.

| Command | Does |
| --- | --- |
| `bun run --filter @remcostoeten/analytics-sdk build` | Builds the SDK the fixture site loads; run it first |
| `bun run test:e2e` (repo root) | Runs every test; the `headed` project needs a display, so use `xvfb-run -a bun run test:e2e` on Linux without one |
| `bun run --cwd e2e serve` | Starts the servers for manual checks, as in `docs/release-checklist.md` |

`E2E_CHROMIUM_PATH` points Playwright at an existing Chromium instead of the one `playwright install chromium` downloads.

| Project | Checks |
| --- | --- |
| `headless` | Pageviews, SPA navigation, custom events and send on hide through both transports; required consent; `?ra=ignore`; web vitals; uncaught errors; a headless browser scoring 50 or more |
| `headed` | A headed browser without the automation flag, with scripted mouse and keyboard input, scoring under 50 |
