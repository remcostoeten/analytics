# @remcostoeten/ingestion

Self-hosted analytics ingestion for [Remco Analytics](https://github.com/remcostoeten/analytics). Deploy as a **separate project** — do not install in your Next.js app unless you accept a larger serverless bundle.

## Recommended setup (Tier 1)

```
my-next-app/              analytics-api/  (separate Vercel project)
├── @remcostoeten/analytics   ├── @remcostoeten/ingestion
└── POST → analytics-api...   └── DATABASE_URL + IP_HASH_SECRET
```

## Install

```bash
npm install @remcostoeten/ingestion hono drizzle-orm @neondatabase/serverless zod ua-parser-js
```

Peer dependencies must be installed in the analytics-api project.

## Vercel handler

```typescript
// api/index.ts
export { default } from "@remcostoeten/ingestion/vercel";
```

## Custom server

```typescript
import { createIngestionApp } from "@remcostoeten/ingestion";

const ingestion = createIngestionApp();
app.route("/", ingestion);
```

## Environment variables

| Variable               | Required            | Purpose                                                                                                                                 |
| ---------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | Yes                 | Neon Postgres connection string                                                                                                         |
| `IP_HASH_SECRET`       | Yes in production   | Min 32 chars, IP hashing salt                                                                                                           |
| `ORIGIN_ALLOWLIST`     | No                  | Comma-separated allowed origins (empty = all origins allowed)                                                                           |
| `INGEST_SECRET`        | For server tracking | Bearer token for server-to-server requests                                                                                              |
| `INTERNAL_IPS`         | No                  | Comma-separated raw IP addresses flagged as internal traffic                                                                            |
| `INTERNAL_VISITOR_IDS` | No                  | Comma-separated visitor IDs (SDK `localStorage` fingerprint) flagged as internal traffic                                                |
| `INTERNAL_IP_HASHES`   | No                  | Deprecated — `ip_hash` uses a daily salt, so values stop matching after a day. Use `INTERNAL_IPS`                                       |
| `GEOIP_MMDB_PATH`      | No                  | Path to a MaxMind GeoLite2/GeoIP2 City `.mmdb` file; defaults to the `GeoLite2-City.mmdb` the Vercel build bundles next to the function |
| `GEOIP_ASN_MMDB_PATH`  | No                  | Path to a MaxMind GeoLite2 ASN `.mmdb` file; defaults to the bundled `GeoLite2-ASN.mmdb`. Adds network/ISP (`asn`, `as_org`) to events  |

### `IP_HASH_SECRET`

IPs are never stored raw — each event keeps an `ip_hash` derived from the address plus a daily-rotating salt. That hash is only pseudonymous if the secret is unguessable: with a known secret, the entire IPv4 space can be hashed offline in seconds and every `ip_hash` reversed to an address.

Ingestion therefore **fails to start in production** (`NODE_ENV=production` or `VERCEL_ENV=production`) when `IP_HASH_SECRET` is missing, still set to the `default-secret-change-me` placeholder, or shorter than 32 characters. Outside production it logs a warning once and falls back to the placeholder.

```bash
openssl rand -hex 32
```

## Geolocation

Geo is resolved per event from free sources:

1. **MaxMind City database** — the Vercel build bundles a GeoLite2 City `.mmdb` (P3TERX mirror) into the function; `GEOIP_MMDB_PATH` overrides it. When the database resolves a city it takes precedence, because edge headers collapse many ISP ranges onto a single hub city (e.g. most of the Netherlands onto Amsterdam) while GeoLite2 resolves the actual municipality, typically within ~25–50 km.
2. **Vercel edge headers** — country, region, city, latitude/longitude, timezone, postal code, continent (`x-vercel-ip-*`); fills whatever the database left empty, and is the primary source when no database is available.
3. **Cloudflare headers** — same fields when [visitor location managed transforms](https://developers.cloudflare.com/rules/transform/managed-transforms/) are enabled; country-only otherwise.
4. **Client timezone** — the SDK sends the browser's IANA timezone; it is stored per event/visitor and used as a country-level fallback when IP-based geo is unavailable.

## Request authorization

Ingestion accepts two request sources:

| Source                                           | How it authenticates                               |
| ------------------------------------------------ | -------------------------------------------------- |
| Browser (`<Analytics />`, `trackEvent`)          | `Origin` header checked against `ORIGIN_ALLOWLIST` |
| Server (`trackServerEvent`, `createServerTrack`) | `Authorization: Bearer <INGEST_SECRET>` header     |

Set the same `INGEST_SECRET` value on both the ingestion service and your app server (as `INGEST_SECRET`, never `NEXT_PUBLIC_INGEST_SECRET`). The `@remcostoeten/analytics/server` SDK reads it from env and attaches it automatically.

In production, restrict browser origins:

```bash
ORIGIN_ALLOWLIST=https://your-app.vercel.app
```

## Migrations

```bash
DATABASE_URL=postgres://... npx drizzle-kit up:pg --config node_modules/@remcostoeten/ingestion/drizzle.config.ts
```

Or from a checkout of this monorepo:

```bash
cd packages/ingestion && bun run db:migrate
```

## Endpoints

| Method | Path             | Purpose                                             |
| ------ | ---------------- | --------------------------------------------------- |
| GET    | `/health`        | Health check                                        |
| POST   | `/e`             | Ingest event (SDK default)                          |
| POST   | `/e/batch`       | Batch ingest up to 100 events (offline queue flush) |
| POST   | `/ingest`        | Ingest event (alias)                                |
| POST   | `/ingest/batch`  | Batch ingest (alias)                                |
| GET    | `/metrics`       | Request metrics                                     |
| GET    | `/admin/stats`   | Admin statistics                                    |
| POST   | `/admin/cleanup` | Data retention cleanup (also GET, for cron)         |
| POST   | `/admin/rollup`  | Rebuild daily rollups, `?days=N` (also GET)         |

Admin endpoints accept `ADMIN_SECRET` or `CRON_SECRET` as a bearer token, so Vercel crons can call the GET variants directly:

```json
"crons": [
	{ "path": "/admin/cleanup", "schedule": "0 3 * * *" },
	{ "path": "/admin/rollup", "schedule": "30 2 * * *" }
]
```

Point the SDK at your deployment base URL:

```bash
NEXT_PUBLIC_ANALYTICS_URL=https://analytics-api.yourdomain.com
```

## Rate limiting is per-instance

`utilities/rate-limit.ts` keeps its counters in a module-scope `Map`. On a single long-lived process that is an accurate limit. On serverless (the `vercel.json` in `apps/ingestion` deploys the app as functions) every concurrent instance holds its own counters, so the effective ceiling is the configured limit multiplied by the number of warm instances, and it resets on every cold start.

Treat it as abuse dampening, not a guarantee. If you need a real ceiling, put a CDN/WAF rate limit in front of the ingestion origin, or move the counters into Postgres or Redis.

Deduplication is not affected — events carry a `fingerprint` column with a unique index, so duplicates are rejected by the database across all instances. The in-memory dedupe cache is only a fast path in front of that.

## Changelog

### 0.2.0

- **Requires migrations `0007_add_event_fingerprint.sql` and `0008_add_rollup_daily.sql`.**
- Durable dedupe: events carry a `fingerprint` column with a unique index; duplicate inserts are dropped at the database, not just per-instance memory.
- Client `ts` from the SDK (v1.6.0+) is validated (max 2 min future skew, max 7 days old) and used for the event timestamp, dedupe fingerprint, and session timing, so offline-queued events land on the right day.
- Dedupe fingerprint includes `meta.eventName`, so distinct custom events flushed together (scroll, time-on-page, web-vitals) no longer collapse into one.
- Daily rollups: `rollup_daily` table with total/path/country dimensions per project per UTC day, rebuilt idempotently via `/admin/rollup`.
- Retention cleanup fixed (previously matched zero rows due to a `meta->>'botDetected'` filter on a key that was never written) and schedulable via cron.
