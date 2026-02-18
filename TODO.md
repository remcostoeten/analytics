# 📋 TODO - Planned Features

**Project:** Remco Analytics  
**Last Updated:** February 12, 2024  
**Current Version:** v0.1.0  

---

## Overview

This document tracks all planned features and upcoming work. For completed features, see `DONE.md`. For implementation status, see `IMPLEMENTATION-STATUS.md`.

---

## M2: SDK Package ⏳ NOT STARTED

**Estimated Duration:** 2-3 weeks  
**Priority:** High  
**Target:** `@remcostoeten/analytics` npm package  

### Phase 1: Package Setup (Week 1)

#### Package Structure
- [ ] Initialize packages/sdk/ directory
- [ ] Configure package.json metadata
  - [ ] Set name: @remcostoeten/analytics
  - [ ] Set version: 0.1.0
  - [ ] Add description and keywords
  - [ ] Configure repository URL
  - [ ] Set license to MIT
- [ ] Set up TypeScript configuration
  - [ ] Configure tsconfig.json for library
  - [ ] Enable strict mode
  - [ ] Configure paths and aliases
- [ ] Configure build system (tsup)
  - [ ] ESM output format
  - [ ] CJS output format
  - [ ] Generate .d.ts type declarations
  - [ ] Minification for production
  - [ ] Source maps generation
- [ ] Create src/ directory structure
- [ ] Create __tests__/ directory
- [ ] Add .npmignore file
- [ ] Write package README.md

### Phase 2: Identity Generation (Week 1)

#### Visitor ID
- [ ] Implement getVisitorId() function
  - [ ] Generate UUID v4
  - [ ] Store in localStorage
  - [ ] Key: 'remco_analytics_visitor_id'
  - [ ] Handle storage blocked scenario
  - [ ] Return ephemeral ID as fallback
- [ ] Implement resetVisitorId() function
- [ ] Add SSR compatibility checks
- [ ] Handle browser environments (window undefined)
- [ ] Write visitor ID tests (10 tests)
  - [ ] Test UUID generation
  - [ ] Test localStorage persistence
  - [ ] Test storage blocked fallback
  - [ ] Test SSR compatibility
  - [ ] Test reset functionality

#### Session ID
- [ ] Implement getSessionId() function
  - [ ] Generate UUID v4
  - [ ] Store in sessionStorage
  - [ ] Key: 'remco_analytics_session_id'
  - [ ] Implement 30-minute timeout
  - [ ] Activity timestamp tracking
  - [ ] Timeout key: 'remco_analytics_session_timeout'
- [ ] Implement resetSessionId() function
- [ ] Add session extension on activity
- [ ] Handle storage blocked scenario
- [ ] Write session ID tests (10 tests)
  - [ ] Test UUID generation
  - [ ] Test sessionStorage persistence
  - [ ] Test 30-minute timeout
  - [ ] Test activity extension
  - [ ] Test reset functionality

### Phase 3: Tracking Core (Week 2)

#### Analytics Component
- [ ] Create Analytics.tsx React component
  - [ ] Accept projectId prop (optional)
  - [ ] Accept ingestUrl prop (optional)
  - [ ] Accept disabled prop (optional)
  - [ ] Accept debug prop (optional)
- [ ] Implement auto page view tracking
  - [ ] Use useEffect for client-side only
  - [ ] Get visitor and session IDs
  - [ ] Call trackPageView on mount
  - [ ] Handle SSR (skip on server)
- [ ] Add configuration priority
  - [ ] Props override env vars
  - [ ] Env vars override defaults
  - [ ] Default ingest URL fallback
- [ ] Write Analytics component tests (8 tests)
  - [ ] Test renders without errors
  - [ ] Test pageview tracked on mount
  - [ ] Test disabled prop prevents tracking
  - [ ] Test debug mode logging
  - [ ] Test SSR compatibility

#### Track Function
- [ ] Implement track() function
  - [ ] Accept eventType parameter (required)
  - [ ] Accept meta parameter (optional)
  - [ ] Accept options parameter (optional)
