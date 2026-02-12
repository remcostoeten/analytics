# Implementation Roadmap

Owner: Remco
Status: Draft

## Overview

Detailed implementation roadmap with specific commits, branches, and acceptance criteria for building the analytics platform from M0 through M4.

## Milestone Overview

```
M0: Bootstrap (Complete) ✅
M1: Ingestion Service (4-6 weeks)
M2: SDK Package (2-3 weeks)
M3: Dashboard (3-4 weeks)
M4: Quality & Polish (2-3 weeks)
Total: 11-16 weeks
```

## M0: Monorepo Bootstrap ✅

**Status:** Complete
**Duration:** 1 week
**Branch:** `master` (initial setup)

### Completed Work

- [x] Repository structure created
- [x] Bun workspaces configured
- [x] Oxlint and oxfmt tooling set up
- [x] TypeScript configuration
- [x] CI pipeline established
- [x] Documentation written

### Verification

```bash
bun install
bun run typecheck
bun run lint
bun run fmt:check
```

---

## M1: Ingestion Service

**Status:** In Progress
**Duration:** 4-6 weeks
**Target:** Production-ready ingestion endpoint

### Branch Structure

```
develop
├── feature/M1-database-schema
├── feature/M1-neon-connection
├── feature/M1-ingest-handler
├── feature/M1-geo-extraction
├── feature/M1-ip-hashing
├── feature/M1-bot-detection
├── feature/M1-dedupe-logic
└── feature/M1-rate-limiting
```

### Phase 1: Database Foundation (Week 1)

#### Branch: `feature/M1-database-schema`

**Commits:**

1. **Initial schema setup**
   ```
   feat(db): add drizzle schema with events table
   
   - Add events table with all columns from docs/06-schema.md
   - Include id, projectId, type, ts, path, referrer, etc.
   - Add JSONB meta column for custom data
   ```

2. **Add indexes**
   ```
   feat(db): add performance indexes to events table
   
   - Add project_ts_idx for time-range queries
   - Add visitor_idx and session_idx for identity
   - Add path_idx, country_idx for analytics queries
   - Add composite project_ts_type_idx
   
   Implements: docs/06-schema.md
   ```

3. **Create migration**
   ```
   feat(db): generate initial migration
   
   - Run drizzle-kit generate
   - Create migration_001_create_events.sql
   - Add migration runner script
   ```

4. **Add type exports**
   ```
   feat(db): export event types for consumers
   
   - Export Event type (inferSelect)
   - Export NewEvent type (inferInsert)
   - Export events table from schema
   ```

5. **Tests**
   ```
   test(db): add schema validation tests
   
   - Test all columns are present
   - Test indexes exist
   - Test insert and select operations
   ```

**PR:** "feat(db): implement events schema with indexes"

**Acceptance:**
- [ ] Schema matches docs/06-schema.md
- [ ] All 8 indexes created
- [ ] Migration file generated
- [ ] Types exported
- [ ] Tests pass

---

#### Branch: `feature/M1-neon-connection`

**Commits:**

1. **Database client**
   ```
   feat(db): add Neon Postgres connection
   
   - Create db client with drizzle-orm/neon-http
   - Add connection pooling configuration
   - Support DATABASE_URL from env
   ```

2. **Connection utilities**
   ```
   feat(db): add connection helpers and health check
   
   - Add testConnection() function
   - Add getDbClient() singleton
   - Add connection retry logic
   ```

3. **Tests**
   ```
   test(db): add connection tests with mock
   
   - Test connection succeeds with valid URL
   - Test connection fails gracefully
   - Test retry logic works
   ```

**PR:** "feat(db): add Neon database connection"

**Acceptance:**
- [ ] Connects to Neon successfully
- [ ] Connection pooling configured
- [ ] Environment variable required
- [ ] Graceful error handling
- [ ] Tests pass

---

### Phase 2: Core Ingestion (Week 2-3)

#### Branch: `feature/M1-ingest-handler`

**Commits:**

