# Testing Strategy

Owner: Remco
Status: Draft

## Overview

Comprehensive testing strategy covering unit tests, integration tests, E2E tests, and performance testing for the analytics platform.

## Philosophy

- Test critical paths, not every line
- Favor integration tests over unit tests
- Keep tests simple and maintainable
- Fast feedback loops
- No flaky tests

## Testing Pyramid

```
         ┌─────────────┐
         │  E2E Tests  │  10%
         │   (Slow)    │
       ┌─────────────────┐
       │ Integration Tests│  30%
       │    (Medium)      │
     ┌─────────────────────┐
     │    Unit Tests       │  60%
     │     (Fast)          │
     └─────────────────────┘
```

## Test Stack

- **Test Runner:** Bun test (native, fast)
- **Assertions:** Bun's built-in expect
- **Mocking:** Bun's mock system
- **E2E:** Playwright (browser automation)
- **DB Testing:** In-memory SQLite for speed
- **Load Testing:** k6 or wrk

## Unit Tests

### Scope

Test pure functions and isolated logic:
- Fingerprint generation
- Bot detection patterns
- Visitor/session ID generation
- Device classification
- Geo data extraction
- IP hashing

### Location

```
packages/db/src/__tests__/
apps/ingestion/src/__tests__/
packages/sdk/src/__tests__/
```

### Examples

#### Bot Detection Tests

```typescript
// apps/ingestion/src/__tests__/bot-detection.test.ts
import { describe, test, expect } from 'bun:test'
import { isBotUserAgent, detectBot } from '../bot-detection'

describe('isBotUserAgent', () => {
  test('detects googlebot', () => {
    const ua = 'Mozilla/5.0 (compatible; Googlebot/2.1)'
    expect(isBotUserAgent(ua)).toBe(true)
  })
  
  test('detects headless chrome', () => {
    const ua = 'HeadlessChrome/91.0.4472.124'
    expect(isBotUserAgent(ua)).toBe(true)
  })
  
  test('detects curl', () => {
    const ua = 'curl/7.64.1'
    expect(isBotUserAgent(ua)).toBe(true)
  })
  
  test('allows real browsers', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    expect(isBotUserAgent(ua)).toBe(false)
  })
  
  test('handles null user agent', () => {
    expect(isBotUserAgent(null)).toBe(false)
  })
})

describe('detectBot', () => {
  test('detects via vercel header', () => {
    const headers = new Headers({ 'x-vercel-bot': '1' })
    const req = new Request('http://localhost', { headers })
    
    const result = detectBot(req)
    
    expect(result.isBot).toBe(true)
    expect(result.reason).toBe('vercel-bot-header')
    expect(result.confidence).toBe('high')
  })
})
```

#### Deduplication Tests

```typescript
// apps/ingestion/src/__tests__/dedupe.test.ts
import { describe, test, expect, beforeEach } from 'bun:test'
import { generateFingerprint, DedupeCache } from '../dedupe'

describe('generateFingerprint', () => {
  test('generates consistent fingerprint', () => {
    const event = {
      projectId: 'example.com',
      visitorId: 'visitor-123',
      sessionId: 'session-456',
      type: 'pageview',
      path: '/home',
      timestamp: 1000000000000,
    }
    
    const fp1 = generateFingerprint(event)
    const fp2 = generateFingerprint(event)
    
    expect(fp1).toBe(fp2)
    expect(fp1).toMatch(/^[a-f0-9]{64}$/)
  })
  
  test('different paths generate different fingerprints', () => {
    const event1 = {
      projectId: 'example.com',
      visitorId: 'visitor-123',
      sessionId: 'session-456',
      type: 'pageview',
      path: '/home',
      timestamp: 1000000000000,
    }
    
    const event2 = { ...event1, path: '/about' }
    
    expect(generateFingerprint(event1)).not.toBe(generateFingerprint(event2))
  })
  
  test('rounds timestamps to prevent minor variations', () => {
    const event1 = {
      projectId: 'example.com',
      visitorId: 'visitor-123',
      sessionId: 'session-456',
      type: 'pageview',
      path: '/home',
      timestamp: 1000000000000,
    }
    
    const event2 = { ...event1, timestamp: 1000000005000 }
    
    expect(generateFingerprint(event1)).toBe(generateFingerprint(event2))
  })
})

describe('DedupeCache', () => {
  let cache: DedupeCache
  
  beforeEach(() => {
    cache = new DedupeCache(1000)
  })
  
  test('detects duplicates within TTL', () => {
    const fingerprint = 'test-fp'
    
    expect(cache.isDuplicate(fingerprint)).toBe(false)
    cache.add(fingerprint)
    expect(cache.isDuplicate(fingerprint)).toBe(true)
  })
  
  test('expires entries after TTL', async () => {
    const fingerprint = 'test-fp'
    
    cache.add(fingerprint)
    await Bun.sleep(1100)
    
    expect(cache.isDuplicate(fingerprint)).toBe(false)
  })
  
  test('enforces max size', () => {
    const smallCache = new DedupeCache(60000, 100)
    
    for (let i = 0; i < 150; i++) {
      smallCache.add(`fp-${i}`)
    }
    
    expect(smallCache.size()).toBeLessThan(150)
  })
})
```