- [ ] Get visitor and session IDs automatically
- [ ] Build event payload
  - [ ] type, projectId, path, referrer
  - [ ] origin, host, ua, lang
  - [ ] visitorId, sessionId, meta
- [ ] Implement sendBeacon (primary)
  - [ ] Check navigator.sendBeacon availability
  - [ ] Create Blob with JSON payload
  - [ ] Send with sendBeacon API
- [ ] Implement fetch fallback
  - [ ] Use fetch with keepalive: true
  - [ ] POST method, JSON body
  - [ ] Fail silently on network errors
- [ ] Add client-side dedupe protection
  - [ ] Keep Set of recent events
  - [ ] Block duplicates within 5 seconds
  - [ ] Auto-clear after timeout
- [ ] Write track function tests (10 tests)
  - [ ] Test event payload structure
  - [ ] Test sendBeacon called
  - [ ] Test fetch fallback
  - [ ] Test client dedupe works
  - [ ] Test network error handling

#### Helper Functions
- [ ] Implement trackPageView() helper
  - [ ] Extract path, referrer, origin
  - [ ] Include user agent and language
  - [ ] Call track() with pageview type
- [ ] Implement trackEvent() helper
- [ ] Implement trackClick() helper
- [ ] Implement trackError() helper

### Phase 4: Privacy & Configuration (Week 2)

#### Opt-Out Mechanism
- [ ] Implement optOut() function
  - [ ] Set localStorage flag
  - [ ] Key: 'remco_analytics_opt_out'
  - [ ] Clear visitor and session IDs
- [ ] Implement optIn() function
  - [ ] Remove localStorage flag
  - [ ] Allow tracking to resume
- [ ] Implement isOptedOut() check
  - [ ] Read localStorage flag
  - [ ] Return boolean
- [ ] Integrate opt-out check in track()
  - [ ] Check before tracking
  - [ ] Return early if opted out
  - [ ] Log in debug mode
- [ ] Write opt-out tests (5 tests)
  - [ ] Test opt-out prevents tracking
  - [ ] Test opt-in resumes tracking
  - [ ] Test opt-out persists
  - [ ] Test IDs cleared on opt-out

#### DNT Support
- [ ] Check navigator.doNotTrack
- [ ] Check window.doNotTrack
- [ ] Respect DNT=1 header
- [ ] Skip tracking if DNT enabled
- [ ] Write DNT tests (3 tests)

#### Configuration
- [ ] Environment variable support
  - [ ] NEXT_PUBLIC_REMCO_ANALYTICS_URL
  - [ ] NEXT_PUBLIC_REMCO_ANALYTICS_PROJECT
- [ ] Runtime configuration API
- [ ] Configuration validation
- [ ] Default values fallback

### Phase 5: Publishing (Week 2-3)

#### Build & Bundle
- [ ] Run production build
- [ ] Verify ESM output
- [ ] Verify CJS output
- [ ] Verify type declarations
- [ ] Check bundle size (< 5KB gzipped)
- [ ] Test tree-shaking works
- [ ] Minification verification

#### npm Publishing
- [ ] Create npm account (if needed)
- [ ] Configure npm access token
- [ ] Set package as public
- [ ] Run npm publish
- [ ] Verify package on npm registry
- [ ] Test installation from npm
- [ ] Update package version

#### Documentation
- [ ] Write comprehensive README
  - [ ] Installation instructions
  - [ ] Quick start examples
  - [ ] API reference
  - [ ] TypeScript usage
  - [ ] Configuration options
- [ ] Create examples/ directory
  - [ ] Next.js App Router example
  - [ ] Next.js Pages Router example
  - [ ] React SPA example
  - [ ] Vanilla JS example
- [ ] Write CHANGELOG.md
- [ ] Add badges to README
  - [ ] npm version
  - [ ] Bundle size
  - [ ] License
  - [ ] Build status

#### Testing in Real Apps
- [ ] Test in Next.js 14 App Router
- [ ] Test in Next.js Pages Router
- [ ] Test in Create React App
- [ ] Test in Vite + React
- [ ] Test in production build
- [ ] Verify events reach ingestion
- [ ] Verify data in database

