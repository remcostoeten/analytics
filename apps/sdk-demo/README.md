# @remcostoeten/sdk-demo

Next.js app exercising the public surface of `@remcostoeten/analytics`. Each route is a working
demo of one part of the API, with the calls it makes printed back as you click.

## What's covered

| Route       | File                    | API surface                                                                        |
| ----------- | ----------------------- | ---------------------------------------------------------------------------------- |
| all         | `app/layout.tsx`        | `<Analytics />`: pageviews, web vitals, scroll, time on page, plus the opt-in observers (`trackClicks`, `trackOutbound`, `trackForms`, `trackErrors`) |
| `/`         | `app/page.tsx`          | Overview and the automatic-tracking setup                                          |
| `/events`   | `app/events/`           | `trackEvent`, `trackClick`, `trackError`, `trackTransaction`, `trackSearch`, `trackPageView`, `<TrackClick>` |
| `/provider` | `app/provider/`         | `<AnalyticsProvider>`, `useTrack`, `<AnalyticsErrorBoundary>`                      |
| `/identity` | `app/identity/`         | `identify`, `identifyUser`, `setExperiment`, visitor and session ID control        |
| `/consent`  | `app/consent/`          | `consentRequired` / `consentGranted`, `setConsentGranted`, `canTrack`              |
| `/privacy`  | `app/privacy/`          | `optOut`, `optIn`, `checkDoNotTrack`, `getStoredKeys`, offline queue                |
| —           | `app/api/purchase/route.ts` | Server-side: `trackServerEvent` from `@remcostoeten/analytics/server`           |

## Setup

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_ANALYTICS_URL` with your ingestion base URL (e.g. `https://analytics-api.yourdomain.com`).

For server tracking, also set:

```bash
ANALYTICS_URL=https://analytics-api.yourdomain.com   # same URL, server-only
INGEST_SECRET=<same secret as INGEST_SECRET on ingestion>
```

```bash
bun install
bun run dev   # http://localhost:3001
```

## Points to note

- `NEXT_PUBLIC_ANALYTICS_URL` is exposed to the browser. `ANALYTICS_URL` and `INGEST_SECRET` are not — never prefix them with `NEXT_PUBLIC_`.
- `<Analytics />` tracks automatically on every page; individual `trackEvent` calls are additive.
- `trackServerEvent` in an API route sends events server-to-server with a Bearer token — the browser never sees the secret.
- `TrackClick` wraps any element; no `onClick` needed.
- Consent is **off by default** — the SDK tracks immediately unless you set `consentRequired`. `/consent` shows both the declarative and imperative wiring.
- Consent and opt-out are independent: consent is in-memory banner state, opt-out is a persisted user preference in `localStorage`.
- Without `NEXT_PUBLIC_ANALYTICS_URL` set, every page still renders and the calls still run — the events are just dropped with a debug log rather than sent.
