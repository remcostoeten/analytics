# @remcostoeten/example

Minimal Next.js app demonstrating all three `@remcostoeten/analytics` tracking patterns.

## What's covered

| File                        | Pattern                                                               |
| --------------------------- | --------------------------------------------------------------------- |
| `app/layout.tsx`            | Automatic: pageviews, web vitals, scroll depth, time on page          |
| `app/demo-buttons.tsx`      | Manual client events: `trackEvent`, `trackError`, `TrackClick`        |
| `app/api/purchase/route.ts` | Server-side: `trackServerEvent` from `@remcostoeten/analytics/server` |

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