### M2 Acceptance Criteria
- [ ] Package published to npm
- [ ] Bundle size < 5KB gzipped
- [ ] 50+ tests passing
- [ ] TypeScript types working
- [ ] Works in Next.js (App + Pages)
- [ ] Works in React SPA
- [ ] Documentation complete
- [ ] Zero runtime dependencies

---

## M3: Dashboard ⏳ NOT STARTED

**Estimated Duration:** 3-4 weeks  
**Priority:** Medium  
**Target:** Next.js dashboard application  

### Phase 1: Foundation (Week 1)

#### Next.js Setup
- [ ] Initialize apps/dashboard/ with Next.js 14
- [ ] Configure App Router
- [ ] Set up TypeScript
- [ ] Install and configure Tailwind CSS
- [ ] Configure dark theme (Vercel Dark)
- [ ] Set up fonts (Geist)
- [ ] Create root layout
- [ ] Add metadata configuration

#### Database Integration
- [ ] Add @remcostoeten/db dependency
- [ ] Import schema and types
- [ ] Configure server-side connection
- [ ] Test database queries work
- [ ] Add error boundaries

#### Navigation
- [ ] Create navigation component
- [ ] Add project selector placeholder
- [ ] Add date range picker placeholder
- [ ] Create mobile menu
- [ ] Add breadcrumbs

### Phase 2: Query Layer (Week 1-2)

#### Core Metrics Queries
- [ ] Implement getPageviews(projectId, dateRange)
  - [ ] COUNT(*) WHERE type = 'pageview'
  - [ ] Filter by projectId and date range
  - [ ] Return total count
- [ ] Implement getUniqueVisitors(projectId, dateRange)
  - [ ] COUNT(DISTINCT visitor_id)
  - [ ] Filter nulls
  - [ ] Use events_visitor_idx
- [ ] Implement getSessionCount(projectId, dateRange)
  - [ ] COUNT(DISTINCT session_id)
  - [ ] Filter nulls
  - [ ] Use events_session_idx
- [ ] Implement getBounceRate(projectId, dateRange)
- [ ] Implement getAverageSessionDuration(projectId, dateRange)

#### Timeseries Query
- [ ] Implement getTimeseriesData(projectId, dateRange, granularity)
  - [ ] GROUP BY date_trunc('hour', ts) or 'day'
  - [ ] COUNT(*) per period
  - [ ] ORDER BY ts DESC
  - [ ] Support hourly and daily granularity

#### Top Pages Query
- [ ] Implement getTopPages(projectId, dateRange, limit)
  - [ ] GROUP BY path
  - [ ] COUNT(*) as views
  - [ ] ORDER BY views DESC
  - [ ] LIMIT 10 (default)
  - [ ] Use events_path_idx

#### Referrers Query
- [ ] Implement getTopReferrers(projectId, dateRange, limit)
  - [ ] GROUP BY referrer
  - [ ] COUNT(*) as visits
  - [ ] Filter out nulls
  - [ ] ORDER BY visits DESC
  - [ ] Parse domain from URL

#### Geographic Query
- [ ] Implement getGeoDistribution(projectId, dateRange)
  - [ ] GROUP BY country, region, city
  - [ ] COUNT(DISTINCT visitor_id) per location
  - [ ] ORDER BY count DESC
  - [ ] Use events_country_idx
  - [ ] Return hierarchical data

#### Device & Browser Query
- [ ] Implement getDeviceBreakdown(projectId, dateRange)
- [ ] Implement getBrowserBreakdown(projectId, dateRange)
- [ ] Implement getOSBreakdown(projectId, dateRange)

#### Query Utilities
- [ ] Create date range helpers
  - [ ] getLast24Hours()
  - [ ] getLast7Days()
  - [ ] getLast30Days()
  - [ ] getCustomRange(start, end)
- [ ] Create filter builders
- [ ] Add query caching layer
- [ ] Implement error handling
- [ ] Write query tests (15 tests)

### Phase 3: UI Components (Week 2-3)

#### Overview Page
- [ ] Create app/page.tsx
- [ ] Create MetricCard component
  - [ ] Display value and label
  - [ ] Show change percentage
  - [ ] Add loading state
  - [ ] Add error state