1. **Basic handler**
   ```
   feat(ingestion): add POST /ingest route handler
   
   - Create ingest.ts handler
   - Accept JSON payload
   - Validate required fields (projectId, type)
   - Return { ok: true }
   ```

2. **Request validation**
   ```
   feat(ingestion): add payload validation with Zod
   
   - Define event schema with Zod
   - Validate all incoming fields
   - Return 400 for invalid payloads
   - Add helpful error messages
   ```

3. **Database insert**
   ```
   feat(ingestion): integrate database writes
   
   - Import db client from @remcostoeten/db
   - Insert validated events to events table
   - Handle database errors gracefully
   - Return 500 on database failure
   ```

4. **Timestamp handling**
   ```
   feat(ingestion): use server-side timestamps
   
   - Ignore client-provided timestamps
   - Use NOW() on database insert
   - Ensure ts is never null
   ```

5. **Tests**
   ```
   test(ingestion): add ingest handler unit tests
   
   - Test valid payload succeeds
   - Test invalid payload returns 400
   - Test database insert called correctly
   - Test error handling
   ```

6. **Integration tests**
   ```
   test(ingestion): add end-to-end ingest tests
   
   - Test full flow: request → handler → database
   - Verify event saved with correct data
   - Test concurrent requests
   ```

**PR:** "feat(ingestion): implement POST /ingest endpoint"

**Acceptance:**
- [ ] POST /ingest accepts valid events
- [ ] Validation rejects invalid payloads
- [ ] Events inserted to database
- [ ] Server-side timestamps used
- [ ] Unit tests pass
- [ ] Integration tests pass

---

#### Branch: `feature/M1-geo-extraction`

**Commits:**

1. **Geo extractor**
   ```
   feat(ingestion): add geo extraction from Vercel headers
   
   - Create geo.ts module
   - Extract country, region, city from x-vercel-ip-* headers
   - Return null when headers missing
   
   Implements: docs/07-geo-and-ip.md
   ```

2. **Fallback support**
   ```
   feat(ingestion): add Cloudflare geo fallback
   
   - Check cf-ipcountry header if Vercel headers absent
   - Handle 'XX' country code (unknown)
   - Maintain null values for region/city on fallback
   ```

3. **Integration**
   ```
   feat(ingestion): integrate geo extraction in ingest handler
   
   - Call extractGeoFromRequest() in handler
   - Store geo data in event record
   - Log when geo data unavailable (debug mode)
   ```

4. **Tests**
   ```
   test(ingestion): add geo extraction tests
   
   - Test Vercel headers extraction
   - Test Cloudflare fallback
   - Test null handling when no headers
   - Test integration in handler
   ```

**PR:** "feat(ingestion): add geographic data extraction"

**Acceptance:**
- [ ] Vercel headers extracted correctly
- [ ] Cloudflare fallback works
- [ ] Nulls handled gracefully
- [ ] Geo data saved to database
- [ ] Tests pass

---

#### Branch: `feature/M1-ip-hashing`

**Commits:**

1. **IP extraction**
   ```
   feat(ingestion): add IP address extraction
   
   - Check x-real-ip header (Vercel)
   - Check cf-connecting-ip (Cloudflare)
   - Check x-forwarded-for with first IP
   - Return null for local development
   
   Implements: docs/07-geo-and-ip.md
   ```

2. **Hashing logic**
   ```
   feat(ingestion): implement IP hashing with daily salt
   
   - Create ip-hash.ts module
   - Generate daily salt from IP_HASH_SECRET + date
   - Hash IP with SHA-256
   - Never store raw IPs
   ```

3. **Environment detection**
   ```
   feat(ingestion): detect localhost and preview environments
   
   - Create isLocalhost() function
   - Create isPreviewEnvironment() function
   - Set flags in event record
   ```

4. **Integration**
   ```
   feat(ingestion): integrate IP hashing in handler
   
   - Extract IP from request
   - Hash with daily salt
   - Store ipHash in database
   - Set isLocalhost flag
   ```

