# @remcostoeten/analytics

Privacy-first analytics for browsers, servers and React, sending to a self-hosted analytics API. Version 2 is ESM only, has typed events, batches requests, keeps no cookies, and adds features through plugins so an app only ships what it uses.

The workspace is named `@remcostoeten/analytics-sdk` and marked private until the 2.0.0 release, because `v1/packages/sdk` still owns `@remcostoeten/analytics` in the Bun workspaces. The examples use the published name.

## Install

```bash
npm install @remcostoeten/analytics
```

## Quick start

`events.ts` lists every custom event once, for the browser and the server:

```ts
import type { NoProps } from "@remcostoeten/analytics";

export type Events = {
  signup: { plan: "free" | "pro" };
  newsletter_subscribed: NoProps;
};
```

`analytics.ts`:

```ts
import { createAnalytics } from "@remcostoeten/analytics";
import { errors, speedInsights } from "@remcostoeten/analytics/plugins";
import type { Events } from "./events";

export const analytics = createAnalytics<Events>({
  project: "remcostoeten.nl",
  key: "pk_live_...",
  endpoint: "/_ra",
  plugins: [speedInsights(), errors()],
});

analytics.track("signup", { plan: "pro" });
analytics.track("newsletter_subscribed");
```

Pageviews are sent on load and on client-side navigation unless `pageviews: false`. Options left out are read from the JSON in `NEXT_PUBLIC_RA_CONFIG`, `PUBLIC_RA_CONFIG` or `VITE_RA_CONFIG`, so the key and endpoint can live in the environment:

```bash
NEXT_PUBLIC_RA_CONFIG='{"project":"remcostoeten.nl","key":"pk_live_...","endpoint":"/_ra"}'
```

## Client

| Method | Does |
| --- | --- |
| `track(name, props?)` | Sends a custom event; `props` is typed per event name |
| `page(props?)` | Sends a pageview now |
| `identify(userId, traits?)` | Links this visitor to a user, only with consent |
| `register(props)` | Adds props to every later event |
| `captureError(error, context?)`, `captureMessage(message, context?)` | Records an error or a warning with tags, level and fingerprint |
| `scope(tags)` | The same client, adding `tags` to everything it sends |
| `use(plugin)` | Adds a plugin and returns its remover |
| `consent.grant()`, `consent.revoke()`, `consent.status()` | Consent, remembered across reloads |
| `optOut()`, `optIn()`, `isOptedOut()` | Stops or resumes all sending from this browser |
| `reset()` | New visitor and session; call on logout |
| `flush()`, `shutdown()` | Sends the queue now; `shutdown` also removes plugins and listeners |
| `on("error" \| "send" \| "drop", handler)` | Delivery problems, sends and dropped events |
| `status()` | Queue size, consent, endpoint, route, last error and last send |

| Option | Default | Meaning |
| --- | --- | --- |
| `project`, `key` | from the environment | Project slug and public key |
| `endpoint` | `/_ra` | A same-origin path behind the proxy, or the API's `/v2/events` URL |
| `consent` | `"optional"` | `"required"` holds everything until `consent.grant()` and then sends it |
| `plugins` | `[]` | Plugins to start with |
| `pageviews` | `true` | Automatic pageviews |
| `mode` | `"auto"` | `"development"` logs instead of sending unless `endpoint` is set; `"auto"` reads `NODE_ENV` |
| `debug` | `false` | `[ra]` console output; `?ra=debug` switches it on in one browser |
| `release` | none | Attached to every event |
| `beforeSend` | none | `(event) => event \| null` to change or drop any event |
| `autostart` | `true` in browsers | `false` to call `start()` yourself |

Events are batched (20 events or 5 seconds), sent with `fetch` and `keepalive`, and with `sendBeacon` when the page is hidden. Failed sends retry after 1, 4 and 16 seconds, and events still unsent are kept for the next page load. Visitors are a random id in `localStorage` and sessions a random id in `sessionStorage`; no cookies are set.

## Plugins

Import from `@remcostoeten/analytics/plugins`; each is one file and none imports another.

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

## React and Next

```tsx
import { AnalyticsProvider } from "@remcostoeten/analytics/react";
import { Analytics } from "@remcostoeten/analytics/next";

export default function RootLayout({ children }: Props) {
  return (
    <html lang="en">
      <body>
        <AnalyticsProvider client={analytics}>
          <Analytics />
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  );
}
```

`<Analytics />` sends each pageview with its route template, such as `/blog/[slug]`, so create the client with `pageviews: false`. `./react` also has `useAnalytics<Events>()`, `TrackClick`, `ErrorBoundary`, `useRoutePageviews(path, route)` for other routers, and `computeRoute(pathname, params)`.

