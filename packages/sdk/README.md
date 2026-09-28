# packages/sdk

The 2.0 SDK, built epic by epic from `docs/v2/sdk-design.md`. The core (`createAnalytics<Events>()`, batching, the beacon transport, identity, consent and `pageviews`) came in E3.1, the plugins in `./plugins` in E3.2, and the React, Next, server and proxy entries in E3.3. The end-to-end tests and the 2.0.0 release follow in E3.4.

The workspace is named `@remcostoeten/analytics-sdk` and marked private for now. `v1/packages/sdk` still owns the name `@remcostoeten/analytics` in the Bun workspaces, and the v1 dashboard installs it from there, so the rename waits for the release epic. The 2.0.0 changeset in `.changeset/sdk-2-0-0.md` names the workspace and moves with the rename.

```ts
import { createAnalytics } from "@remcostoeten/analytics-sdk";

type Events = { signup: { plan: "free" | "pro" } };

const analytics = createAnalytics<Events>({ project: "remcostoeten.nl", key: "pk_live_...", endpoint: "/_ra" });
analytics.track("signup", { plan: "pro" });
```

Options left out are read from the JSON in `NEXT_PUBLIC_RA_CONFIG`, `PUBLIC_RA_CONFIG` or `VITE_RA_CONFIG`, so `NEXT_PUBLIC_RA_CONFIG='{"key":"pk_live_...","endpoint":"/_ra"}'` and `createAnalytics()` work together. Explicit options win.

## Entries

| Entry | Exports |
| --- | --- |
| `.` | `createAnalytics`, `definePlugin` and the types |
| `./plugins` | One function per plugin, below |
| `./react` | `AnalyticsProvider`, `useAnalytics`, `TrackClick`, `ErrorBoundary`, `useRoutePageviews`, `computeRoute`; `"use client"` |
| `./next` | `Analytics`, the Next adapter that sends pageviews with the route template; `"use client"` |
| `./server` | `createServerAnalytics`, `visitorDetails`; options left out are read from `RA_CONFIG` |
| `./proxy` | `createProxy`, `createPageCounter`, `isPageRequest`; options left out are read from `RA_CONFIG` |

Next, with the adapter sending pageviews:

```tsx
import { AnalyticsProvider } from "@remcostoeten/analytics-sdk/react";
import { Analytics } from "@remcostoeten/analytics-sdk/next";

const analytics = createAnalytics<Events>({ key: "pk_live_...", endpoint: "/_ra", pageviews: false });

<AnalyticsProvider client={analytics}>
  <Analytics />
  {children}
</AnalyticsProvider>;
```

The same-origin proxy in `app/%5Fra/route.ts`, and a server event that forwards the visitor's IP and user agent:

```ts
export const POST = createProxy({ secret: env.RA_SECRET, endpoint: "https://api.remcostoeten.nl" });

const serverAnalytics = createServerAnalytics<Events>({ secret: env.RA_SECRET, endpoint: "https://api.remcostoeten.nl" });
const result = await serverAnalytics.track("signup", { plan: "pro" }, { request });
if (!result.ok) console.warn(result.error.code);
```

Server events carry the visitor and session ids passed in the call, or `server` for both.

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
| `bun run build` | tsdown into `dist/`: one ESM file with types per entry; `./react` and `./next` share one chunk so they use the same React context |
| `bun test` | Unit tests with happy-dom, and Bun's own `Request` for the server and proxy tests; every sent envelope is checked against the contract's `IngestEnvelope` |
| `bun run size` (repo root) | Fails above the budgets: core 4.5 KB, `react` 1.5 KB, `next` 1 KB, each plugin 0.6 KB, `errors` 0.7 KB, `speedInsights` 2.5 KB |