5. **Tests**
   ```
   test(ingestion): add IP handling tests
   
   - Test IP extraction from various headers
   - Test hashing produces consistent results
   - Test daily salt rotation
   - Test localhost detection
   - Test preview environment detection
   ```

**PR:** "feat(ingestion): add privacy-preserving IP handling"

**Acceptance:**
- [ ] IP extracted from headers
- [ ] IP hashed with daily salt
- [ ] No raw IPs stored
- [ ] IP_HASH_SECRET required
- [ ] Localhost detection works
- [ ] Tests pass

---

### Phase 3: Traffic Quality (Week 3-4)

#### Branch: `feature/M1-bot-detection`

**Commits:**

1. **Bot patterns**
   ```
   feat(ingestion): add bot detection patterns
   
   - Create bot-detection.ts module
   - Add 40+ bot regex patterns
   - Include search engines, AI scrapers, headless browsers
   
   Implements: docs/09-bot-filtering.md
   ```

2. **Detection methods**
   ```
   feat(ingestion): implement multi-method bot detection
   
   - Check x-vercel-bot header
   - Check user agent patterns
   - Check for missing browser headers
   - Return BotDetectionResult with confidence
   ```

3. **Device classification**
   ```
   feat(ingestion): add device type classification
   
   - Create classifyDevice() function
   - Detect mobile, tablet, desktop, bot
   - Parse user agent for device signals
   ```

4. **Integration**
   ```
   feat(ingestion): tag bot traffic in events
   
   - Run bot detection in handler
   - Set deviceType to 'bot' when detected
   - Store bot metadata in meta field
   - Allow bots through (tag, don't block)
   ```

5. **Tests**
   ```
   test(ingestion): add bot detection tests
   
   - Test 20+ known bot user agents
   - Test real browser user agents allowed
   - Test Vercel bot header detection
   - Test device classification accuracy
   - Test integration in handler
   ```

**PR:** "feat(ingestion): implement bot detection and tagging"

**Acceptance:**
- [ ] 40+ bot patterns implemented
- [ ] Multi-method detection works
- [ ] Device type classification accurate
- [ ] Bots tagged, not blocked
- [ ] Tests pass with 0 false positives

---

#### Branch: `feature/M1-dedupe-logic`

**Commits:**

1. **Fingerprint generation**
   ```
   feat(ingestion): add event fingerprint generation
   
   - Create dedupe.ts module
   - Generate SHA-256 fingerprint from event key
   - Include projectId, visitorId, sessionId, type, path
   - Round timestamp to 10-second window
   
   Implements: docs/10-deduplication.md
   ```

2. **Dedupe cache**
   ```
   feat(ingestion): implement in-memory dedupe cache
   
   - Create DedupeCache class
   - Store fingerprints with TTL
   - Max 100k entries with LRU eviction
   - Cleanup expired entries periodically
   ```

3. **Integration**
   ```
   feat(ingestion): integrate deduplication in handler
   
   - Generate fingerprint for each event
   - Check cache for duplicates
   - Block duplicate events within TTL
   - Return { ok: true, deduped: true } for dupes
   ```

4. **Metrics**
   ```
   feat(ingestion): add dedupe metrics collection
   
   - Track total requests
   - Track duplicates blocked
   - Expose GET /metrics endpoint
   - Include cache size and hit rate
   ```

5. **Tests**
   ```
   test(ingestion): add deduplication tests
   
   - Test fingerprint consistency
   - Test cache detects duplicates
   - Test TTL expiration
   - Test cache size limits
   - Test metrics collection
   - Test integration in handler
   ```

**PR:** "feat(ingestion): add event deduplication"

**Acceptance:**
- [ ] Fingerprints generated consistently
- [ ] Cache detects duplicates within TTL
- [ ] Cache size limited to 100k
- [ ] Metrics exposed at /metrics
- [ ] Tests pass

---

#### Branch: `feature/M1-rate-limiting`

**Commits:**

