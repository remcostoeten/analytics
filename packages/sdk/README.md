# packages/sdk

The 2.0 browser SDK, built epic by epic from `docs/v2/sdk-design.md`. The core (`createAnalytics<Events>()`, batching, the beacon transport, identity, consent and `pageviews`) came in E3.1, and the plugins in `./plugins` in E3.2. The React, server and proxy entries and the 2.0.0 release follow in E3.3 and E3.4.

The workspace is named `@remcostoeten/analytics-sdk` and marked private for now. `v1/packages/sdk` still owns the name `@remcostoeten/analytics` in the Bun workspaces, and the v1 dashboard installs it from there, so the rename waits for the release epic.

```ts
import { createAnalytics } from "@remcostoeten/analytics-sdk";

type Events = { signup: { plan: "free" | "pro" } };

const analytics = createAnalytics<Events>({ project: "remcostoeten.nl", key: "pk_live_...", endpoint: "/_ra" });
analytics.track("signup", { plan: "pro" });
```

## Plugins

Import from `@remcostoeten/analytics-sdk/plugins`; each is one file and none imports another.

| Plugin | Sends |
| --- | --- |
| `pageviews()` | `pageview` on load and client-side navigation; on by default, and silent once an adapter supplies routes |
| `speedInsights({ sampleRate })` | `web_vital` for LCP, INP, CLS, FCP and TTFB through the lazily loaded `web-vitals` attribution build |
| `scrollDepth()` | `scroll_depth` with the deepest percentage reached |
| `engagement()` | `engagement` with the milliseconds the page was visible |
| `clicks()` | `click` for elements with `data-ra-click`, plus their `data-ra-prop-*` attributes |
| `outboundLinks()` | `outbound_click` for other hosts and `file_download` by file extension |
| `forms()` | `form_submit` with the form id and action path, nothing from the fields |
| `errors()` | `error` for uncaught errors and rejections, with 20 scrubbed breadcrumbs |
| `ignoreSelf()` | Nothing; `?ra=ignore` opts this browser out and `?ra=track` back in |
| `botSignals()` | Adds webdriver, headless and no-input bits to every event's `signals` |
| `experiments({ id: variant })` | Registers `experiment:<id>` on every event and sends one `experiment_exposure` per experiment on each page load |
| `notFound()` | `not_found` with the referrer on pages with `<meta name="ra-not-found">` |

| Command | Does |
| --- | --- |
| `bun run build` | tsdown into `dist/`, ESM with types |
| `bun test` | Unit tests with happy-dom; every sent envelope is checked against the contract's `IngestEnvelope` |
| `bun run size` (repo root) | Fails above the budgets: core 4.5 KB, each plugin 0.6 KB, `errors` 0.7 KB, `speedInsights` 2.5 KB |