#### Visitor ID Tests

```typescript
// packages/sdk/src/__tests__/visitor-id.test.ts
import { describe, test, expect, beforeEach } from 'bun:test'
import { getVisitorId, resetVisitorId } from '../visitor-id'

describe('getVisitorId', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  
  test('generates new UUID on first call', () => {
    const id = getVisitorId()
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
  })
  
  test('returns same ID on subsequent calls', () => {
    const id1 = getVisitorId()
    const id2 = getVisitorId()
    expect(id1).toBe(id2)
  })
  
  test('persists across page reloads', () => {
    const id1 = getVisitorId()
    
    // Simulate reload
    const stored = localStorage.getItem('remco_analytics_visitor_id')
    expect(stored).toBe(id1)
    
    const id2 = getVisitorId()
    expect(id2).toBe(id1)
  })
  
  test('resets when requested', () => {
    const id1 = getVisitorId()
    resetVisitorId()
    const id2 = getVisitorId()
    expect(id1).not.toBe(id2)
  })
})
```

#### Geo Extraction Tests

```typescript
// apps/ingestion/src/__tests__/geo.test.ts
import { describe, test, expect } from 'bun:test'
import { extractGeoFromRequest } from '../geo'

describe('extractGeoFromRequest', () => {
  test('extracts from Vercel headers', () => {
    const headers = new Headers({
      'x-vercel-ip-country': 'US',
      'x-vercel-ip-country-region': 'CA',
      'x-vercel-ip-city': 'San Francisco',
    })
    const req = new Request('http://localhost', { headers })
    
    const geo = extractGeoFromRequest(req)
    
    expect(geo.country).toBe('US')
    expect(geo.region).toBe('CA')
    expect(geo.city).toBe('San Francisco')
  })
  
  test('falls back to Cloudflare headers', () => {
    const headers = new Headers({
      'cf-ipcountry': 'BR',
    })
    const req = new Request('http://localhost', { headers })
    
    const geo = extractGeoFromRequest(req)
    
    expect(geo.country).toBe('BR')
    expect(geo.region).toBeNull()
    expect(geo.city).toBeNull()
  })
  
  test('returns nulls when no geo data', () => {
    const req = new Request('http://localhost')
    
    const geo = extractGeoFromRequest(req)
    
    expect(geo.country).toBeNull()
    expect(geo.region).toBeNull()
    expect(geo.city).toBeNull()
  })
})
```

### Running Unit Tests

```bash
# All unit tests
bun test

# Specific package
bun test --cwd packages/sdk

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

## Integration Tests

### Scope

Test component interactions:
- Ingestion endpoint → database
- SDK → ingestion endpoint
- Dashboard queries → database
- Complete event flow

### Location

```
apps/ingestion/tests/integration/
packages/db/tests/integration/
apps/dashboard/tests/integration/
```

### Database Setup

Use in-memory SQLite for fast tests:

```typescript
// tests/setup.ts
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

export function setupTestDb() {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite)
  
  // Run migrations
  migrate(db, { migrationsFolder: './migrations' })
  
  return { db, cleanup: () => sqlite.close() }
}
```

### Examples

#### Ingestion Integration Tests

```typescript
// apps/ingestion/tests/integration/ingest.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { setupTestDb } from '../setup'
import { app } from '../../src/app'