1. **Rate limiter**
   ```
   feat(ingestion): add rate limiting by IP hash
   
   - Create rate-limiter.ts module
   - Track requests per IP hash
   - 100 requests per minute limit
   - 1-minute reset window
   ```

2. **Integration**
   ```
   feat(ingestion): enforce rate limits in handler
   
   - Check rate limit before processing
   - Return 429 when limit exceeded
   - More strict limits for detected bots (10/min)
   ```

3. **Tests**
   ```
   test(ingestion): add rate limiting tests
   
   - Test 100 requests allowed
   - Test 101st request blocked
   - Test reset after window
   - Test bot-specific limits
   ```

**PR:** "feat(ingestion): add rate limiting"

**Acceptance:**
- [ ] Rate limiting works per IP
- [ ] 429 returned when exceeded
- [ ] Bot traffic has stricter limits
- [ ] Tests pass

---

### Phase 4: Deployment (Week 4-5)

#### Branch: `feature/M1-deployment`

**Commits:**

1. **Vercel config**
   ```
   chore(ingestion): add Vercel deployment config
   
   - Create vercel.json
   - Configure Node runtime
   - Set environment variables
   - Add build command
   ```

2. **Environment setup**
   ```
   docs(ingestion): document required environment variables
   
   - DATABASE_URL (required)
   - IP_HASH_SECRET (required)
   - DEDUPE_ENABLED (optional)
   - Update README with setup instructions
   ```

3. **Health check**
   ```
   feat(ingestion): enhance health check endpoint
   
   - GET /health returns system status
   - Check database connectivity
   - Include version info
   - Return 503 if unhealthy
   ```

4. **Monitoring**
   ```
   feat(ingestion): add basic monitoring endpoints
   
   - GET /metrics for Prometheus
   - Include request count, error rate
   - Include dedupe metrics
   - Include rate limit stats
   ```

**PR:** "feat(ingestion): add deployment configuration"

**Acceptance:**
- [ ] Deploys to Vercel successfully
- [ ] Environment variables configured
- [ ] Health check works
- [ ] Metrics available

---

### M1 Completion Checklist

- [ ] POST /ingest endpoint live and tested
- [ ] Database schema deployed to Neon
- [ ] All indexes created
- [ ] Geo extraction working
- [ ] IP hashing implemented
- [ ] Bot detection tagging traffic
- [ ] Deduplication preventing duplicates
- [ ] Rate limiting protecting service
- [ ] Deployed to production
- [ ] Monitoring in place
- [ ] Documentation complete
- [ ] All tests passing (80%+ coverage)

**Merge to master:** Create release `v0.1.0 - Ingestion MVP`

---

## M2: SDK Package

**Status:** Not Started
**Duration:** 2-3 weeks
**Target:** Published npm package

### Branch Structure

```
develop
├── feature/M2-package-setup
├── feature/M2-visitor-session-ids
├── feature/M2-analytics-component
├── feature/M2-track-function
├── feature/M2-privacy-controls
└── feature/M2-publish
```

### Phase 1: Package Foundation (Week 1)

#### Branch: `feature/M2-package-setup`

**Commits:**

1. **Package scaffold**
   ```
   feat(sdk): initialize SDK package structure
   
   - Create packages/sdk/src directory
   - Add package.json with @remcostoeten/analytics name
   - Configure TypeScript for library build
   - Add build script with tsup
   ```

2. **Entry point**
   ```
   feat(sdk): create main entry point with exports
   
   - Create src/index.ts
   - Export Analytics component
   - Export track function
   - Export type definitions
   ```

3. **Build config**
   ```
   chore(sdk): configure build for ESM and CJS
   
   - Add tsup.config.ts
   - Build both ESM and CJS formats
   - Generate type declarations
   - Minify for production
   ```

**PR:** "feat(sdk): set up SDK package structure"

---

#### Branch: `feature/M2-visitor-session-ids`

**Commits:**

