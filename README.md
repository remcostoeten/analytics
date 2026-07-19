# Remco Analytics

First-party analytics you self-host. Cookie-free, privacy-first, built for Next.js and React. Install the SDK in your app, deploy the ingestion service against your own Postgres, and optionally run the dashboard on the same database.

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![npm version](https://img.shields.io/npm/v/@remcostoeten/analytics.svg)](https://www.npmjs.com/package/@remcostoeten/analytics)
[![Privacy](https://img.shields.io/badge/Privacy-First-green.svg)](#sdk-identity-and-privacy)
[![Cookies](https://img.shields.io/badge/Cookies-None-lightgrey.svg)](#sdk-identity-and-privacy)
[![Self-hosted](https://img.shields.io/badge/Self--hosted-Neon_Postgres-blue.svg)](#deployment-model)
[![Live Demo](https://img.shields.io/badge/Demo-Live-success.svg)](https://remcostoeten-analytics-demo.vercel.app)

[Live Demo](https://remcostoeten-analytics-demo.vercel.app) · [NPM Package](https://www.npmjs.com/package/@remcostoeten/analytics) · [Roadmap](docs/consumer/roadmap.md)

![Dashboard Preview](./dashboard_preview.png)

---

## Quick start

### Option A — Scaffold (recommended)

```bash
npx @remcostoeten/create-analytics@latest my-app --tier separate --yes
```

Creates `apps/web` (SDK only) + `apps/analytics-api` (ingestion). See generated `README.md`.

### Option B — Manual

1. Create a [Neon](https://neon.tech) Postgres database
2. Deploy `apps/ingestion` with `DATABASE_URL` + `IP_HASH_SECRET`
3. Run migrations: `cd packages/ingestion && bun run db:migrate`
4. In your app: `npm install @remcostoeten/analytics`
5. Set `NEXT_PUBLIC_ANALYTICS_URL` to your ingestion **base URL**
6. Add `<Analytics projectId="your-project" />` to your root layout
7. Call `trackEvent(...)` in client components where needed
8. Optionally call `trackServerEvent(...)` from API routes for server-only events
9. Optionally deploy `apps/example-dashboard` with the same `DATABASE_URL`

```bash
npm install @remcostoeten/analytics
```

```tsx
// app/layout.tsx
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

```bash
# .env.local
NEXT_PUBLIC_ANALYTICS_URL=https://analytics-api.yourdomain.com
```

The SDK posts to `{ingestUrl}/e`. Use the base host — not a path suffix.

---

## Deployment model

Remco Analytics has three parts. Only the SDK is on npm.

| Part | Install | Who hosts |
| --- | --- | --- |
| SDK (`@remcostoeten/analytics`) | `npm install @remcostoeten/analytics` | Runs in the browser |
| Ingestion (`apps/ingestion`) | Clone repo, deploy yourself | You (Vercel, Bun, Node) |
| Dashboard (`apps/example-dashboard`) | Clone repo, deploy yourself | You (optional) |

```
Your app (Next.js / React)
  └─ npm: @remcostoeten/analytics
       └─ POST events → Your ingestion URL

Your ingestion service (self-hosted)
  └─ DATABASE_URL → Your Neon Postgres
  └─ IP_HASH_SECRET → Required in production

Your dashboard (optional, self-hosted)
  └─ DATABASE_URL → Same Neon Postgres
```

You do **not** need the dashboard to collect data. Ingestion + SDK is enough. The dashboard is a separate UI that reads from the same database.

### Environment variables

**Ingestion**

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `IP_HASH_SECRET` | Yes in production (min 32 chars) | Daily-rotating salt for IP hashing |
| `ORIGIN_ALLOWLIST` | No | Comma-separated allowed origins (empty = all) |
| `INGEST_SECRET` | No | Bearer token for server-side events via `@remcostoeten/analytics/server` |
| `INTERNAL_IP_HASHES` | No | IP hashes flagged as internal traffic |

**SDK**

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_ANALYTICS_URL` | Yes (Next.js) | Base URL of your ingestion service |
| `VITE_ANALYTICS_URL` | Yes (Vite) | Same, for Vite apps |
| `ANALYTICS_URL` | For server tracking | Same base URL, server-only (not `NEXT_PUBLIC_`) |
| `INGEST_SECRET` | For server tracking | Same value as on ingestion; never expose to the browser |

```bash
# Correct
NEXT_PUBLIC_ANALYTICS_URL=https://analytics-api.yourdomain.com

# Wrong — SDK will POST to https://.../ingest/e
NEXT_PUBLIC_ANALYTICS_URL=https://analytics-api.yourdomain.com/ingest
```

**Dashboard (optional)**

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Same database as ingestion |
| `GITHUB_CLIENT_ID` | Recommended for public deployments | GitHub OAuth app client ID — enables login-gated access |
| `GITHUB_CLIENT_SECRET` | With `GITHUB_CLIENT_ID` | GitHub OAuth app client secret |
| `AUTH_SECRET` | No | HMAC key for session cookies; defaults to `GITHUB_CLIENT_SECRET` |

When both GitHub variables are set, the entire dashboard requires signing in with GitHub, and only users whose GitHub username exists in the `dashboard_users` table get in:

```sql
INSERT INTO dashboard_users (github_login) VALUES ('your-github-username');
```

Create the OAuth app at github.com → Settings → Developer settings → OAuth Apps, with the callback URL set to `https://your-dashboard.example.com/api/auth/callback`. When the variables are unset, the dashboard runs open (local development).

### Deploy ingestion and dashboard

```bash
git clone https://github.com/remcostoeten/analytics.git
cd analytics && bun install

cd apps/ingestion
bun run db:migrate
bun run dev          # local
vercel --prod        # production

cd ../example-dashboard
vercel --prod        # optional
```

---

## SDK: automatic tracking

Drop `<Analytics />` in your root layout. It renders nothing and starts four observers on mount.

```tsx
<Analytics
  projectId="my-app"
  ingestUrl="https://analytics-api.yourdomain.com"
  disabled={false}
  debug={false}
/>
```

| Prop | Default | Effect |
| --- | --- | --- |
| `projectId` | `window.location.hostname` | Separates traffic in the database |
| `ingestUrl` | env var | Override ingestion base URL |
| `disabled` | `false` | When true, no observers start |
| `debug` | `false` | Log tracking decisions to console |
| `trackClicks` | `false` | Opt-in: track `data-analytics` attribute clicks |
| `trackOutbound` | `false` | Opt-in: track clicks to external domains (`outbound_click`) |
| `trackForms` | `false` | Opt-in: track form submissions (`form_submit`) |
| `trackErrors` | `false` | Opt-in: track uncaught errors and unhandled rejections (`error`) |

### What gets tracked automatically

| Signal | Event `type` | `meta.eventName` | When it fires |
| --- | --- | --- | --- |
| Page views | `pageview` | — | Initial load + SPA route changes |
| Web Vitals | `event` | `web-vitals` | Page hide / beforeunload (TTFB, FCP, LCP, CLS, INP) |
| Scroll depth | `event` | `scroll` | beforeunload or cleanup (`depth`: 0–100) |
| Time on page | `event` | `time-on-page` | beforeunload or cleanup (`timeOnPageMs`) |

SPA navigation is handled by patching `history.pushState` / `replaceState` and listening to `popstate`.

### Opt-in observers

| Prop | Event `type` | `meta.eventName` | What it captures |
| --- | --- | --- | --- |
| `trackOutbound` | `event` | `outbound_click` | Clicks on `<a>` pointing to a different origin |
| `trackForms` | `event` | `form_submit` | Any form submission (id, name, action, method) |
| `trackErrors` | `error` | — | `window.onerror` + `unhandledrejection` (message, source, stack) |

### Offline resilience

When `navigator.onLine` is false or a fetch fails, events are queued in `localStorage` (up to 50). The queue is flushed automatically on the `online` event via `POST /e/batch`. You can also flush manually:

```tsx
import { flushOfflineQueue } from "@remcostoeten/analytics";
flushOfflineQueue();
```

---

## SDK: manual tracking

All functions are client-only. They no-op during SSR, when the user opted out, or when DNT is enabled.

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

| Function | Event `type` | Purpose |
| --- | --- | --- |
| `track(type, meta?, options?)` | any string | Low-level escape hatch |
| `trackPageView(meta?, options?)` | `pageview` | Explicit pageview |
| `trackEvent(name, meta?, options?)` | `event` | Custom event |
| `trackClick(elementName, meta?, options?)` | `click` | Named click |
| `trackError(error, meta?, options?)` | `error` | Error with message + stack |
| `trackTransaction(revenue, currency?, orderId?, items?, options?)` | `event` | Revenue tracking |
| `trackSearch(query, resultCount, options?)` | `event` | Site search |
| `identifyUser(properties, options?)` | `event` | User traits |
| `setExperiment(experimentId, variantId, options?)` | `event` | A/B exposure |

Each call accepts optional `options`: `{ projectId?, ingestUrl?, debug? }`.

### Payload shape

Every track call sends:

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

Auto-enrichment (screen, viewport, UTM, connection) is merged into your `meta` on every call. Delivery uses `navigator.sendBeacon` with `fetch` + `keepalive` fallback. Duplicate events within 5 seconds are dropped client-side.

---

## SDK: server tracking

For events that only happen on your backend (API routes, webhooks, cron jobs). Import from `@remcostoeten/analytics/server` — not the main package.

```typescript
import { trackServerEvent } from "@remcostoeten/analytics/server";

await trackServerEvent("signup_completed", {
  projectId: "my-app",
  path: "/api/signup",
});
```

Set `ANALYTICS_URL` and `INGEST_SECRET` in server env (same secret on ingestion). Browser SDK stays unchanged — no secret in client code.

| Function | Purpose |
| --- | --- |
| `trackServerEvent(name, options)` | Custom server event |
| `trackServerEvent(name, meta, options)` | Custom server event with metadata |
| `trackServer(type, options, meta?)` | Low-level |
| `trackServerError(error, options)` | Server-side error |
| `createServerTrack(defaults)` | Bind `projectId` once per file |

See [packages/sdk/README.md](./packages/sdk/README.md) for full examples.

---

## SDK: standalone observers

Use without `<Analytics />` for custom wiring or non-React apps.

```tsx
import {
  observePageViews,
  observePerformance,
  observeScroll,
  observeTimeOnPage,
  observeClicks,
  observeOutboundLinks,
  observeForms,
  observeErrors,
} from "@remcostoeten/analytics";

const cleanup = observePageViews({ projectId: "my-app", ingestUrl: "..." });
cleanup();
```

Each returns an unsubscribe function. Mix and match — pageviews only, skip web vitals, etc.

| Observer | Tracks |
| --- | --- |
| `observePageViews` | Initial load + SPA navigation |
| `observePerformance` | Web Vitals (TTFB, FCP, LCP, CLS, INP) |
| `observeScroll` | Scroll depth (0–100) |
| `observeTimeOnPage` | Time on page in ms |
| `observeClicks` | Elements with `data-analytics` attribute |
| `observeOutboundLinks` | Clicks on `<a>` to external origins |
| `observeForms` | Form submissions |
| `observeErrors` | Uncaught errors + unhandled rejections |

---

## SDK: identity and privacy

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
| `getVisitorId()` | `localStorage` | Persistent across sessions |
| `resetVisitorId()` | `localStorage` | New UUID |
| `getSessionId()` | `sessionStorage` | 30-minute inactivity timeout |
| `resetSessionId()` | `sessionStorage` | New session UUID |
| `extendSession()` | `sessionStorage` | Refresh the 30-minute timeout |
| `optOut()` | `localStorage` | Disables tracking, removes visitor ID |
| `optIn()` | `localStorage` | Re-enables tracking |
| `isOptedOut()` | — | Returns opt-out state |
| `checkDoNotTrack()` | — | True when browser DNT is enabled |

No HTTP cookies. DNT and opt-out are respected automatically.

---

## Ingestion service

When the SDK POSTs to `/e` (or `/ingest`), ingestion:

1. Validates payload with Zod
2. Detects bots (40+ UA patterns)
3. Extracts geo from request headers
4. Hashes IP address (never stores raw IP)
5. Classifies device, browser, OS from UA
6. Deduplicates in-memory (per serverless instance)
7. Rate-limits by IP hash
8. Upserts visitor record
9. Inserts event into Postgres

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Health check |
| POST | `/e` | Ingest event (SDK default) |
| POST | `/e/batch` | Batch ingest up to 100 events (offline queue flush) |
| POST | `/ingest` | Ingest event (alias) |
| POST | `/ingest/batch` | Batch ingest (alias) |
| GET | `/metrics` | Request metrics |
| GET | `/admin/stats` | Admin statistics |
| POST | `/admin/cleanup` | Data retention cleanup |
| GET | `/events` | SSE live stream (dev-oriented) |

On Vercel serverless, in-memory rate limiting and deduplication only apply within a single function instance. Schedule an external cron for `/admin/cleanup`.

---

## Dashboard (optional)

The example dashboard reads from the same `events`, `visitors`, and `sessions` tables.

### Visitor profiles and recurrence

- **Visitor explorer** — All / New / Returning tabs, sortable by last seen, visit count, or first seen. Rows link through to per-visitor profiles.
- **`/visitor/[id]` profile page** — identity header (device, OS, browser, geo, timezone, first/last seen, visit count), a session-by-session timeline (entry → exit path, duration, pageviews), top pages, referrer history, and `meta.identity` / `meta.experiments` rendered as a key-value grid.
- **Recurrence stats** in the Audience view — returning rate, visit-count distribution (1 / 2–4 / 5–9 / 10+), and a new-vs-returning trend.
- **Internal traffic exclusion** — the "Mark as internal" button on a profile flags the visitor and retroactively flags their events; public-traffic queries exclude `is_internal`. Works across all your devices, unlike a localStorage-only filter. Protected by GitHub sign-in when auth is enabled.

### Migration required

Visitor profiles, sessions, and per-project visitor scoping depend on migration `packages/ingestion/src/db/migrations/0003_add_sessions_and_visitor_project.sql`. Apply it **before** deploying the new ingestion code — it's idempotent and backfills `visitors.project_id`, the `sessions` table, and honest `visit_count` values from existing events. GitHub-gated dashboard access additionally needs `0004_add_dashboard_users.sql` (the `dashboard_users` allowlist table).

### Built-in event names

The dashboard has built-in support for these SDK event names:

| `meta.eventName` | Dashboard usage |
| --- | --- |
| `time-on-page` | Avg time on page, session stats |
| `web-vitals` | TTFB, FCP, LCP, CLS, INP |
| `scroll` | Engagement metrics |
| `transaction` | Revenue KPIs |
| `site_search` | Search analytics |
| `identify` | User properties |
| `experiment_exposure` | A/B test data |

Custom `trackEvent("anything")` calls are stored and queryable in recent events.

---

## Monorepo layout

| Path | Purpose |
| --- | --- |
| `packages/sdk` | `@remcostoeten/analytics` npm package |
| `packages/ingestion` | `@remcostoeten/ingestion` npm package |
| `packages/create-analytics` | `@remcostoeten/create-analytics` scaffolder CLI (`npx @remcostoeten/create-analytics@latest`) |
| `apps/ingestion` | Thin Vercel deploy shell for ingestion |
| `apps/example` | Minimal Next.js consumer app (all three tracking patterns) |
| `apps/example-dashboard` | Next.js analytics UI |

**Stack:** TypeScript, Bun, Neon Postgres, Drizzle ORM, Hono, Next.js, React.

---

MIT © Remco Stoeten
