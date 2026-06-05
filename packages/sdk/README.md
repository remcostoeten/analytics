# @remcostoeten/analytics

Privacy-focused analytics SDK for Next.js and React. Cookie-free, lightweight (~1.6 KB gzipped), sends events to your self-hosted ingestion service.

## Install

```bash
npm install @remcostoeten/analytics
```

Set your ingestion base URL (not a path suffix — the SDK posts to `{url}/e`):

```bash
# Next.js
NEXT_PUBLIC_ANALYTICS_URL=https://analytics-api.yourdomain.com

# Vite
VITE_ANALYTICS_URL=https://analytics-api.yourdomain.com
```

## Quick start

```tsx
import { Analytics } from "@remcostoeten/analytics";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics projectId="my-app" />
      </body>
    </html>
  );
}
```

## Provider and hooks

Wrap your app to share config across components:

```tsx
import { AnalyticsProvider, Analytics, useTrack } from "@remcostoeten/analytics";

export default function RootLayout({ children }) {
  return (
    <AnalyticsProvider projectId="my-app" ingestUrl="https://analytics-api.yourdomain.com">
      <body>
        {children}
        <Analytics />
      </body>
    </AnalyticsProvider>
  );
}
```

```tsx
"use client";

import { useTrack } from "@remcostoeten/analytics";

export function SignupButton() {
  const { trackEvent } = useTrack();

  return (
    <button onClick={() => trackEvent("signup", { plan: "pro" })}>
      Sign up
    </button>
  );
}
```

`<Analytics />` reads provider defaults when props are omitted. Per-call options still override.

## Error boundary

```tsx
import { AnalyticsErrorBoundary } from "@remcostoeten/analytics";

<AnalyticsErrorBoundary fallback={<p>Something went wrong</p>}>
  {children}
</AnalyticsErrorBoundary>
```

Caught React render errors are sent as `type: "error"` events. Respects opt-out and DNT.

## Declarative click tracking

Opt in to attribute-based clicks:

```tsx
<Analytics projectId="my-app" trackClicks />
```

```html
<button data-analytics="signup" data-analytics-meta='{"plan":"pro"}'>
  Sign up
</button>
```

Or wrap a single element:

```tsx
import { TrackClick } from "@remcostoeten/analytics";

<TrackClick name="signup" meta={{ plan: "pro" }}>
  <button>Sign up</button>
</TrackClick>
```

Standalone observer:

```tsx
import { observeClicks } from "@remcostoeten/analytics";

const cleanup = observeClicks({ projectId: "my-app" });
cleanup();
```

---

## `<Analytics />`

Automatic tracking via four observers: pageviews, web vitals, scroll depth, time on page.

| Prop | Default | Effect |
| --- | --- | --- |
| `projectId` | `window.location.hostname` | Project identifier in database |
| `ingestUrl` | env var | Ingestion base URL |
| `disabled` | `false` | Disable all observers |
| `debug` | `false` | Console logging |
| `consentRequired` | `false` | Gate tracking until `consentGranted` is true |
| `consentGranted` | `false` | User consent state when `consentRequired` is true |

### Consent mode (EU / GDPR)

```tsx
const [consent, setConsent] = useState(false);

<Analytics consentRequired consentGranted={consent} />
<button onClick={() => setConsent(true)}>Accept analytics</button>
```

When `consentRequired` is true and consent is not granted:

- Observers stay idle (no pageviews, vitals, etc.)
- `track()` no-ops
- No new `localStorage` or `sessionStorage` writes

Existing stored IDs are read but not extended until consent is granted. Works alongside `optOut()` / `optIn()`.

---

| Signal | `type` | `meta.eventName` |
| --- | --- | --- |
| Page views | `pageview` | — |
| Web Vitals | `event` | `web-vitals` |
| Scroll depth | `event` | `scroll` |
| Time on page | `event` | `time-on-page` |

---

## Manual tracking

Client-only. No-ops during SSR, opt-out, or DNT.

```tsx
import {
  track,
  trackPageView,
  trackEvent,
  trackClick,
  trackError,
  trackTransaction,
  trackSearch,
  identifyUser,
  setExperiment,
} from "@remcostoeten/analytics";
```