1. **Visitor ID logic**
   ```
   feat(sdk): implement visitor ID generation
   
   - Create visitor-id.ts module
   - Generate UUID v4
   - Store in localStorage 'remco_analytics_visitor_id'
   - Handle storage blocked scenario
   
   Implements: docs/08-visitor-session-ids.md
   ```

2. **Session ID logic**
   ```
   feat(sdk): implement session ID generation
   
   - Create session-id.ts module
   - Generate UUID v4
   - Store in sessionStorage 'remco_analytics_session_id'
   - Implement 30-minute timeout
   ```

3. **Utility functions**
   ```
   feat(sdk): add ID reset and retrieval functions
   
   - Export getVisitorId()
   - Export getSessionId()
   - Export resetVisitorId()
   - Export resetSessionId()
   ```

4. **Tests**
   ```
   test(sdk): add visitor and session ID tests
   
   - Test UUID generation
   - Test localStorage persistence
   - Test sessionStorage isolation
   - Test timeout logic
   - Test storage blocked fallback
   - Mock localStorage/sessionStorage
   ```

**PR:** "feat(sdk): implement visitor and session ID generation"

---

#### Branch: `feature/M2-analytics-component`

**Commits:**

1. **React component**
   ```
   feat(sdk): create Analytics React component
   
   - Create analytics.tsx
   - Accept projectId and ingestUrl props
   - Auto-track pageview on mount
   - Use useEffect for client-side only
   ```

2. **Configuration**
   ```
   feat(sdk): add component configuration options
   
   - Add disabled prop
   - Add debug prop for logging
   - Read from environment variables
   - Apply prop override priority
   ```

3. **Tests**
   ```
   test(sdk): add Analytics component tests
   
   - Test renders without errors
   - Test pageview tracked on mount
   - Test disabled prop prevents tracking
   - Test debug mode logs events
   - Use React Testing Library
   ```

**PR:** "feat(sdk): create Analytics component"

---

#### Branch: `feature/M2-track-function`

**Commits:**

1. **Core track function**
   ```
   feat(sdk): implement track function
   
   - Create track.ts module
   - Accept eventType, meta, options
   - Get visitor and session IDs
   - Build event payload
   ```

2. **Network request**
   ```
   feat(sdk): use sendBeacon with fetch fallback
   
   - Use navigator.sendBeacon if available
   - Fallback to fetch with keepalive
   - Send to configured ingest URL
   - Fail silently on network errors
   ```

3. **Helper functions**
   ```
   feat(sdk): add trackPageView helper
   
   - Create trackPageView() function
   - Extract path, referrer, origin
   - Include user agent and language
   - Call track() with pageview type
   ```

4. **Client-side dedupe**
   ```
   feat(sdk): prevent rapid duplicate tracking
   
   - Keep Set of recent events
   - Block duplicates within 5 seconds
   - Clear after timeout
   ```

5. **Tests**
   ```
   test(sdk): add track function tests
   
   - Test event payload structure
   - Test sendBeacon called
   - Test fetch fallback
   - Test client dedupe works
   - Mock network requests
   ```

**PR:** "feat(sdk): implement track function"

---

### Phase 2: Privacy & Polish (Week 2)

#### Branch: `feature/M2-privacy-controls`

**Commits:**

1. **Opt-out mechanism**
   ```
   feat(sdk): implement user opt-out
   
   - Create opt-out.ts module
   - Add optOut() function
   - Add optIn() function
   - Add isOptedOut() check
   - Store in localStorage
   ```

2. **DNT support**
   ```
   feat(sdk): respect Do Not Track header
   
   - Check navigator.doNotTrack
   - Check window.doNotTrack
   - Skip tracking if DNT enabled
   - Document in SDK usage
   ```

3. **Integration**
   ```
   feat(sdk): integrate privacy checks in track
   
   - Check opt-out before tracking
   - Check DNT before tracking
   - Return early if tracking disabled
   - Log when tracking skipped (debug mode)
   ```

