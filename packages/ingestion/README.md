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

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `IP_HASH_SECRET` | Yes in production | Min 32 chars, IP hashing salt |
| `ORIGIN_ALLOWLIST` | No | Comma-separated allowed origins |

## Migrations

```bash
DATABASE_URL=postgres://... npx drizzle-kit up:pg --config node_modules/@remcostoeten/ingestion/drizzle.config.ts
```

Or from a checkout of this monorepo:

```bash
cd packages/ingestion && bun run db:migrate
```

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Health check |
| POST | `/e` | Ingest event (SDK default) |
| POST | `/ingest` | Ingest event (alias) |

Point the SDK at your deployment base URL:

```bash
NEXT_PUBLIC_ANALYTICS_URL=https://analytics-api.yourdomain.com
```