| Function | `type` | Purpose |
| --- | --- | --- |
| `track(type, meta?, options?)` | any | Low-level |
| `trackPageView(meta?, options?)` | `pageview` | Explicit pageview |
| `trackEvent(name, meta?, options?)` | `event` | Custom event |
| `trackClick(elementName, meta?, options?)` | `click` | Named click |
| `trackError(error, meta?, options?)` | `error` | Error with stack |
| `trackTransaction(revenue, currency?, orderId?, items?, options?)` | `event` | Revenue |
| `trackSearch(query, resultCount, options?)` | `event` | Site search |
| `identifyUser(properties, options?)` | `event` | User traits |
| `setExperiment(experimentId, variantId, options?)` | `event` | A/B exposure |

Options: `{ projectId?, ingestUrl?, debug? }`.

### Payload shape

```typescript
{
  type: string,
  projectId: string,
  path: string,
  referrer: string | null,
  origin: string,
  host: string,
  ua: string,
  lang: string,
  visitorId: string,
  sessionId: string,
  meta?: {
    screenSize?: string,
    viewport?: string,
    pixelRatio?: number,
    utmSource?: string,
    utmMedium?: string,
    utmCampaign?: string,
    utmContent?: string,
    utmTerm?: string,
    connectionType?: string | null,
    connectionDownlink?: number | null,
    eventName?: string,
    ...
  }
}
```

Auto-enrichment is merged into `meta` on every call. Uses `sendBeacon` with `fetch` fallback. Deduplicates identical events within 5 seconds.

---

## Standalone observers

Use without `<Analytics />`:

```tsx
import {
  observePageViews,
  observePerformance,
  observeScroll,
  observeTimeOnPage,
} from "@remcostoeten/analytics";

const cleanup = observePageViews({ projectId: "my-app" });
cleanup();
```

---

## Identity and privacy

```tsx
import {
  getVisitorId,
  resetVisitorId,
  getSessionId,
  resetSessionId,
  extendSession,
  optOut,
  optIn,
  isOptedOut,
  checkDoNotTrack,
} from "@remcostoeten/analytics";
```

| API | Storage | Behavior |
| --- | --- | --- |
| `getVisitorId()` | `localStorage` | Persistent visitor ID |
| `resetVisitorId()` | `localStorage` | New UUID |
| `getSessionId()` | `sessionStorage` | 30-minute session timeout |
| `resetSessionId()` | `sessionStorage` | New session UUID |
| `extendSession()` | `sessionStorage` | Refresh session timeout |
| `optOut()` | `localStorage` | Disable tracking, remove visitor ID |
| `optIn()` | `localStorage` | Re-enable tracking |
| `isOptedOut()` | — | Check opt-out state |
| `checkDoNotTrack()` | — | Browser DNT enabled |

No HTTP cookies.

```tsx
import { PRIVACY_DISCLOSURE, getStoredKeys } from "@remcostoeten/analytics";
```

`PRIVACY_DISCLOSURE` is copy-ready text for your privacy policy. `getStoredKeys()` lists each key, storage type, and purpose.

---

```tsx
import { validateIngestUrl, mergeAnalyticsOptions } from "@remcostoeten/analytics";
import type {
  AnalyticsProps,
  AnalyticsOptions,
  AnalyticsProviderProps,
  AnalyticsErrorBoundaryProps,
  EventPayload,
  TrackMeta,
  TrackHelpers,
} from "@remcostoeten/analytics";
```

---

## Exports

| Export | Kind |
| --- | --- |
| `Analytics` | Component |
| `AnalyticsProvider` | Component |
| `AnalyticsErrorBoundary` | Component |
| `TrackClick` | Component |
| `useTrack` | Hook |
| `useAnalyticsOptions` | Hook |
| `createTrackHelpers` | Function |
| `track`, `trackPageView`, `trackEvent`, `trackClick`, `trackError` | Functions |
| `trackTransaction`, `trackSearch`, `identifyUser`, `setExperiment` | Functions |
| `observePageViews`, `observePerformance`, `observeScroll`, `observeTimeOnPage`, `observeClicks` | Functions |
| `getVisitorId`, `resetVisitorId`, `getSessionId`, `resetSessionId`, `extendSession` | Functions |
| `optOut`, `optIn`, `isOptedOut`, `checkDoNotTrack` | Functions |
| `PRIVACY_DISCLOSURE`, `getStoredKeys` | Privacy helpers |
| `setConsentGranted`, `setConsentRequired`, `hasConsent` | Consent API |
| `validateIngestUrl`, `mergeAnalyticsOptions`, `resolveAnalyticsOptions` | Functions |

---

MIT © Remco Stoeten