4. **Tests**
   ```
   test(sdk): add privacy control tests
   
   - Test opt-out prevents tracking
   - Test opt-in resumes tracking
   - Test DNT respected
   - Test opt-out persists
   ```

**PR:** "feat(sdk): add privacy controls"

---

### Phase 3: Publishing (Week 2-3)

#### Branch: `feature/M2-publish`

**Commits:**

1. **Package metadata**
   ```
   chore(sdk): prepare package for publishing
   
   - Update package.json with description, keywords
   - Add repository, homepage, bugs URLs
   - Set license to MIT
   - Add author information
   ```

2. **README**
   ```
   docs(sdk): create comprehensive README
   
   - Installation instructions
   - Quick start examples
   - API reference
   - TypeScript usage
   - Link to full docs
   ```

3. **Version and publish**
   ```
   chore(sdk): publish v0.1.0 to npm
   
   - Set version to 0.1.0
   - Build package
   - Publish to npm as @remcostoeten/analytics
   - Tag git commit
   ```

**PR:** "chore(sdk): publish package to npm"

---

### M2 Completion Checklist

- [ ] Package structure complete
- [ ] Visitor/session IDs working
- [ ] Analytics component functional
- [ ] Track function implemented
- [ ] Privacy controls working
- [ ] Published to npm
- [ ] Documentation complete
- [ ] All tests passing (85%+ coverage)
- [ ] TypeScript types exported
- [ ] Bundle size < 5KB gzipped

**Merge to master:** Create release `v0.2.0 - SDK Package`

---

## M3: Dashboard

**Status:** Not Started
**Duration:** 3-4 weeks
**Target:** Functional analytics dashboard

### Branch Structure

```
develop
├── feature/M3-dashboard-setup
├── feature/M3-database-queries
├── feature/M3-overview-page
├── feature/M3-timeseries-chart
├── feature/M3-tables
├── feature/M3-filters
└── feature/M3-deployment
```

### Phase 1: Foundation (Week 1)

#### Branch: `feature/M3-dashboard-setup`

**Commits:**

1. **Next.js app**
   ```
   feat(dashboard): initialize Next.js app router
   
   - Create apps/dashboard
   - Add Next.js 14 with App Router
   - Configure TypeScript
   - Add Tailwind CSS
   ```

2. **Database integration**
   ```
   feat(dashboard): integrate database package
   
   - Add @remcostoeten/db dependency
   - Import schema and types
   - Configure connection for server components
   ```

3. **Layout**
   ```
   feat(dashboard): create app layout and navigation
   
   - Add root layout with dark theme
   - Create navigation component
   - Add project selector placeholder
   - Configure fonts and globals
   ```

**PR:** "feat(dashboard): initialize dashboard application"

---

#### Branch: `feature/M3-database-queries`

**Commits:**

1. **Query utilities**
   ```
   feat(dashboard): create database query utilities
   
   - Create src/queries directory
   - Add date range helpers
   - Add filter builders
   - Add error handling
   ```

2. **Core metrics**
   ```
   feat(dashboard): implement core metric queries
   
   - Add getPageviews(projectId, dateRange)
   - Add getUniqueVisitors(projectId, dateRange)
   - Add getSessionCount(projectId, dateRange)
   - Optimize with indexes
   
   Implements: docs/05-data-and-dashboard.md
   ```

3. **Timeseries query**
   ```
   feat(dashboard): add timeseries data query
   
   - Group events by day/hour
   - Count pageviews per period
   - Support date range filtering
   - Return sorted array
   ```

4. **Top pages query**
   ```
   feat(dashboard): add top pages query
   
   - Group by path
   - Count pageviews per path
   - Sort by count descending
   - Limit to top 10
   ```

5. **Referrer query**
   ```
   feat(dashboard): add top referrers query
   
   - Group by referrer
   - Count visits per referrer
   - Filter out nulls (direct traffic)
   - Sort by count descending
   ```

6. **Geo query**
   ```
   feat(dashboard): add geographic distribution query
   
   - Group by country, region, city
   - Count visitors per location
   - Return hierarchical data
   ```