- [ ] Display pageviews metric card
- [ ] Display unique visitors card
- [ ] Display sessions card
- [ ] Display bounce rate card
- [ ] Display avg session duration card
- [ ] Add period comparison

#### Timeseries Chart
- [ ] Install Recharts library
- [ ] Create TimeseriesChart component
  - [ ] Line chart visualization
  - [ ] Responsive container
  - [ ] Tooltip on hover
  - [ ] Dark theme styling
- [ ] Add granularity selector (hourly/daily)
- [ ] Add chart loading state
- [ ] Add empty state

#### Data Tables
- [ ] Create reusable Table component
  - [ ] Sortable columns
  - [ ] Pagination support
  - [ ] Loading state
  - [ ] Empty state
  - [ ] Dark theme styling
- [ ] Create TopPagesTable
  - [ ] Path and pageviews columns
  - [ ] Click to filter
  - [ ] Sort by views
- [ ] Create ReferrersTable
  - [ ] Referrer URL and count
  - [ ] Mark direct traffic
  - [ ] External link icons
- [ ] Create GeoTable
  - [ ] Country flags
  - [ ] Region and city
  - [ ] Visitor count
  - [ ] Sortable

#### Filters
- [ ] Create ProjectSelector component
  - [ ] Fetch distinct project IDs
  - [ ] Dropdown with search
  - [ ] Update URL on selection
  - [ ] Persist in localStorage
- [ ] Create DateRangePicker component
  - [ ] Preset buttons (24h, 7d, 30d)
  - [ ] Custom range calendar
  - [ ] Update URL params
  - [ ] Validation
- [ ] Create FilterPanel component
  - [ ] Bot traffic toggle
  - [ ] Localhost toggle
  - [ ] Preview environment toggle
  - [ ] Device type filter
  - [ ] Country filter

### Phase 4: Polish & Deploy (Week 3-4)

#### Performance
- [ ] Add React Suspense boundaries
- [ ] Implement streaming SSR
- [ ] Add loading skeletons
- [ ] Cache query results
- [ ] Optimize database queries
- [ ] Add prefetching
- [ ] Measure and optimize TTI

#### Responsive Design
- [ ] Mobile-first approach
- [ ] Tablet layout optimization
- [ ] Desktop layout
- [ ] Chart responsiveness
- [ ] Table mobile view
- [ ] Navigation mobile menu

#### Authentication
- [ ] Choose auth method (Vercel password or custom)
- [ ] Implement authentication
- [ ] Protect dashboard routes
- [ ] Add login page
- [ ] Add logout functionality
- [ ] Session management

#### Deployment
- [ ] Create vercel.json config
- [ ] Set environment variables
- [ ] Configure build command
- [ ] Deploy to Vercel
- [ ] Test production deployment
- [ ] Add custom domain
- [ ] Configure CDN

#### Testing
- [ ] Write component tests (20+ tests)
- [ ] Write query tests
- [ ] E2E tests with Playwright
- [ ] Visual regression tests
- [ ] Accessibility tests

### M3 Acceptance Criteria
- [ ] Dashboard deployed and accessible
- [ ] Shows real data from ingestion
- [ ] All queries < 500ms p95
- [ ] Mobile responsive
- [ ] Authentication working
- [ ] Zero TypeScript errors
- [ ] 20+ tests passing

---

## M4: Quality & Polish ⏳ NOT STARTED

**Estimated Duration:** 2-3 weeks  
**Priority:** Low  
**Target:** Production-grade platform  

### Phase 1: Monitoring (Week 1)

#### System Metrics
- [ ] Create /dashboard/metrics page
- [ ] Display ingestion throughput
- [ ] Display dedupe hit rate
- [ ] Display bot detection rate
- [ ] Display error rate
- [ ] Display database metrics
- [ ] Real-time updates

#### Alerting
- [ ] Set up error tracking (Sentry?)
- [ ] Configure alert thresholds
- [ ] Alert on high error rate
- [ ] Alert on bot spike
- [ ] Alert on database issues
- [ ] Alert on API downtime
- [ ] Webhook integration
- [ ] Email notifications

