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

| Variable              | Required            | Purpose                                                                                                                                               |
| --------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`        | Yes                 | Neon Postgres connection string                                                                                                                       |
| `IP_HASH_SECRET`      | Yes in production   | Min 32 chars, IP hashing salt                                                                                                                         |
| `ORIGIN_ALLOWLIST`    | No                  | Comma-separated allowed origins (empty = all origins allowed)                                                                                         |
| `INGEST_SECRET`       | For server tracking | Bearer token for server-to-server requests                                                                                                            |
| `INTERNAL_IP_HASHES`  | No                  | Comma-separated IP hashes flagged as internal traffic                                                                                                 |
| `GEOIP_MMDB_PATH`     | No                  | Path to a MaxMind GeoLite2/GeoIP2 City `.mmdb` file, used as geo fallback when not behind Vercel/Cloudflare (requires optional `mmdb-lib` dependency) |
| `GEOIP_ASN_MMDB_PATH` | No                  | Path to a MaxMind GeoLite2 ASN `.mmdb` file; adds network/ISP (`asn`, `as_org`) to events for carrier and datacenter insights                         |

## Geolocation

Geo is resolved per event from free sources, richest first:

1. **Vercel edge headers** — country, region, city, latitude/longitude, timezone, postal code, continent (`x-vercel-ip-*`).
2. **Cloudflare headers** — same fields when [visitor location managed transforms](https://developers.cloudflare.com/rules/transform/managed-transforms/) are enabled; country-only otherwise.
3. **Self-hosted MaxMind database** — set `GEOIP_MMDB_PATH` to a GeoLite2 City `.mmdb` (free with a MaxMind account) for deployments not behind Vercel or Cloudflare, and to fill fields the headers left empty.
4. **Client timezone** — the SDK sends the browser's IANA timezone; it is stored per event/visitor and used as a country-level fallback when IP-based geo is unavailable.

Note that IP-based city accuracy is inherently limited: ISPs register address blocks at central locations, so e.g. many Dutch visitors resolve to Amsterdam regardless of their actual city. Latitude/longitude and region are more reliable dimensions than city.

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
| POST   | `/admin/cleanup` | Data retention cleanup                              |

Point the SDK at your deployment base URL:

```bash
NEXT_PUBLIC_ANALYTICS_URL=https://analytics-api.yourdomain.com
```
