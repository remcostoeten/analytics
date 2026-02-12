# Remco Analytics

Status: Draft  
Owner: Remco  
Repo: github.com/remcostoeten/analytics  
License: MIT

Purpose
Build a private, first party analytics platform that mimics the practical metrics of Vercel Analytics, but owned and operated by Remco, with data stored in a single Neon Postgres database and usable across multiple apps with minimal per app work.

Non goals
- No public SaaS productization
- No multi tenant auth, billing, or user management
- No extreme scalability work, low traffic only

High level architecture
1) SDK (npm package)
- Package: @remcostoeten/analytics
- Export: Analytics React component
- Optional export: track(event, meta)
- Captures page views and selected events
- Cookie free: no HTTP cookies
- Sends events to a single ingestion endpoint over HTTPS
- Project identification:
  - default: derived from window.location.host
  - override: prop or env var
- Configuration:
  - ingest URL via NEXT_PUBLIC_REMCO_ANALYTICS_URL (or default fallback)
  - optional project override via NEXT_PUBLIC_REMCO_ANALYTICS_PROJECT

2) Ingestion service (deployed once)
- Location: apps/ingestion
- Runtime: Vercel serverless Node runtime preferred
- Framework: Hono on Node runtime
- Endpoints:
  - GET /health
  - POST /ingest
- Responsibilities:
  - validate payload
  - classify localhost and environment
  - basic bot filtering
  - derive geo from request headers or IP lookup strategy
  - write to Neon Postgres via Drizzle
  - implement minimal dedupe protections

3) Database and schema (shared)
- Location: packages/db
- Owns:
  - Drizzle schema
  - migrations
  - shared event validation types
  - db client factory
- Single Neon Postgres instance used by:
  - ingestion writes
  - dashboard reads

4) Dashboard (private)
- Location: apps/dashboard
- Next.js app
- Reads from Neon via packages/db
- Views:
  - overview: pageviews, visitors estimate, sessions estimate
  - timeseries: daily or hourly
  - top pages
  - referrers
  - geo map data (country, region, city)
  - project filter by projectId
- Authentication: private access only, minimal initially

Data model direction
Start with one canonical events table that is project aware.

Minimum columns baseline
- id bigserial primary key
- project_id text not null
- type text not null
- ts timestamptz not null default now()
- path text
- referrer text
- origin text
- host text
- is_localhost boolean
- ua text
- lang text
- ip_hash text
- visitor_id text
- session_id text
- country text
- region text
- city text
- device_type text
- meta jsonb

Security and privacy
- Never expose DB URL client side
- Ingestion service holds secrets
- Avoid storing raw IP, store hashed or truncated and rotate hashing if needed
- Cookie free means no HTTP cookies, localStorage and sessionStorage are allowed

Milestones
- M0: Monorepo bootstrap with tooling and CI
- M1: Ingestion service with health and ingest writing to Neon, migrations included
- M2: SDK Analytics component sending pageviews to ingestion
- M3: Dashboard MVP queries and views
- M4: Dedupe and visitor session quality improvements
