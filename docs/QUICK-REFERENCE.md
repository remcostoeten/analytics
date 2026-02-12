# Quick Reference Card

One-page reference for Remco Analytics development.

## Architecture

```
Client (SDK) → Ingestion (Hono) → Database (Neon) → Dashboard (Next.js)
```

## Key Files

```
packages/db/src/schema.ts          # Database schema
packages/sdk/src/analytics.tsx     # Analytics component
packages/sdk/src/track.ts          # Track function
packages/sdk/src/visitor-id.ts     # Visitor ID logic
packages/sdk/src/session-id.ts     # Session ID logic
apps/ingestion/src/app.ts          # Hono routes
apps/ingestion/src/handlers/ingest.ts  # POST /ingest
apps/ingestion/src/geo.ts          # Geo extraction
apps/ingestion/src/bot-detection.ts    # Bot filtering
apps/ingestion/src/dedupe.ts       # Deduplication
apps/dashboard/src/queries/*       # Dashboard queries

# Tests
packages/sdk/src/__tests__/*       # SDK unit tests
apps/ingestion/src/__tests__/*     # Ingestion unit tests
apps/ingestion/tests/integration/* # Integration tests
e2e/*.spec.ts                      # E2E tests
```

## Environment Variables

```bash
# Ingestion (server-side)
DATABASE_URL=postgresql://user:pass@host/db
IP_HASH_SECRET=your-secret-min-32-chars
DEDUPE_ENABLED=true
DEDUPE_TTL_MS=60000

# SDK (client-side)
NEXT_PUBLIC_REMCO_ANALYTICS_URL=https://ingest.example.com/ingest
NEXT_PUBLIC_REMCO_ANALYTICS_PROJECT=my-app
```

## Database Schema

```typescript
events {
  id: bigserial
  projectId: text
  type: text (default: 'pageview')
  ts: timestamptz
  path: text
  referrer: text
  visitorId: text
  sessionId: text
  ipHash: text
  country: text
  region: text
  city: text
  deviceType: text
  meta: jsonb
}
```

## SDK Usage

```typescript
// Install
bun add @remcostoeten/analytics

// Basic usage
import { Analytics } from '@remcostoeten/analytics'
<Analytics />

// Custom tracking
import { track } from '@remcostoeten/analytics'
track('button_click', { button: 'signup' })
```

## Ingestion Flow

```
1. Receive POST /ingest
2. Extract IP → hash with daily salt
3. Extract geo from Vercel headers
4. Detect bot (UA + headers)
5. Generate fingerprint
6. Check dedupe cache
7. Insert to database
8. Return { ok: true }
```

## Key Indexes

```sql
events_project_ts_idx (project_id, ts DESC)
events_visitor_idx (visitor_id)
events_session_idx (session_id)
events_path_idx (path)
events_country_idx (country)
```

## Bot Detection

```typescript
// 40+ patterns including:
/bot/i, /crawler/i, /headless/i, /curl/i
/googlebot/i, /gptbot/i, /selenium/i

// Check: Vercel x-vercel-bot header
// Tag as deviceType: 'bot'
```

## Deduplication

```typescript
// Fingerprint: SHA-256 of
projectId::visitorId::sessionId::type::path::roundedTimestamp

// Cache: In-memory Map with 60s TTL
// Max size: 100k entries with LRU eviction
```

## Visitor/Session IDs

```typescript
// Visitor: localStorage 'remco_analytics_visitor_id'
// Session: sessionStorage 'remco_analytics_session_id'
// Both: UUID v4, client-generated
// Session timeout: 30 minutes idle
```

## Geo Lookup

```typescript
// Primary: Vercel headers
x-vercel-ip-country → country (US)
x-vercel-ip-country-region → region (CA)
x-vercel-ip-city → city (San Francisco)

// Fallback: Cloudflare cf-ipcountry
// No external GeoIP database
```

## Common Queries

```typescript
// Unique visitors
COUNT(DISTINCT visitor_id)
WHERE project_id = ? AND ts BETWEEN ? AND ?

// Total pageviews
COUNT(*)
WHERE project_id = ? AND type = 'pageview' AND ts BETWEEN ? AND ?

// Top pages
SELECT path, COUNT(*) as views
WHERE project_id = ? AND ts BETWEEN ?
GROUP BY path
ORDER BY views DESC
LIMIT 10
```

## Commands

```bash
# Install dependencies
bun install

# Development
bun run dev:ingestion

# Linting
bun run lint

# Formatting
bun run fmt
bun run fmt:check

# Type checking
bun run typecheck

# Tests
bun run test

# Migrations
bun run -C packages/db migrate

# Testing
bun test                        # All tests
bun test --watch                # Watch mode
bun test --coverage             # With coverage
bun test tests/integration      # Integration only
bunx playwright test            # E2E tests
```

## Testing

```typescript
// Mock SDK in tests
jest.mock('@remcostoeten/analytics')

// Test ingestion
const response = await fetch('/ingest', {
  method: 'POST',
  body: JSON.stringify({ type: 'pageview', path: '/' })
})

// Verify database
const events = await db.select().from(events).where(...)
```

## Performance Targets

- Ingestion latency: < 100ms p95
- Dashboard queries: < 500ms p95
- SDK bundle size: < 5KB gzipped
- Database: optimized for 1M events/month

## Privacy

- No HTTP cookies
- No raw IPs (hashed with daily salt)
- No PII
- User opt-out via localStorage
- DNT header respected

## Code Style

- Use `type`, never `interface`
- Use `function`, never arrow functions
- No comments (self-explanatory code)
- Kebab-case file names
- Max two words for names

## Git Workflow

```bash
# Branch naming
feature/M1-description    # Features
fix/issue-description     # Fixes
chore/task-description    # Maintenance

# Commit format
type(scope): subject
feat(ingestion): add geo extraction
fix(sdk): handle null visitor ID

# Workflow
git checkout develop
git checkout -b feature/M1-my-feature
git commit -m "feat(scope): description"
git push origin feature/M1-my-feature
# Create PR, review, squash and merge
```

## Testing Strategy

```bash
# Unit tests (60%)
bun test src/__tests__/*.test.ts

# Integration tests (30%)
bun test tests/integration/*.test.ts

# E2E tests (10%)
bunx playwright test

# Performance tests
k6 run performance/ingest-load.js
```

## Documentation

See `docs/` for detailed specs:
- 06-schema.md - Database
- 07-geo-and-ip.md - Geo/IP
- 08-visitor-session-ids.md - Identity
- 09-bot-filtering.md - Bots
- 10-deduplication.md - Dedupe
- 11-sdk-usage.md - SDK API
- 12-testing-strategy.md - Testing
- 13-git-workflow.md - Git branching

## Common Issues

**Events not appearing?**
- Check `/health` endpoint
- Enable debug mode: `<Analytics debug />`
- Verify DATABASE_URL is set

**Duplicates?**
- Check dedupe is enabled
- Verify cache is working
- Review fingerprint generation

**Bot traffic?**
- Check deviceType field
- Review bot patterns
- Add to whitelist if needed

**No geo data?**
- Verify Vercel deployment
- Check x-vercel-ip-* headers
- Fallback to Cloudflare headers

## Links

- Repository: github.com/remcostoeten/analytics
- License: MIT
- Owner: Remco