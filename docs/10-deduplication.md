# Event Deduplication Strategy

Owner: Remco
Status: Draft

## Overview

Strategy for preventing duplicate event recording caused by client-side retries, double-clicks, rapid navigation, and network issues.

## Problem Statement

Duplicate events occur due to:
- User double-clicking links or buttons
- Browser back/forward navigation
- React component re-renders triggering multiple track calls
- Network timeouts causing client retries
- Page refresh during navigation
- sendBeacon fallback to fetch causing duplicates

## Core Principles

- Dedupe on server side, not client
- Use time window + event fingerprint
- Balance accuracy vs complexity
- Accept some duplicates over blocking legitimate events
- No external dependencies (Redis) for MVP

## Deduplication Strategy

### Method 1: Event Fingerprint

Generate unique fingerprint for each event.

```typescript
// apps/ingestion/src/dedupe.ts
import { createHash } from 'crypto'

type EventFingerprint = {
  projectId: string
  visitorId: string | null
  sessionId: string | null
  type: string
  path: string | null
  timestamp: number
}

export function generateFingerprint(event: EventFingerprint): string {
  const parts = [
    event.projectId,
    event.visitorId || 'no-visitor',
    event.sessionId || 'no-session',
    event.type,
    event.path || 'no-path',
    // Round timestamp to nearest 10 seconds
    Math.floor(event.timestamp / 10000) * 10000,
  ]
  
  const key = parts.join('::')
  return createHash('sha256').update(key).digest('hex')
}
```

### Method 2: In-Memory Deduplication Cache

Store recent fingerprints in memory with TTL.

```typescript
// apps/ingestion/src/dedupe.ts
type DedupeEntry = {
  fingerprint: string
  expiresAt: number
}

class DedupeCache {
  private cache: Map<string, number>
  private readonly ttlMs: number
  private readonly maxSize: number
  
  constructor(ttlMs: number = 60000, maxSize: number = 100000) {
    this.cache = new Map()
    this.ttlMs = ttlMs
    this.maxSize = maxSize
    
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000)
  }
  
  isDuplicate(fingerprint: string): boolean {
    const now = Date.now()
    const expiresAt = this.cache.get(fingerprint)
    
    if (expiresAt && now < expiresAt) {
      return true
    }
    
    return false
  }
  
  add(fingerprint: string): void {
    const now = Date.now()
    this.cache.set(fingerprint, now + this.ttlMs)
    
    // Prevent unbounded growth
    if (this.cache.size > this.maxSize) {
      this.evictOldest()
    }
  }
  
  private cleanup(): void {
    const now = Date.now()
    
    for (const [fingerprint, expiresAt] of this.cache.entries()) {
      if (now >= expiresAt) {
        this.cache.delete(fingerprint)
      }
    }
  }
  
  private evictOldest(): void {
    const toDelete = Math.floor(this.maxSize * 0.1) // Remove 10%
    let deleted = 0
    
    for (const [fingerprint] of this.cache.entries()) {
      if (deleted >= toDelete) break
      this.cache.delete(fingerprint)
      deleted++
    }
  }
  
  size(): number {
    return this.cache.size
  }
}

export const dedupeCache = new DedupeCache()
```

### Method 3: Complete Ingestion Flow

```typescript
// apps/ingestion/src/handlers/ingest.ts
import { generateFingerprint, dedupeCache } from '../dedupe'

async function handleIngest(req: Request) {
  const payload = await req.json()
  
  // Generate fingerprint
  const fingerprint = generateFingerprint({
    projectId: payload.projectId,
    visitorId: payload.visitorId,
    sessionId: payload.sessionId,
    type: payload.type,
    path: payload.path,
    timestamp: Date.now(),
  })
  
  // Check for duplicate
  if (dedupeCache.isDuplicate(fingerprint)) {
    // Return success but don't store
    return new Response(JSON.stringify({ ok: true, deduped: true }), {
      headers: { 'content-type': 'application/json' },
    })
  }
  
  // Add to cache before DB insert to prevent race conditions
  dedupeCache.add(fingerprint)
  
  try {
    // Insert to database
    await db.insert(events).values({
      ...payload,
      // Store fingerprint for debugging
      meta: {
        ...payload.meta,
        fingerprint,
      },
    })
    
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (error) {
    // Remove from cache on DB failure
    dedupeCache.cache.delete(fingerprint)
    throw error
  }
}
```