7. **Tests**
   ```
   test(dashboard): add query tests with fixtures
   
   - Seed test database
   - Test each query returns correct data
   - Test date filtering works
   - Test project isolation
   ```

**PR:** "feat(dashboard): implement analytics queries"

---

### Phase 2: UI Components (Week 2)

#### Branch: `feature/M3-overview-page`

**Commits:**

1. **Metric cards**
   ```
   feat(dashboard): create metric card components
   
   - Create MetricCard component
   - Display value and label
   - Show percentage change
   - Add loading state
   ```

2. **Overview page**
   ```
   feat(dashboard): create overview dashboard page
   
   - Create app/page.tsx
   - Fetch metric data server-side
   - Display pageviews, visitors, sessions
   - Add period selector (24h, 7d, 30d)
   ```

3. **Project filter**
   ```
   feat(dashboard): add project selector
   
   - Query distinct project IDs
   - Create dropdown component
   - Update URL on selection
   - Filter all queries by selected project
   ```

**PR:** "feat(dashboard): create overview dashboard page"

---

#### Branch: `feature/M3-timeseries-chart`

**Commits:**

1. **Chart library**
   ```
   feat(dashboard): add Recharts for visualization
   
   - Install recharts
   - Create TimeseriesChart component
   - Configure responsive container
   - Style for dark theme
   ```

2. **Chart integration**
   ```
   feat(dashboard): display pageviews timeseries
   
   - Fetch timeseries data
   - Pass to TimeseriesChart
   - Show tooltip on hover
   - Support daily/hourly granularity
   ```

**PR:** "feat(dashboard): add timeseries visualization"

---

#### Branch: `feature/M3-tables`

**Commits:**

1. **Table component**
   ```
   feat(dashboard): create reusable table component
   
   - Create Table component
   - Support sorting
   - Support pagination
   - Style for dark theme
   ```

2. **Top pages table**
   ```
   feat(dashboard): add top pages table
   
   - Fetch top pages data
   - Display path and pageview count
   - Add link to filter by page
   ```

3. **Referrers table**
   ```
   feat(dashboard): add referrers table
   
   - Fetch top referrers
   - Display referrer URL and count
   - Mark direct traffic
   - Add external link icon
   ```

4. **Geo table**
   ```
   feat(dashboard): add geographic distribution table
   
   - Fetch geo data
   - Display country flag icons
   - Show country, region, city hierarchy
   - Sort by visitor count
   ```

**PR:** "feat(dashboard): add data tables"

---

### Phase 3: Filters & Polish (Week 3)

#### Branch: `feature/M3-filters`

**Commits:**

1. **Date range filter**
   ```
   feat(dashboard): add date range picker
   
   - Create DateRangePicker component
   - Support presets (24h, 7d, 30d, custom)
   - Update URL params
   - Refetch data on change
   ```

2. **Bot filter**
   ```
   feat(dashboard): add bot traffic toggle
   
   - Create toggle component
   - Default to exclude bots
   - Add to query filters
   - Show bot percentage when included
   ```

3. **Environment filter**
   ```
   feat(dashboard): add localhost filter toggle
   
   - Toggle to exclude localhost traffic
   - Default to exclude
   - Add to query filters
   ```

**PR:** "feat(dashboard): add filtering options"

---

### Phase 4: Deployment (Week 3-4)

#### Branch: `feature/M3-deployment`

**Commits:**

1. **Authentication**
   ```
   feat(dashboard): add basic authentication
   
   - Use Vercel password protection (MVP)
   - Or add simple auth with env vars
   - Document setup process
   ```

2. **Deployment config**
   ```
   chore(dashboard): configure Vercel deployment
   
   - Create vercel.json
   - Set environment variables
   - Configure build command
   - Add custom domain
   ```

3. **Performance optimization**
   ```
   perf(dashboard): optimize query performance
   
   - Add React Suspense boundaries
   - Implement streaming SSR
   - Cache query results
   - Add loading states
   ```