describe('POST /ingest', () => {
  let db: any
  let cleanup: () => void
  
  beforeEach(() => {
    const setup = setupTestDb()
    db = setup.db
    cleanup = setup.cleanup
  })
  
  afterEach(() => {
    cleanup()
  })
  
  test('accepts valid pageview event', async () => {
    const event = {
      projectId: 'example.com',
      type: 'pageview',
      path: '/home',
      visitorId: 'visitor-123',
      sessionId: 'session-456',
      ua: 'Mozilla/5.0',
      lang: 'en-US',
    }
    
    const response = await app.request('/ingest', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-vercel-ip-country': 'US',
      },
      body: JSON.stringify(event),
    })
    
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.ok).toBe(true)
    
    // Verify in database
    const events = await db.select().from(events)
    expect(events).toHaveLength(1)
    expect(events[0].projectId).toBe('example.com')
    expect(events[0].country).toBe('US')
  })
  
  test('blocks duplicate events', async () => {
    const event = {
      projectId: 'example.com',
      type: 'pageview',
      path: '/home',
      visitorId: 'visitor-123',
      sessionId: 'session-456',
    }
    
    // First request
    const response1 = await app.request('/ingest', {
      method: 'POST',
      body: JSON.stringify(event),
    })
    expect(response1.status).toBe(200)
    
    // Duplicate request
    const response2 = await app.request('/ingest', {
      method: 'POST',
      body: JSON.stringify(event),
    })
    expect(response2.status).toBe(200)
    
    const data = await response2.json()
    expect(data.deduped).toBe(true)
    
    // Only one in database
    const events = await db.select().from(events)
    expect(events).toHaveLength(1)
  })
  
  test('tags bot traffic', async () => {
    const event = {
      projectId: 'example.com',
      type: 'pageview',
      path: '/home',
      ua: 'Googlebot/2.1',
    }
    
    const response = await app.request('/ingest', {
      method: 'POST',
      body: JSON.stringify(event),
    })
    
    expect(response.status).toBe(200)
    
    const events = await db.select().from(events)
    expect(events[0].deviceType).toBe('bot')
  })
  
  test('rate limits excessive requests', async () => {
    const event = { projectId: 'example.com', type: 'pageview', path: '/' }
    
    // Send 101 requests rapidly
    const requests = Array.from({ length: 101 }, () =>
      app.request('/ingest', {
        method: 'POST',
        headers: { 'x-real-ip': '192.0.2.1' },
        body: JSON.stringify(event),
      })
    )
    
    const responses = await Promise.all(requests)
    const rateLimited = responses.filter(r => r.status === 429)
    
    expect(rateLimited.length).toBeGreaterThan(0)
  })
})
```

#### Dashboard Query Tests

```typescript
// apps/dashboard/tests/integration/queries.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { setupTestDb } from '../setup'
import { getUniqueVisitors, getSessionCount } from '../../src/queries'

describe('Dashboard Queries', () => {
  let db: any
  let cleanup: () => void
  
  beforeEach(async () => {
    const setup = setupTestDb()
    db = setup.db
    cleanup = setup.cleanup
    
    // Seed test data
    await db.insert(events).values([
      {
        projectId: 'example.com',
        visitorId: 'visitor-1',
        sessionId: 'session-1',
        type: 'pageview',
        ts: new Date('2024-01-01T10:00:00Z'),
      },
      {
        projectId: 'example.com',
        visitorId: 'visitor-1',
        sessionId: 'session-1',
        type: 'pageview',
        ts: new Date('2024-01-01T10:05:00Z'),
      },
      {
        projectId: 'example.com',
        visitorId: 'visitor-2',
        sessionId: 'session-2',
        type: 'pageview',
        ts: new Date('2024-01-01T11:00:00Z'),
      },
    ])
  })
  
  afterEach(() => {
    cleanup()
  })
  
  test('counts unique visitors correctly', async () => {
    const count = await getUniqueVisitors(
      'example.com',
      new Date('2024-01-01T00:00:00Z'),
      new Date('2024-01-01T23:59:59Z')
    )
    
    expect(count).toBe(2)
  })
  
  test('counts sessions correctly', async () => {
    const count = await getSessionCount(
      'example.com',
      new Date('2024-01-01T00:00:00Z'),
      new Date('2024-01-01T23:59:59Z')
    )
    
    expect(count).toBe(2)
  })
  
  test('filters by date range', async () => {
    const count = await getUniqueVisitors(
      'example.com',
      new Date('2024-01-01T10:30:00Z'),
      new Date('2024-01-01T23:59:59Z')
    )
    
    expect(count).toBe(1) // Only visitor-2
  })
})
```

### Running Integration Tests

```bash
# All integration tests
bun test tests/integration

# Specific test file
bun test tests/integration/ingest.test.ts

# With database logs
DEBUG=db bun test tests/integration
```

## E2E Tests

### Scope

Test complete user flows:
- SDK installation and page tracking
- Custom event tracking from browser
- Dashboard viewing and filtering
- Multi-page session tracking

### Setup

```typescript
// e2e/setup.ts
import { test as base } from '@playwright/test'