## Time Window Configuration

### Default: 60 seconds

Most duplicates occur within 1 minute:
- Double-clicks: < 1 second
- React re-renders: < 5 seconds
- Network retries: < 30 seconds
- Page refresh: < 60 seconds

### Configurable per Event Type

```typescript
type DedupeConfig = {
  [eventType: string]: number
}

const DEDUPE_WINDOWS: DedupeConfig = {
  pageview: 10000,    // 10 seconds (pageviews are very frequent)
  click: 5000,        // 5 seconds (intentional double-clicks rare)
  submit: 30000,      // 30 seconds (form submissions need longer window)
  error: 60000,       // 60 seconds (errors might be logged multiple times)
  custom: 60000,      // 60 seconds (default for custom events)
}

function getDedupeWindow(eventType: string): number {
  return DEDUPE_WINDOWS[eventType] || 60000
}
```

## Timestamp Rounding Strategy

Round timestamps to prevent clock skew issues.

```typescript
function roundTimestamp(ts: number, windowMs: number): number {
  // Round to nearest window
  return Math.floor(ts / windowMs) * windowMs
}

// Example: Round to nearest 10 seconds
const rounded = roundTimestamp(Date.now(), 10000)
```

## Handling Edge Cases

### Missing Visitor or Session ID

```typescript
function generateFingerprint(event: EventFingerprint): string {
  // Use IP hash as fallback identifier
  const identifier = event.visitorId || event.sessionId || event.ipHash || 'unknown'
  
  const parts = [
    event.projectId,
    identifier,
    event.type,
    event.path || 'no-path',
    Math.floor(event.timestamp / 10000) * 10000,
  ]
  
  return createHash('sha256').update(parts.join('::')).digest('hex')
}
```

### Custom Events with Metadata

Include relevant meta fields in fingerprint:

```typescript
function generateFingerprintWithMeta(
  event: EventFingerprint,
  meta: Record<string, unknown> | null
): string {
  const baseParts = [
    event.projectId,
    event.visitorId || 'no-visitor',
    event.type,
    event.path || 'no-path',
    Math.floor(event.timestamp / 10000) * 10000,
  ]
  
  // Include specific meta fields for custom events
  if (meta && event.type !== 'pageview') {
    const metaKeys = Object.keys(meta).sort()
    const metaString = metaKeys
      .map(key => `${key}:${meta[key]}`)
      .join('|')
    baseParts.push(metaString)
  }
  
  return createHash('sha256').update(baseParts.join('::')).digest('hex')
}
```

## Multi-Instance Deployment

### Problem

Multiple serverless instances can't share in-memory cache.

### Solution 1: Accept Limited Effectiveness (MVP)

- Each instance has its own cache
- Same user might hit different instances
- Some duplicates slip through
- Acceptable for MVP with low traffic

### Solution 2: Redis (Future)

```typescript
// Future implementation with Redis
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
})

async function isDuplicateRedis(fingerprint: string): Promise<boolean> {
  const exists = await redis.get(fingerprint)
  
  if (exists) {
    return true
  }
  
  await redis.setex(fingerprint, 60, '1') // 60 second TTL
  return false
}
```

### Solution 3: Database Check (Not Recommended)

```typescript
// Too slow for real-time ingestion
async function isDuplicateDb(fingerprint: string): Promise<boolean> {
  const existing = await db
    .select()
    .from(events)
    .where(
      and(
        sql`meta->>'fingerprint' = ${fingerprint}`,
        gte(events.ts, new Date(Date.now() - 60000))
      )
    )
    .limit(1)
  
  return existing.length > 0
}
```

## Client-Side Considerations

### Prevent Multiple Track Calls

