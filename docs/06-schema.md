# Database Schema

Owner: Remco
Status: Draft

## Overview

Single canonical events table in Neon Postgres, accessed via Drizzle ORM from packages/db.

## Schema Definition

```typescript
// packages/db/src/schema.ts
import { pgTable, bigserial, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core'

export const events = pgTable('events', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  projectId: text('project_id').notNull(),
  type: text('type').notNull().default('pageview'),
  ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
  
  // Page context
  path: text('path'),
  referrer: text('referrer'),
  origin: text('origin'),
  host: text('host'),
  
  // Environment
  isLocalhost: boolean('is_localhost').default(false),
  
  // User agent and device
  ua: text('ua'),
  lang: text('lang'),
  deviceType: text('device_type'),
  
  // Privacy preserving identifiers
  ipHash: text('ip_hash'),
  visitorId: text('visitor_id'),
  sessionId: text('session_id'),
  
  // Geo data
  country: text('country'),
  region: text('region'),
  city: text('city'),
  
  // Custom event metadata
  meta: jsonb('meta'),
}, (table) => ({
  // Primary query indexes
  projectTsIdx: index('events_project_ts_idx').on(table.projectId, table.ts.desc()),
  projectTypeIdx: index('events_project_type_idx').on(table.projectId, table.type),
  
  // Visitor and session queries
  visitorIdx: index('events_visitor_idx').on(table.visitorId),
  sessionIdx: index('events_session_idx').on(table.sessionId),
  
  // Analytics queries
  pathIdx: index('events_path_idx').on(table.path),
  hostIdx: index('events_host_idx').on(table.host),
  countryIdx: index('events_country_idx').on(table.country),
  
  // Composite for common dashboard queries
  projectTsTypeIdx: index('events_project_ts_type_idx').on(table.projectId, table.ts.desc(), table.type),
}))

export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert
```

## Index Strategy

### Primary Indexes
- `events_project_ts_idx`: All dashboard queries filter by project and time range
- `events_project_type_idx`: Event type filtering per project
- `events_project_ts_type_idx`: Composite for filtered timeseries queries

### Analytics Indexes
- `events_path_idx`: Top pages queries
- `events_host_idx`: Multi-domain projects
- `events_country_idx`: Geo distribution queries

### Identity Indexes
- `events_visitor_idx`: Unique visitor counting and dedupe
- `events_session_idx`: Session analysis

## Column Details

### id
- bigserial auto-incrementing primary key
- Never exposed to clients
- Use for internal ordering and pagination

### projectId
- Derived from hostname by default
- Can be overridden via SDK prop or env var
- Format: domain without protocol (example.com, app.vercel.app)
- Not null, always required

### type
- Default: 'pageview'
- Custom events: 'click', 'submit', 'error', etc.
- Keep lowercase, no spaces

### ts
- Timestamp with timezone
- Server-side timestamp, never trust client
- Default now() on insert
- All queries use this for time ranges

### path
- URL pathname only (no query params, no hash)
- Example: /blog/post-title
- Nullable for non-pageview events

### referrer
- Full referrer URL from client
- Nullable (direct traffic has no referrer)
- Used for traffic source analysis

### origin
- Client origin (protocol + domain + port)
- Example: https://example.com
- Useful for CORS validation and multi-origin tracking

### host
- Hostname only, no protocol
- Example: example.com
- Used when projectId is overridden but you still want to know the actual host

### isLocalhost
- Boolean flag for localhost detection
- true if host is localhost, 127.0.0.1, or .local
- Used to filter out dev traffic in dashboard

### ua
- Raw user agent string
- Used for bot detection and device classification
- Consider truncating very long UAs (max 512 chars)

### lang
- Browser language from Accept-Language header
- Example: en-US, pt-BR
- Nullable

### deviceType
- Classified device category
- Values: 'desktop', 'mobile', 'tablet', 'bot'
- Derived from UA during ingestion

### ipHash
- SHA-256 hash of IP + daily salt
- Never store raw IP
- Used for visitor counting and rate limiting
- Salt rotation strategy: daily or weekly

### visitorId
- Client-generated UUID v4
- Stored in localStorage
- Survives page reloads, not sessions
- Nullable for first-time visitors until SDK sets it

### sessionId
- Client-generated UUID v4
- Stored in sessionStorage
- Cleared on tab close
- Nullable for first event in session

### country
- ISO 3166-1 alpha-2 country code
- Example: US, BR, NL
- Uppercase
- Nullable

### region
- State or region within country
- Example: California, SP, North Holland
- Nullable

### city
- City name
- Example: San Francisco, São Paulo, Amsterdam
- Nullable

### meta
- JSONB for custom event properties
- Schema-free, validated by SDK
- Max size: consider 64KB limit
- Example: { "button": "signup", "value": 99 }

## Migration Strategy

### Initial Migration
```sql
-- migration_001_create_events.sql
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'pageview',
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  path TEXT,
  referrer TEXT,
  origin TEXT,
  host TEXT,
  is_localhost BOOLEAN DEFAULT FALSE,
  ua TEXT,
  lang TEXT,
  device_type TEXT,
  ip_hash TEXT,
  visitor_id TEXT,
  session_id TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  meta JSONB
);

CREATE INDEX events_project_ts_idx ON events (project_id, ts DESC);
CREATE INDEX events_project_type_idx ON events (project_id, type);
CREATE INDEX events_visitor_idx ON events (visitor_id);
CREATE INDEX events_session_idx ON events (session_id);
CREATE INDEX events_path_idx ON events (path);
CREATE INDEX events_host_idx ON events (host);
CREATE INDEX events_country_idx ON events (country);
CREATE INDEX events_project_ts_type_idx ON events (project_id, ts DESC, type);
```

### Migration Management
- Use Drizzle Kit for migrations
- Store in packages/db/migrations
- Run via npm script: `bun run migrate`
- Ingestion should fail gracefully if schema is outdated

## Performance Considerations

### Expected Volume
- Low traffic: < 1M events/month
- No need for partitioning initially
- Monitor table size and query performance

### Query Patterns
- Most queries filter by project_id and time range
- Dashboard queries typically aggregate by day or hour
- Top N queries need LIMIT and ORDER BY optimization

### Future Optimizations
- Time-based partitioning when > 10M rows
- Materialized views for common aggregations
- Separate table for aggregated daily stats

## Data Retention

### Policy
- Keep all events initially
- Consider retention policy at 12-24 months
- Archive vs delete strategy TBD

### Cleanup
```sql
-- Example: Delete events older than 2 years
DELETE FROM events WHERE ts < NOW() - INTERVAL '2 years';
```

## Privacy and Compliance

### No PII Storage
- No raw IPs (only hashed)
- No email addresses
- No names or phone numbers
- User agent is not PII per GDPR

### IP Hashing Strategy
```typescript
// Pseudocode
const salt = getDailySalt() // Rotate daily
const ipHash = sha256(ip + salt)
```

### Data Deletion
- Support project-level deletion
- Support visitor-level deletion via visitor_id

```sql
-- Delete all data for a project
DELETE FROM events WHERE project_id = 'example.com';

-- Delete all data for a visitor
DELETE FROM events WHERE visitor_id = 'uuid-here';
```

## Acceptance Criteria

- [ ] Drizzle schema matches this spec
- [ ] All indexes are created
- [ ] Migration runs successfully on Neon
- [ ] Can insert event with all fields
- [ ] Can query events by project and time range in < 100ms
- [ ] Index usage verified with EXPLAIN ANALYZE