# e2e

Playwright tests of the built SDK against the v2 API. `serve.ts` starts one Bun process with three parts:

- The API from `apps/api` on port 4100, backed by an in-memory PGlite database with the migrations applied and one project (`pk_test`, `sk_test`, every origin allowed).
- A fixture site on port 4200 whose pages load `packages/sdk/dist` through a Bun bundle, with `/direct/<run>`, `/proxy/<run>`, `/consent/<run>` and `/vitals/<run>` pages. The vitals page shifts the layout, paints a late hero and has a button that blocks the main thread, with timings from `ports.ts`.
- `createProxy` on `/_ra`, and `/__e2e/events?run=<run>` returning the rows stored for one run.

Each test uses its own `<run>` path segment, so tests can share the database and run in parallel.

Playwright also builds the dashboard and starts it with `next start` on port 3300 against that API, with `EXPOSE_TESTING_API=1` so the build exposes the Next.js testing API. The variable must be set for both `next build` and `next start`: the page-load lock reads the config again at start. `E2E_DASHBOARD_PORT` moves the dashboard to another port when 3300 is taken. `tests/dashboard.spec.ts` uses `instant()` from `@next/playwright`, as in the Next.js instant navigation guide: a page load of each route serves that route's own skeleton, and a client navigation to each route renders its heading and controls from the prefetched shell while the API data stays behind its skeleton until the lock is released. A first test fails when the build serves full pages to a locked request, so the others cannot pass without the lock.

| Command | Does |
| --- | --- |
| `bun run --filter @spoar/sdk build` | Builds the SDK the fixture site loads; run it first |
| `bun run test:e2e` (repo root) | Runs every test; the `headed` project needs a display, so use `xvfb-run -a bun run test:e2e` on Linux without one |
| `bun run --cwd e2e serve` | Starts the servers for manual checks, as in `docs/release-checklist.md` |

`E2E_CHROMIUM_PATH` points Playwright at an existing Chromium instead of the one `playwright install chromium` downloads.

| Project | Checks |
| --- | --- |
| `headless` | Pageviews, SPA navigation, custom events and send on hide through both transports; required consent; `?ra=ignore`; web vitals, with stored LCP, INP and CLS within 10% of the browser's own measurements; uncaught errors; a headless browser scoring 50 or more; the dev widget, where a `ra.session_token` cookie with the value `1` stands in for the owner's session |
| `headless`, dashboard | For home, every project view and the admin pages: the route's skeleton on a locked page load and its shell on a locked client navigation. For the visitor, session and issue pages: the skeleton on a locked page load |
| `headed` | A headed browser without the automation flag, with scripted mouse and keyboard input, scoring under 50 |