## Server

```ts
import { createServerAnalytics } from "@remcostoeten/analytics/server";

export const serverAnalytics = createServerAnalytics<Events>({
  secret: process.env.RA_SECRET,
  endpoint: "https://api.remcostoeten.nl",
});

export const POST = serverAnalytics.withErrors(async (request) => {
  const result = await serverAnalytics.track("signup", { plan: "pro" }, { request });
  if (!result.ok) console.warn(result.error.code);
  return Response.json({ ok: true });
});
```

Passing `request` forwards the visitor's IP and user agent. Events from one tick go out in one request, and `waitUntil` from the options, the call or Vercel's runtime keeps the send alive after the response. Every method resolves to `{ ok, error, accepted, duplicates, failed }` and never throws. Server events use `server` as visitor and session unless the call passes `visitor` and `session`. Options left out are read from the JSON in `RA_CONFIG`.

## Proxy

A same-origin path gets events past ad blockers. In the Next App Router, `app/%5Fra/route.ts` serves `/_ra`:

```ts
import { createProxy } from "@remcostoeten/analytics/proxy";

export const POST = createProxy({ secret: process.env.RA_SECRET, endpoint: "https://api.remcostoeten.nl" });
```

The proxy refuses other methods, cross-site requests and bodies over 64 KB, and forwards the visitor's IP and user agent with the secret. `createPageCounter` counts HTML page loads in middleware as `page_request` events, which the dashboard compares with pageviews to estimate the blocked share.

## Migrating from 1.x

| 1.x | 2.0 |
| --- | --- |
| `<Analytics projectId="my-app" />` from the root entry | `createAnalytics({ project, key, endpoint })` once, `AnalyticsProvider client={analytics}`, and `<Analytics />` from `./next` |
| `NEXT_PUBLIC_ANALYTICS_URL` / `VITE_ANALYTICS_URL`, posting to `{url}/e` | `endpoint`, usually `/_ra` behind `createProxy`, or the API's `/v2/events`; `NEXT_PUBLIC_RA_CONFIG` holds JSON options |
| `@remcostoeten/analytics/browser` | The root entry, which has no React dependency |
| `trackEvent(name, meta)`, `track(type, meta)` | `analytics.track(name, props)`, typed by your `Events` |
| `trackPageView()` | `analytics.page()`, or automatic |
| `trackError(error)`, `observeErrors`, `trackErrors` prop | `analytics.captureError(error)` and the `errors()` plugin |
| `trackClick`, `observeClicks`, `data-analytics` | `TrackClick`, or the `clicks()` plugin with `data-ra-click` |
| `observePerformance` (web vitals) | `speedInsights()` |
| `observeScroll`, `observeTimeOnPage` | `scrollDepth()`, `engagement()` |
| `observeOutboundLinks`, `observeForms` | `outboundLinks()`, `forms()` |
| `identifyUser(properties)` | `analytics.identify(userId, traits)` |
| `setExperiment(id, variant)` | The `experiments({ id: variant })` plugin |
| `trackTransaction`, `trackSearch` | `analytics.track` with your own event names, such as `checkout` and `search` |
| `consentRequired` and `consentGranted` props, `setConsentGranted` | `consent: "required"` and `analytics.consent.grant()` |
| `optOut()`, `optIn()`, `isOptedOut()` | The same methods on the client |
| `resetVisitorId()`, `resetSessionId()` | `analytics.reset()` |
| `AnalyticsErrorBoundary` | `ErrorBoundary` from `./react` |
| `useTrack()` | `useAnalytics<Events>()` |
| `trackServer`, `trackServerEvent`, `createServerTrack` from `./server` | `createServerAnalytics<Events>()` with `track`, `identify`, `captureError` and `withErrors` |
| `flushOfflineQueue` | Automatic; `analytics.flush()` sends now |
| CommonJS and ESM builds | ESM only |

The 1.x visitor id, opt-out, identity, traits and experiments in `localStorage` move into the single `__ra` key on first load, so returning visitors keep their id.

## Development

| Command | Does |
| --- | --- |
| `bun run build` | tsdown into `dist/`: one ESM file with types per entry; `./react` and `./next` share one chunk so they use the same React context |
| `bun test` | Unit tests with happy-dom, and Bun's own `Request` for the server and proxy tests; every sent envelope is checked against the contract's `IngestEnvelope` |
| `bun run size` (repo root) | Fails above the budgets: core 4.5 KB, `react` 1.5 KB, `next` 1 KB, each plugin 0.6 KB, `errors` 0.7 KB, `speedInsights` 2.5 KB |
| `bun run test:e2e` (repo root) | Playwright against the built SDK, the API on PGlite and the proxy; see `e2e/README.md` |