#### Logging
- [ ] Structured logging setup
- [ ] Log aggregation
- [ ] Error log viewer in dashboard
- [ ] Query slow queries
- [ ] Log retention policy

### Phase 2: Performance (Week 1-2)

#### Database Optimization
- [ ] Analyze slow queries
- [ ] Add missing indexes
- [ ] Create materialized views for common queries
- [ ] Implement query result caching
- [ ] Add database connection pooling
- [ ] Configure query timeout limits
- [ ] Implement read replicas (if needed)

#### Cache Layer
- [ ] Evaluate Redis for dedupe cache
- [ ] Implement distributed cache
- [ ] Cache invalidation strategy
- [ ] Cache warming
- [ ] Cache hit rate monitoring

#### Dashboard Performance
- [ ] Implement React Query for data fetching
- [ ] Add stale-while-revalidate pattern
- [ ] Optimize chart rendering
- [ ] Implement virtual scrolling for tables
- [ ] Code splitting
- [ ] Image optimization
- [ ] Font optimization

#### SDK Performance
- [ ] Minimize bundle size
- [ ] Optimize sendBeacon usage
- [ ] Batch events (if beneficial)
- [ ] Add request queuing
- [ ] Implement retry logic

### Phase 3: Testing (Week 2)

#### E2E Testing
- [ ] Set up Playwright
- [ ] Test SDK → Ingestion → Dashboard flow
- [ ] Test page view tracking
- [ ] Test custom event tracking
- [ ] Test dashboard data display
- [ ] Test filtering and date ranges
- [ ] Test authentication flow
- [ ] CI integration for E2E tests

#### Load Testing
- [ ] Set up k6 load testing
- [ ] Create load test scenarios
- [ ] Test ingestion under load (10k req/s)
- [ ] Test dashboard under load
- [ ] Test database under load
- [ ] Identify bottlenecks
- [ ] Document capacity limits

#### Security Testing
- [ ] SQL injection testing
- [ ] XSS vulnerability testing
- [ ] CSRF protection verification
- [ ] Rate limiting verification
- [ ] Environment variable security audit
- [ ] Dependency vulnerability scan
- [ ] Penetration testing

### Phase 4: Documentation (Week 2-3)

#### API Documentation
- [ ] Generate OpenAPI/Swagger spec
- [ ] Document all endpoints
- [ ] Add request/response examples
- [ ] Document error codes
- [ ] Create Postman collection
- [ ] Interactive API explorer

#### Architecture Documentation
- [ ] System architecture diagram
- [ ] Database schema diagram
- [ ] Data flow diagrams
- [ ] Component architecture
- [ ] Deployment architecture
- [ ] Infrastructure diagram

#### User Guides
- [ ] Getting started guide
- [ ] SDK integration guide
- [ ] Dashboard user guide
- [ ] Configuration guide
- [ ] Troubleshooting guide
- [ ] FAQ document
- [ ] Video tutorials

#### Developer Guides
- [ ] Contributing guide
- [ ] Development setup
- [ ] Testing guide
- [ ] Deployment guide
- [ ] Debugging guide
- [ ] Performance tuning guide

### Phase 5: Developer Experience (Week 3)

#### CLI Tool
- [ ] Enhance existing CLI
- [ ] Add project management commands
- [ ] Add data export commands
- [ ] Add migration helpers
- [ ] Add debugging tools
- [ ] Add performance profiling

#### Debug Mode
- [ ] Enhanced debug logging
- [ ] Debug dashboard view
- [ ] Event inspection tools
- [ ] Query performance viewer
- [ ] Network request viewer

#### Developer Dashboard
- [ ] Create /dashboard/dev route
- [ ] Show recent events
- [ ] Test event sender
- [ ] Query builder
- [ ] Database explorer

### M4 Acceptance Criteria
- [ ] 90%+ test coverage
- [ ] All performance targets met
- [ ] Zero critical security issues
- [ ] Complete documentation
- [ ] Monitoring and alerting live
- [ ] Load tests passing (10k+ req/s)
- [ ] Developer tools complete

---

## Future Enhancements (Post M4)