export const test = base.extend({
  // Inject analytics script
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.ANALYTICS_URL = 'http://localhost:3000/ingest'
    })
    await use(page)
  },
})
```

### Examples

#### SDK Tracking E2E

```typescript
// e2e/sdk-tracking.spec.ts
import { test, expect } from './setup'

test.describe('SDK Tracking', () => {
  test('tracks page views automatically', async ({ page }) => {
    // Intercept analytics requests
    const requests: any[] = []
    await page.route('**/ingest', route => {
      requests.push(route.request().postDataJSON())
      route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) })
    })
    
    // Navigate to page
    await page.goto('http://localhost:3001')
    
    // Wait for analytics call
    await page.waitForTimeout(1000)
    
    expect(requests).toHaveLength(1)
    expect(requests[0].type).toBe('pageview')
    expect(requests[0].path).toBe('/')
    expect(requests[0].visitorId).toMatch(/^[0-9a-f-]{36}$/)
  })
  
  test('tracks custom events', async ({ page }) => {
    const requests: any[] = []
    await page.route('**/ingest', route => {
      requests.push(route.request().postDataJSON())
      route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) })
    })
    
    await page.goto('http://localhost:3001')
    
    // Click button that triggers custom event
    await page.click('button[data-track="signup"]')
    
    await page.waitForTimeout(500)
    
    const customEvent = requests.find(r => r.type === 'button_click')
    expect(customEvent).toBeDefined()
    expect(customEvent.meta.button).toBe('signup')
  })
  
  test('maintains visitor ID across pages', async ({ page }) => {
    const requests: any[] = []
    await page.route('**/ingest', route => {
      requests.push(route.request().postDataJSON())
      route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) })
    })
    
    await page.goto('http://localhost:3001')
    await page.waitForTimeout(500)
    
    await page.goto('http://localhost:3001/about')
    await page.waitForTimeout(500)
    
    expect(requests).toHaveLength(2)
    expect(requests[0].visitorId).toBe(requests[1].visitorId)
    expect(requests[0].sessionId).toBe(requests[1].sessionId)
  })
})
```

#### Dashboard E2E

```typescript
// e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test('displays analytics data', async ({ page }) => {
    await page.goto('http://localhost:3002')
    
    // Check overview cards
    await expect(page.locator('[data-metric="pageviews"]')).toBeVisible()
    await expect(page.locator('[data-metric="visitors"]')).toBeVisible()
    await expect(page.locator('[data-metric="sessions"]')).toBeVisible()
    
    // Check chart
    await expect(page.locator('[data-chart="timeseries"]')).toBeVisible()
    
    // Check tables
    await expect(page.locator('[data-table="top-pages"]')).toBeVisible()
    await expect(page.locator('[data-table="referrers"]')).toBeVisible()
  })
  
  test('filters by date range', async ({ page }) => {
    await page.goto('http://localhost:3002')
    
    // Select date range
    await page.click('[data-filter="date-range"]')
    await page.click('[data-range="7d"]')
    
    // Wait for data refresh
    await page.waitForTimeout(1000)
    
    // Verify URL updated
    expect(page.url()).toContain('range=7d')
  })
  
  test('excludes bot traffic by default', async ({ page }) => {
    await page.goto('http://localhost:3002')
    
    // Bot toggle should be off
    const toggle = page.locator('[data-filter="include-bots"]')
    await expect(toggle).not.toBeChecked()
  })
})
```

### Running E2E Tests

```bash
# Install Playwright
bun add -d @playwright/test

# Run all E2E tests
bun run playwright test

# Run in UI mode
bun run playwright test --ui

# Run specific browser
bun run playwright test --project=chromium

# Debug mode
bun run playwright test --debug
```

## Performance Tests

### Load Testing Ingestion

```javascript
// performance/ingest-load.js (k6)
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m', target: 500 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<100'],
    http_req_failed: ['rate<0.01'],
  },
}

export default function () {
  const payload = JSON.stringify({
    projectId: 'example.com',
    type: 'pageview',
    path: '/',
    visitorId: `visitor-${__VU}-${__ITER}`,
    sessionId: `session-${__VU}`,
  })
  
  const response = http.post(
    'http://localhost:3000/ingest',
    payload,
    {
      headers: { 'Content-Type': 'application/json' },
    }
  )
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 100ms': (r) => r.timings.duration < 100,
  })
  
  sleep(1)
}
```

```bash
# Run load test
k6 run performance/ingest-load.js

# With higher load
k6 run --vus 1000 --duration 5m performance/ingest-load.js
```

### Dashboard Query Performance

```typescript
// performance/query-benchmark.test.ts
import { describe, test } from 'bun:test'
import { getUniqueVisitors, getTopPages } from '../src/queries'

