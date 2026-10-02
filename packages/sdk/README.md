# @spoar/sdk

Privacy-first analytics for browsers, servers and React, sending to a self-hosted analytics API. Version 2 is ESM only, has typed events, batches requests, keeps no cookies, and adds features through plugins so an app only ships what it uses.

Spoar is the new name for the analytics SDK. 1.x stays published as `@remcostoeten/analytics`. The workspace is marked private until the npm release blockers in `docs/v2/release-readiness.md` are fixed.

## Install

```bash
npm install @spoar/sdk
```

## Quick start

`events.ts` lists every custom event once, for the browser and the server:

```ts
import type { NoProps } from "@spoar/sdk";

export type Events = {
  signup: { plan: "free" | "pro" };
  newsletter_subscribed: NoProps;
};
```

`analytics.ts`:

```ts
import { createAnalytics } from "@spoar/sdk";
import { errors, speedInsights } from "@spoar/sdk/plugins";
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
| `consent.grant()`, `consent.revoke()`, `consent.status()` | Consent, remembered across reloads and applied to other open tabs at once |
| `optOut()`, `optIn()`, `isOptedOut()` | Stops or resumes all sending from this browser |
| `reset()` | New visitor and session, and clears the route; call on logout |
| `flush()`, `shutdown()` | Sends the queue now; `shutdown` also removes plugins and listeners |
| `on("error" \| "send" \| "drop", handler)` | Delivery problems (`RA_INGEST_FAILED`, and `RA_INGEST_REJECTED` for each event rejected inside a 202), sends and dropped events |
| `status()` | Queue size, consent, endpoint, route, last error and last send |

| Option | Default | Meaning |
| --- | --- | --- |
| `project`, `key` | from the environment | Project slug and public key; an empty key leaves the `key` query parameter out |
| `endpoint` | `/_ra` | A same-origin path behind the proxy, or the API's `/v2/events` URL |
| `consent` | `"optional"` | `"required"` holds everything until `consent.grant()` and then sends it |
| `plugins` | `[]` | Plugins to start with |
| `pageviews` | `true` | Automatic pageviews |
| `mode` | `"auto"` | `"development"` logs instead of sending unless `endpoint` is set; `"auto"` reads `NODE_ENV` |
| `debug` | `false` | `[ra]` console output; `?ra=debug` switches it on in one browser, `?ra=nodebug` off again without touching the visitor id |
| `release` | none | Attached to every event |
| `beforeSend` | none | `(event) => event \| null` to change or drop any event |
| `autostart` | `true` in browsers | `false` to call `start()` yourself |

Events are batched (20 events or 5 seconds, with each body kept under the API's 60 KB limit), sent with `fetch` and `keepalive`, and with `sendBeacon` when the page is hidden. A single event over 60 KB is dropped and reported as a 413 failure. A network error, 429 or 5xx retries after 1, 4 and 16 seconds, or after `Retry-After` capped at 16 seconds; batches waiting for a retry are sent when the page is hidden, and events still unsent are kept for the next page load. Visitors are a random id in `localStorage` and sessions a random id in `sessionStorage`; no cookies are set.

Do Not Track and Global Privacy Control are honoured: every event is dropped with the reason `dnt` and nothing is stored. The `__ra` key is written only once sending is allowed, except for the visitor's own consent, opt-out and debug choices, and a consent or opt-out change in one tab applies to the site's other tabs at once.

## Plugins

Import from `@spoar/sdk/plugins`; each is one file and none imports another.

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
import { AnalyticsProvider } from "@spoar/sdk/react";
import { Analytics } from "@spoar/sdk/next";

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
import { createServerAnalytics } from "@spoar/sdk/server";

export const serverAnalytics = createServerAnalytics<Events>({
  secret: process.env.RA_SECRET,
  endpoint: "https://api.analytics.remcostoeten.nl",
});

export const POST = serverAnalytics.withErrors(async (request) => {
  const result = await serverAnalytics.track("signup", { plan: "pro" }, { request });
  if (!result.ok) console.warn(result.error.code);
  return Response.json({ ok: true });
});
```

Passing `request` or `headers` forwards the visitor's IP and user agent, the site's origin as `Origin` (so ingest flags localhost and preview hosts) and the admin session cookie `ra.session_token` alone (so a signed-in admin's events are internal). Without either, no IP or user agent is sent and the API does not use the server's own; an `origin` option on the client or the call gives such events a host. Events from one tick go out together, one request per origin and session cookie, and `waitUntil` from the options, the call or Vercel's runtime keeps the send alive after the response. Every method resolves to `{ ok, error, accepted, duplicates, failed }` and never throws. Server events use `server` (exported as `serverVisitor`) as visitor and session unless the call passes `visitor` and `session`; reads count them in pageviews, events and breakdowns but never as a visitor or a session. Options left out are read from the JSON in `RA_CONFIG`.

## Proxy

A same-origin path gets events past ad blockers. In the Next App Router, `app/%5Fra/route.ts` serves `/_ra`:

```ts
import { createProxy } from "@spoar/sdk/proxy";

export const POST = createProxy({ secret: process.env.RA_SECRET, endpoint: "https://api.analytics.remcostoeten.nl" });
```

The proxy refuses other methods, cross-site requests and bodies over 60 KB, the API's own limit. It forwards the body with the secret, the visitor's IP and user agent, the page's `Origin` (or the site's own origin when the browser sent none) and the admin session cookie `ra.session_token` and no other cookie, so proxied events get their host, localhost and preview flags, and a signed-in admin's events are internal. `createPageCounter` counts HTML page loads in middleware as `page_request` events, which the dashboard compares with pageviews to estimate the blocked share.

## Migrating from 1.x

| 1.x | 2.0 |
| --- | --- |
| `<Analytics projectId="my-app" />` from the root entry | `createAnalytics({ project, key, endpoint })` once, `AnalyticsProvider client={analytics}`, and `<Analytics />` from `./next` |
| `NEXT_PUBLIC_ANALYTICS_URL` / `VITE_ANALYTICS_URL`, posting to `{url}/e` | `endpoint`, usually `/_ra` behind `createProxy`, or the API's `/v2/events`; `NEXT_PUBLIC_RA_CONFIG` holds JSON options |
| `@spoar/sdk/browser` | The root entry, which has no React dependency |
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

The 1.x visitor id, opt-out, identity, traits and experiments in `localStorage` are read on first load and move into the single `__ra` key once consent allows storing, so returning visitors keep their id.

## Development

| Command | Does |
| --- | --- |
| `bun run build` | tsdown into `dist/`: one ESM file with types per entry; `./react` and `./next` share one chunk so they use the same React context |
| `bun test` | Unit tests with happy-dom, and Bun's own `Request` for the server and proxy tests; every sent envelope is checked against the contract's `IngestEnvelope` |
| `bun run size` (repo root) | Fails above the budgets: core 5 KB, `react` 1.5 KB, `next` 1 KB, each plugin 0.6 KB, `errors` 0.7 KB, `speedInsights` 2.5 KB |
| `bun run test:e2e` (repo root) | Playwright against the built SDK, the API on PGlite and the proxy; see `e2e/README.md` |