### Advanced Analytics
- [ ] Funnel analysis
- [ ] Cohort analysis
- [ ] Retention analysis
- [ ] Path analysis (user flows)
- [ ] A/B testing support
- [ ] Goal tracking
- [ ] Custom dimensions
- [ ] Event segmentation

### Additional Features
- [ ] Email reports
- [ ] Slack integration
- [ ] API webhooks
- [ ] Data export (CSV, JSON)
- [ ] Data import tools
- [ ] Custom dashboards
- [ ] Embedded analytics (iframe)
- [ ] Public sharing links

### Integrations
- [ ] Vercel integration
- [ ] GitHub integration
- [ ] Slack bot
- [ ] Discord bot
- [ ] Zapier integration
- [ ] Segment integration

### Scalability
- [ ] Multi-region deployment
- [ ] Database sharding
- [ ] Event streaming (Kafka)
- [ ] Real-time analytics
- [ ] BigQuery integration
- [ ] Data warehouse export

### Compliance
- [ ] GDPR data deletion tools
- [ ] CCPA compliance
- [ ] Cookie consent integration
- [ ] Privacy policy generator
- [ ] Data retention automation
- [ ] Audit logs

---

## Technical Debt & Improvements

### Known Limitations
- [ ] Dedupe cache is in-memory (single instance only)
  - Consider Redis for distributed cache
- [ ] No database partitioning
  - Add when > 10M events
- [ ] No materialized views
  - Add when dashboard queries slow
- [ ] No rate limiting middleware
  - Add if abuse occurs

### Code Quality
- [ ] Increase test coverage to 95%+
- [ ] Add more integration tests
- [ ] Add E2E test suite
- [ ] Add performance benchmarks
- [ ] Add load test suite
- [ ] Improve error messages
- [ ] Add more TypeScript strict checks

### Infrastructure
- [ ] Add monitoring (Datadog/New Relic)
- [ ] Add error tracking (Sentry)
- [ ] Add uptime monitoring
- [ ] Add status page
- [ ] Add backup automation
- [ ] Add disaster recovery plan

---

## Priority Matrix

### High Priority (Do Next)
1. M2: SDK Package (weeks 1-3)
2. M3: Dashboard Foundation (week 4-5)
3. M3: Dashboard Queries (week 5-6)

### Medium Priority (Do After)
4. M3: Dashboard UI (week 7-8)
5. M3: Dashboard Polish (week 9)
6. M4: Monitoring (week 10)

### Low Priority (Do Later)
7. M4: Performance Optimization (week 11)
8. M4: Testing Suite (week 12)
9. M4: Documentation (week 13)
10. Future Enhancements (TBD)

---

## Dependencies & Blockers

### No Current Blockers
M1 is complete, ready to proceed with M2.

### External Dependencies
- [ ] npm account for publishing SDK
- [ ] Neon database credentials (already have)
- [ ] Vercel account for deployment (already have)
- [ ] Domain name for dashboard (optional)

---

## Questions & Decisions Needed

### SDK Package
- [ ] Decide on package scope: @remcostoeten or @remco-analytics?
- [ ] Decide on browser support (ES2015+? ES2020+?)
- [ ] Decide on React version support (16.8+? 18+?)

### Dashboard
- [ ] Choose authentication method (Vercel password? NextAuth? Custom?)
- [ ] Choose chart library (Recharts? Victory? Chart.js?)
- [ ] Decide on database connection pooling strategy

### General
- [ ] Decide on monitoring service (self-hosted? SaaS?)
- [ ] Decide on error tracking service
- [ ] Decide on data retention policy

---

## Success Criteria

### M2 Success
- Package published and installable
- Works in major frameworks
- Bundle size under target
- Documentation complete

### M3 Success
- Dashboard shows real data
- All queries performant
- Mobile responsive
- Production deployed

### M4 Success
- 90%+ test coverage
- All performance targets met
- Complete documentation
- Zero critical issues

### Overall Success
- Platform is production-ready
- Used in at least one real project
- Handles 1M+ events/month
- User satisfaction high

---

**Last Updated:** February 12, 2024  
**Next Review:** Start of M2  
**Maintained By:** Remco Stoeten  
**Repository:** https://github.com/remcostoeten/analytics