describe('Query Performance', () => {
  test('unique visitors query < 100ms', async () => {
    const start = performance.now()
    
    await getUniqueVisitors(
      'example.com',
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      new Date()
    )
    
    const duration = performance.now() - start
    expect(duration).toBeLessThan(100)
  })
  
  test('top pages query < 100ms', async () => {
    const start = performance.now()
    
    await getTopPages(
      'example.com',
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      new Date(),
      10
    )
    
    const duration = performance.now() - start
    expect(duration).toBeLessThan(100)
  })
})
```

## Test Data

### Fixtures

```typescript
// tests/fixtures/events.ts
export const mockPageView = {
  projectId: 'example.com',
  type: 'pageview',
  path: '/home',
  visitorId: 'visitor-123',
  sessionId: 'session-456',
  ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  lang: 'en-US',
}

export const mockCustomEvent = {
  projectId: 'example.com',
  type: 'button_click',
  path: '/signup',
  visitorId: 'visitor-123',
  sessionId: 'session-456',
  meta: {
    button: 'signup',
    location: 'header',
  },
}

export const mockBotEvent = {
  projectId: 'example.com',
  type: 'pageview',
  path: '/',
  ua: 'Googlebot/2.1',
}
```

### Seed Data

```typescript
// tests/seed.ts
import { db } from '@remcostoeten/db'
import { events } from '@remcostoeten/db/schema'

export async function seedTestData() {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  
  await db.insert(events).values([
    {
      projectId: 'example.com',
      type: 'pageview',
      path: '/',
      visitorId: 'visitor-1',
      sessionId: 'session-1',
      ts: yesterday,
    },
    {
      projectId: 'example.com',
      type: 'pageview',
      path: '/about',
      visitorId: 'visitor-2',
      sessionId: 'session-2',
      ts: now,
    },
  ])
}
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun test
      - run: bun test --coverage
      
  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun test tests/integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bunx playwright install --with-deps
      - run: bun run playwright test
      
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/k6-action@v0.3.1
        with:
          filename: performance/ingest-load.js
```

## Coverage Targets

- **Unit tests:** 80% coverage
- **Integration tests:** Critical paths covered
- **E2E tests:** Main user flows covered

```bash
# Generate coverage report
bun test --coverage

# View HTML report
open coverage/index.html
```

## Test Conventions

### Naming

- Test files: `*.test.ts` for unit, `*.spec.ts` for E2E
- Describe blocks: Component or function name
- Test names: Should read like sentences

```typescript
describe('getVisitorId', () => {
  test('generates new UUID on first call', () => {})
  test('returns same ID on subsequent calls', () => {})
  test('resets when requested', () => {})
})
```

### Assertions

Prefer specific assertions:

```typescript
// Good
expect(result.country).toBe('US')
expect(result.isBot).toBe(true)

// Avoid
expect(result).toBeTruthy()
expect(result).toMatchObject({})
```

### Async Tests

Always await or return promises:

```typescript
// Good
test('saves event', async () => {
  await db.insert(events).values(event)
  const saved = await db.select().from(events)
  expect(saved).toHaveLength(1)
})

// Bad
test('saves event', () => {
  db.insert(events).values(event)
  // Race condition!
})
```

## Debugging Tests

```bash
# Run single test
bun test -t "generates new UUID"

# Debug mode with logs
DEBUG=* bun test

# Inspect failed tests
bun test --bail

# Update snapshots
bun test -u
```

## Mocking External Services

```typescript
// Mock Neon database
import { mock } from 'bun:test'

const mockDb = {
  insert: mock(() => ({ values: mock(() => Promise.resolve()) })),
  select: mock(() => ({ from: mock(() => ({ where: mock(() => []) })) })),
}

// Mock fetch
globalThis.fetch = mock(() =>
  Promise.resolve(new Response(JSON.stringify({ ok: true })))
)
```

## Acceptance Criteria

- [ ] Unit tests cover core logic (80%+ coverage)
- [ ] Integration tests cover critical paths
- [ ] E2E tests cover main user flows
- [ ] Performance tests verify latency targets
- [ ] CI runs all tests on push
- [ ] Tests are fast (unit < 10s, integration < 1m)
- [ ] No flaky tests in CI
- [ ] Test data fixtures are reusable
- [ ] Mocks are properly cleaned up

## Resources

- Bun Test Docs: https://bun.sh/docs/cli/test
- Playwright Docs: https://playwright.dev
- k6 Docs: https://k6.io/docs