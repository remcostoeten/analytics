# Implementation Plan

Concrete plan for remaining work. Ordered by sprint, with rationale and acceptance criteria.

Current public docs: [README.md](../../README.md)

**Completed:** Sprint 1 (provider, hooks, error boundary), Sprint 2 (declarative clicks)

---

## Sprint 3 — Deployment ergonomics (tiered, no app bloat)

**Goal:** Replace monorepo clone with npm installs — without forcing ingestion into the consumer's main app.

### The bloat problem

Ingestion is server infrastructure (Hono, Drizzle, Neon driver, Zod, UA parser, migrations). That is fine on a **dedicated analytics-api deploy**. It is the wrong default inside a Next.js app repo, where it inflates serverless function bundles and `node_modules` even though it never touches the browser.

The SDK (`@remcostoeten/analytics`, ~1.6 KB gzipped) stays browser-only and is always installed in the app. Ingestion should usually **not** be.

### Integration tiers

| Tier | App installs | Ingestion deploy | Best for |
| --- | --- | --- | --- |
| **1 — Recommended** | SDK only | Separate Vercel/Bun project via `@remcostoeten/ingestion` | Most consumers |
| **2 — Co-located** | SDK + ingestion npm | API route in same Next.js app | Small projects, one deploy |
| **3 — Existing URL** | SDK only | Already hosted (self or Remco) | Migrations only |

### Architecture (Tier 1 — default)

```
my-next-app/                         analytics-api/  (separate Vercel project)
├── npm: @remcostoeten/analytics     ├── npm: @remcostoeten/ingestion
├── layout → <Analytics />           ├── api/index.ts → export handler
└── POST → https://analytics-api...  ├── DATABASE_URL → Neon
                                     └── IP_HASH_SECRET
```

Consumer app stays lean. Ingestion weight lives in a second project — same as today, but without cloning the monorepo.

### Sprint 3 deliverables

| # | Feature | Why | Done when |
| --- | --- | --- | --- |
| 3.1 | Publish `@remcostoeten/ingestion` | Replace monorepo clone for analytics-api project | **Done** — package extracted, apps/ingestion is thin deploy |
| 3.2 | Package size discipline | Avoid shipping dev UI, optional peer deps | **Done** — peer deps + `/vercel` subpath |
| 3.3 | `create-analytics` CLI | Manual wiring still error-prone | **Done** — Tier 1 default |
| 3.4 | README + docs update | Default path must be Tier 1 | **Done** |

### 3.1 `@remcostoeten/ingestion` package

Extract `apps/ingestion/src` → `packages/ingestion`. `apps/ingestion` becomes a thin deploy shell.

**Exports:**

```typescript
// Separate analytics-api project: api/index.ts
export { default } from "@remcostoeten/ingestion/vercel";

// Custom Hono/Express mount
import { createIngestionApp } from "@remcostoeten/ingestion";
app.route("/analytics", createIngestionApp());

// Migrations (one-time)
npx @remcostoeten/ingestion migrate
```

**Not exported into consumer browser bundles** — server-only imports.

### 3.2 Keep the package lean

| Technique | Why |
| --- | --- |
| Peer deps for `hono`, `drizzle-orm`, `zod`, `@neondatabase/serverless` | Dedupe in consumer lockfile; no double-bundle |
| `@remcostoeten/ingestion/vercel` subpath | Minimal handler entry; no dev landing page |
| Migrations via CLI only | SQL not loaded at runtime |
| No dashboard code in package | Dashboard stays separate (Sprint 8) |

Document expected serverless bundle size (~500KB–2MB) for Tier 2 co-located installs.

### 3.3 `create-analytics` CLI

```bash
npx create-analytics
```

Prompts:

```
? Integration tier:
  → Separate analytics-api project (recommended)
  → API route in this app (larger server bundle)
  → SDK only — I already have an ingestion URL
```

**Tier 1 scaffolds two folders:**

```
my-project/
  apps/web/              ← Next.js + @remcostoeten/analytics only
  apps/analytics-api/    ← @remcostoeten/ingestion + handler + .env.example
```