```typescript
// packages/sdk/src/track.ts
const recentEvents = new Set<string>()

export function track(
  eventType: string,
  meta?: Record<string, unknown>,
  options: TrackOptions = {}
) {
  // Generate client-side fingerprint
  const fingerprint = `${eventType}::${window.location.pathname}::${Date.now()}`
  
  if (recentEvents.has(fingerprint)) {
    return // Already tracked
  }
  
  recentEvents.add(fingerprint)
  
  // Remove after 5 seconds
  setTimeout(() => {
    recentEvents.delete(fingerprint)
  }, 5000)
  
  // Send event
  sendEvent({ type: eventType, meta, ...options })
}
```

### React Hook Protection

```typescript
// packages/sdk/src/use-page-view.ts
import { useEffect, useRef } from 'react'

export function usePageView(options: TrackOptions = {}) {
  const tracked = useRef(false)
  
  useEffect(() => {
    if (tracked.current) {
      return
    }
    
    tracked.current = true
    trackPageView(options)
  }, [options])
}
```

## Monitoring and Debugging

### Dedupe Metrics

```typescript
// apps/ingestion/src/metrics.ts
type DedupeMetrics = {
  totalRequests: number
  duplicatesBlocked: number
  cacheSize: number
  cacheHitRate: number
}

class MetricsCollector {
  private totalRequests = 0
  private duplicatesBlocked = 0
  
  recordRequest(): void {
    this.totalRequests++
  }
  
  recordDuplicate(): void {
    this.duplicatesBlocked++
  }
  
  getMetrics(): DedupeMetrics {
    return {
      totalRequests: this.totalRequests,
      duplicatesBlocked: this.duplicatesBlocked,
      cacheSize: dedupeCache.size(),
      cacheHitRate: this.totalRequests > 0
        ? this.duplicatesBlocked / this.totalRequests
        : 0,
    }
  }
  
  reset(): void {
    this.totalRequests = 0
    this.duplicatesBlocked = 0
  }
}

export const metrics = new MetricsCollector()
```

### Metrics Endpoint

```typescript
// apps/ingestion/src/app.ts
app.get('/metrics', (c) => {
  const metricsData = metrics.getMetrics()
  return c.json(metricsData)
})
```

### Dashboard Widget

```typescript
// apps/dashboard/src/components/dedupe-stats.tsx
export function DedupeStats() {
  const [stats, setStats] = useState(null)
  
  useEffect(() => {
    fetch('https://ingest.example.com/metrics')
      .then(r => r.json())
      .then(setStats)
  }, [])
  
  if (!stats) return null
  
  return (
    <div>
      <h3>Deduplication Stats</h3>
      <p>Cache size: {stats.cacheSize}</p>
      <p>Duplicates blocked: {stats.duplicatesBlocked}</p>
      <p>Hit rate: {(stats.cacheHitRate * 100).toFixed(2)}%</p>
    </div>
  )
}
```

## Testing Strategy

### Unit Tests

```typescript
// apps/ingestion/src/__tests__/dedupe.test.ts
import { generateFingerprint, DedupeCache } from '../dedupe'

describe('generateFingerprint', () => {
  it('generates same fingerprint for identical events', () => {
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
  })
  
  it('generates different fingerprints for different paths', () => {
    const event1 = {
      projectId: 'example.com',
      visitorId: 'visitor-123',
      sessionId: 'session-456',
      type: 'pageview',
      path: '/home',
      timestamp: 1000000000000,
    }
    
    const event2 = { ...event1, path: '/about' }
    
    const fp1 = generateFingerprint(event1)
    const fp2 = generateFingerprint(event2)
    
    expect(fp1).not.toBe(fp2)
  })
  
  it('rounds timestamps to prevent minor variations', () => {
    const event1 = {
      projectId: 'example.com',
      visitorId: 'visitor-123',
      sessionId: 'session-456',
      type: 'pageview',
      path: '/home',
      timestamp: 1000000000000,
    }
    
    const event2 = { ...event1, timestamp: 1000000005000 } // 5 seconds later
    
    const fp1 = generateFingerprint(event1)
    const fp2 = generateFingerprint(event2)
    
    expect(fp1).toBe(fp2) // Should be same due to rounding
  })
})

describe('DedupeCache', () => {
  let cache: DedupeCache
  
  beforeEach(() => {
    cache = new DedupeCache(1000) // 1 second TTL for testing
  })
  
  it('detects duplicates within TTL', () => {
    const fingerprint = 'test-fingerprint'
    
    expect(cache.isDuplicate(fingerprint)).toBe(false)
    cache.add(fingerprint)
    expect(cache.isDuplicate(fingerprint)).toBe(true)
  })
  
  it('expires entries after TTL', async () => {
    const fingerprint = 'test-fingerprint'
    
    cache.add(fingerprint)
    expect(cache.isDuplicate(fingerprint)).toBe(true)
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100))
    
    expect(cache.isDuplicate(fingerprint)).toBe(false)
  })
  
  it('prevents unbounded growth', () => {
    const smallCache = new DedupeCache(60000, 100) // Max 100 entries
    
    // Add 150 entries
    for (let i = 0; i < 150; i++) {
      smallCache.add(`fingerprint-${i}`)
    }
    
    // Should have evicted some
    expect(smallCache.size()).toBeLessThan(150)
  })
})
```