**PR:** "feat(dashboard): deploy to production"

---

### M3 Completion Checklist

- [ ] Dashboard deployed and accessible
- [ ] All queries implemented and optimized
- [ ] Overview page shows key metrics
- [ ] Timeseries chart displays trends
- [ ] Tables show top pages, referrers, geo
- [ ] Filters work (date, project, bots)
- [ ] Authentication in place
- [ ] Performance < 500ms p95
- [ ] Mobile responsive
- [ ] Documentation complete

**Merge to master:** Create release `v0.3.0 - Dashboard MVP`

---

## M4: Quality & Polish

**Status:** Not Started
**Duration:** 2-3 weeks
**Target:** Production-grade platform

### Branch Structure

```
develop
├── feature/M4-monitoring
├── feature/M4-performance
├── feature/M4-error-handling
├── feature/M4-documentation
└── feature/M4-testing
```

### Phase 1: Monitoring (Week 1)

#### Branch: `feature/M4-monitoring`

**Commits:**

1. **Metrics dashboard**
   ```
   feat(dashboard): add system metrics page
   
   - Show ingestion throughput
   - Show dedupe hit rate
   - Show bot detection rate
   - Show error rate
   ```

2. **Alerting**
   ```
   feat(ingestion): add basic alerting
   
   - Alert on high error rate
   - Alert on bot spike
   - Alert on database connection loss
   - Send to configured webhook
   ```

**PR:** "feat: add monitoring and alerting"

---

### Phase 2: Performance (Week 1-2)

#### Branch: `feature/M4-performance`

**Commits:**

1. **Query optimization**
   ```
   perf(dashboard): optimize slow queries
   
   - Add query result caching
   - Use materialized views if needed
   - Reduce N+1 query problems
   - Benchmark and profile
   ```

2. **Load testing**
   ```
   test: add load tests for ingestion
   
   - Create k6 load test scripts
   - Test sustained load
   - Verify latency targets
   - Document capacity limits
   ```

**PR:** "perf: optimize platform performance"

---

### M4 Completion Checklist

- [ ] Monitoring dashboard live
- [ ] Alerting configured
- [ ] Performance optimized
- [ ] Load tests passing
- [ ] Error handling improved
- [ ] Documentation complete
- [ ] E2E tests comprehensive
- [ ] Ready for production scale

**Merge to master:** Create release `v1.0.0 - Production Release`

---

## Summary Timeline

| Milestone | Duration | Cumulative | Status |
|-----------|----------|------------|--------|
| M0: Bootstrap | 1 week | 1 week | ✅ Complete |
| M1: Ingestion | 4-6 weeks | 5-7 weeks | 🚧 In Progress |
| M2: SDK | 2-3 weeks | 7-10 weeks | 📋 Planned |
| M3: Dashboard | 3-4 weeks | 10-14 weeks | 📋 Planned |
| M4: Quality | 2-3 weeks | 12-17 weeks | 📋 Planned |

**Total: 12-17 weeks (3-4 months)**

---

## Git Workflow Summary

### Branch Creation
```bash
git checkout develop
git pull origin develop
git checkout -b feature/M1-component-name
```

### Daily Work
```bash
git add .
git commit -m "type(scope): description"
git push origin feature/M1-component-name
```

### Pull Request
```bash
# Create PR on GitHub
# Title: type(scope): description
# Get review and approval
# Squash and merge to develop
```

### Release
```bash
git checkout master
git merge develop
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin master --tags
```

---

## Quick Start for Contributors

1. **Read documentation**: Start with docs/00-spec.md
2. **Pick a task**: Choose from roadmap above
3. **Create branch**: Follow naming convention
4. **Implement**: Follow AGENTS.md conventions
5. **Test**: Ensure tests pass
6. **Commit**: Use conventional commits
7. **PR**: Submit for review
8. **Merge**: Squash and merge after approval

---

**Last Updated:** 2024
**Owner:** Remco
**Status:** Ready for Implementation