**Tier 2 scaffolds one app with warning:**

```
my-app/
  app/api/analytics/[...path]/route.ts
  ⚠ Adds server-side deps to this deploy
```

**Tier 3 scaffolds SDK + env only.**

### 3.4 What we explicitly do NOT default to

- Installing ingestion in the same project as the SDK without a warning
- Bundling dashboard into the ingestion package
- Managed multi-tenant hosting

### Acceptance criteria

- Tier 1: fresh setup → first pageview in < 10 minutes
- Consumer Next.js app `node_modules` contains only `@remcostoeten/analytics` (Tier 1)
- `apps/ingestion` in monorepo still deploys unchanged (imports package)
- All existing ingestion tests pass

---

## Sprint 4 — Privacy and compliance

**Goal:** EU-ready consent before any persistent identifier is written.

| # | Feature | Why | Done when |
| --- | --- | --- | --- |
| 4.1 | Consent-gated init | `getVisitorId()` writes localStorage on first track today | No storage writes before consent |
| 4.2 | Privacy disclosure exports | Consumers need privacy policy copy | `PRIVACY_DISCLOSURE` + `getStoredKeys()` exported |

```tsx
<Analytics consentGranted={hasConsent} consentRequired />
```

---

## Sprint 5 — Server-side tracking

**Goal:** Events that only happen on the server (webhooks, payments, signups).

| # | Feature | Why | Done when |
| --- | --- | --- | --- |
| 5.1 | `@remcostoeten/analytics/server` | Browser SDK no-ops on server | Works in server actions + API routes |
| 5.2 | Optional ingest auth | Server events need trust boundary | HMAC or API key on `/ingest` |

Separate export path — zero browser bundle impact.

---

## Sprint 6 — Reliability and batching

| # | Feature | Why | Done when |
| --- | --- | --- | --- |
| 6.1 | Offline queue | Flaky networks lose events silently | Events flush after reconnect |
| 6.2 | Batch ingest API | One event per request is wasteful at scale | `POST /ingest/batch` accepts array |

---

## Sprint 7 — Auto observers (opt-in)

| # | Feature | Default | Event |
| --- | --- | --- | --- |
| 7.1 | Outbound link tracking | `trackOutbound={false}` | `outbound_click` |
| 7.2 | Form submission tracking | `trackForms={false}` | `form_submit` |
| 7.3 | Global error observer | `trackErrors={false}` | uncaught errors |

All opt-in. No surprise tracking.

---

## Sprint 8 — Dashboard template (optional)

Deploy dashboard without cloning monorepo. Lower priority — dashboard is customized per project.

Consider `create-analytics --dashboard` flag instead of a full npm package.

---

## Priority matrix

| Sprint | Impact | Effort | Status |
| --- | --- | --- | --- |
| 1 — SDK DX | High | Low | Done |
| 2 — Declarative | High | Low | Done |
| 3 — Deploy (tiered) | Very high | Medium | **Done** |
| 4 — Privacy | High (EU) | Medium | Pending |
| 5 — Server | Medium | Medium | Pending |
| 6 — Reliability | Medium | Medium | Pending |
| 7 — Auto observers | Medium | Low | Pending |
| 8 — Dashboard | Low | High | Pending |

---

## Explicit non-goals

| Item | Reason |
| --- | --- |
| Session replay / heatmaps | Different product, huge bundle + privacy surface |
| Cookie-based tracking | Violates privacy principles |
| Auto-track all clicks | Noisy, hard to opt out per-element |
| Ingestion inside app by default | Bloats serverless bundle; Tier 2 only with warning |
| Managed multi-tenant SaaS | Business decision, not SDK scope |

---

## Success metrics

| Metric | Target |
| --- | --- |
| Tier 1 setup → first pageview | < 10 min |
| SDK bundle (Sprint 1–2) | < 5 KB gzipped |
| Tier 1 app installs ingestion npm | Never (by default) |
| Ingest URL misconfiguration | Zero (after Sprint 3 docs + CLI) |

---

## Start here

**Sprint 4** is next: consent-gated init + privacy disclosure exports.