### Integration Tests

```typescript
// Test duplicate detection in real requests
describe('Ingestion deduplication', () => {
  it('blocks duplicate events within 60 seconds', async () => {
    const event = {
      projectId: 'example.com',
      visitorId: 'visitor-123',
      sessionId: 'session-456',
      type: 'pageview',
      path: '/home',
    }
    
    // First request
    const response1 = await fetch('http://localhost:3000/ingest', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(event),
    })
    
    expect(response1.ok).toBe(true)
    const data1 = await response1.json()
    expect(data1.deduped).toBeUndefined()
    
    // Second request (duplicate)
    const response2 = await fetch('http://localhost:3000/ingest', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(event),
    })
    
    expect(response2.ok).toBe(true)
    const data2 = await response2.json()
    expect(data2.deduped).toBe(true)
    
    // Verify only one event in database
    const events = await db
      .select()
      .from(events)
      .where(eq(events.visitorId, 'visitor-123'))
    
    expect(events).toHaveLength(1)
  })
})
```

## Performance Benchmarks

### Target Performance

- Fingerprint generation: < 1ms
- Cache lookup: < 0.1ms
- Memory usage: < 100MB for 100k entries
- Throughput: > 1000 requests/second

### Load Testing

```bash
# Using Apache Bench
ab -n 10000 -c 100 -p event.json -T application/json \
  http://localhost:3000/ingest

# Using wrk
wrk -t4 -c100 -d30s -s post.lua http://localhost:3000/ingest
```

## Configuration

### Environment Variables

```bash
# .env for ingestion
DEDUPE_ENABLED=true
DEDUPE_TTL_MS=60000
DEDUPE_CACHE_MAX_SIZE=100000
```

### Feature Flag

```typescript
// apps/ingestion/src/config.ts
export const config = {
  dedupeEnabled: process.env.DEDUPE_ENABLED === 'true',
  dedupeTtlMs: parseInt(process.env.DEDUPE_TTL_MS || '60000', 10),
  dedupeCacheMaxSize: parseInt(process.env.DEDUPE_CACHE_MAX_SIZE || '100000', 10),
}
```

## Migration Strategy

### Phase 1: Monitor Only

- Implement fingerprinting
- Log duplicates but don't block
- Analyze false positive rate

### Phase 2: Soft Launch

- Enable blocking for pageviews only
- Monitor impact on analytics
- Adjust time windows if needed

### Phase 3: Full Rollout

- Enable for all event types
- Add metrics dashboard
- Document behavior for users

## Acceptance Criteria

- [ ] Fingerprint generation implemented
- [ ] In-memory dedupe cache working
- [ ] TTL expiration working correctly
- [ ] Cache size limits enforced
- [ ] Duplicate events blocked within time window
- [ ] Metrics collection implemented
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Performance benchmarks met
- [ ] Configuration via env vars works
- [ ] No false positives for legitimate events

## Future Enhancements

- Redis-based distributed cache
- Per-project dedupe configuration
- Machine learning for adaptive time windows
- Dedupe statistics in dashboard
- Alert on high duplicate rate