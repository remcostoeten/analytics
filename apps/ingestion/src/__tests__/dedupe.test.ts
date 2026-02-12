// apps/ingestion/src/__tests__/dedupe.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import {
  generateFingerprint,
  DedupeCache,
  getDedupeWindow,
  metrics,
} from '../dedupe'

describe('generateFingerprint', () => {
  test('generates consistent fingerprint for same event', () => {
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
    expect(fp1).toMatch(/^[a-f0-9]{64}$/) // SHA-256 hex
  })

  test('generates different fingerprints for different paths', () => {
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

  test('generates different fingerprints for different projects', () => {
    const event1 = {
      projectId: 'example.com',
      visitorId: 'visitor-123',
      sessionId: 'session-456',
      type: 'pageview',
      path: '/home',
      timestamp: 1000000000000,
    }

    const event2 = { ...event1, projectId: 'other.com' }

    const fp1 = generateFingerprint(event1)
    const fp2 = generateFingerprint(event2)

    expect(fp1).not.toBe(fp2)
  })

  test('generates different fingerprints for different visitors', () => {
    const event1 = {
      projectId: 'example.com',
      visitorId: 'visitor-123',
      sessionId: 'session-456',
      type: 'pageview',
      path: '/home',
      timestamp: 1000000000000,
    }

    const event2 = { ...event1, visitorId: 'visitor-789' }

    const fp1 = generateFingerprint(event1)
    const fp2 = generateFingerprint(event2)

    expect(fp1).not.toBe(fp2)
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

    // 5 seconds later (within 10-second window)
    const event2 = { ...event1, timestamp: 1000000005000 }

    const fp1 = generateFingerprint(event1)
    const fp2 = generateFingerprint(event2)

    expect(fp1).toBe(fp2)
  })

  test('generates different fingerprints outside 10-second window', () => {
    const event1 = {
      projectId: 'example.com',
      visitorId: 'visitor-123',
      sessionId: 'session-456',
      type: 'pageview',
      path: '/home',
      timestamp: 1000000000000,
    }

    // 11 seconds later (outside 10-second window)
    const event2 = { ...event1, timestamp: 1000000011000 }

    const fp1 = generateFingerprint(event1)
    const fp2 = generateFingerprint(event2)

    expect(fp1).not.toBe(fp2)
  })

  test('handles null visitorId', () => {
    const event = {
      projectId: 'example.com',
      visitorId: null,
      sessionId: 'session-456',
      type: 'pageview',
      path: '/home',
      timestamp: 1000000000000,
    }

    const fingerprint = generateFingerprint(event)

    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/)
  })

  test('handles null sessionId', () => {
    const event = {
      projectId: 'example.com',
      visitorId: 'visitor-123',
      sessionId: null,
      type: 'pageview',
      path: '/home',
      timestamp: 1000000000000,
    }

    const fingerprint = generateFingerprint(event)

    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/)
  })

  test('handles null path', () => {
    const event = {
      projectId: 'example.com',
      visitorId: 'visitor-123',
      sessionId: 'session-456',
      type: 'custom_event',
      path: null,
      timestamp: 1000000000000,
    }

    const fingerprint = generateFingerprint(event)

    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/)
  })

  test('generates same fingerprint for events with all nulls', () => {
    const event1 = {
      projectId: 'example.com',
      visitorId: null,
      sessionId: null,
      type: 'pageview',
      path: null,
      timestamp: 1000000000000,
    }

    const event2 = { ...event1 }

    const fp1 = generateFingerprint(event1)
    const fp2 = generateFingerprint(event2)

    expect(fp1).toBe(fp2)
  })
})

describe('DedupeCache', () => {
  let cache: DedupeCache

  beforeEach(() => {
    cache = new DedupeCache(1000, 100) // 1 second TTL, 100 max size
  })

  afterEach(() => {
    cache.stopCleanup()
    cache.clear()
  })

  test('detects duplicates within TTL', () => {
    const fingerprint = 'test-fingerprint-123'

    expect(cache.isDuplicate(fingerprint)).toBe(false)

    cache.add(fingerprint)

    expect(cache.isDuplicate(fingerprint)).toBe(true)
  })

  test('returns false for non-existent fingerprint', () => {
    const fingerprint = 'non-existent-fingerprint'

    expect(cache.isDuplicate(fingerprint)).toBe(false)
  })

  test('expires entries after TTL', async () => {
    const fingerprint = 'test-fingerprint-expire'

    cache.add(fingerprint)
    expect(cache.isDuplicate(fingerprint)).toBe(true)

    // Wait for TTL to expire
    await Bun.sleep(1100)

    expect(cache.isDuplicate(fingerprint)).toBe(false)
  })

  test('tracks cache size correctly', () => {
    expect(cache.size()).toBe(0)

    cache.add('fp1')
    expect(cache.size()).toBe(1)

    cache.add('fp2')
    expect(cache.size()).toBe(2)

    cache.add('fp3')
    expect(cache.size()).toBe(3)
  })

  test('does not increase size for duplicate adds', () => {
    cache.add('fp1')
    expect(cache.size()).toBe(1)

    cache.add('fp1')
    expect(cache.size()).toBe(1)
  })

  test('enforces max size limit', () => {
    const smallCache = new DedupeCache(60000, 10)

    // Add 20 entries (exceeds max of 10)
    for (let i = 0; i < 20; i++) {
      smallCache.add(`fp-${i}`)
    }

    // Should have evicted some entries
    expect(smallCache.size()).toBeLessThan(20)
    expect(smallCache.size()).toBeGreaterThan(0)

    smallCache.stopCleanup()
  })

  test('evicts oldest entries when max size reached', () => {
    const smallCache = new DedupeCache(60000, 10)

    // Add 10 entries
    for (let i = 0; i < 10; i++) {
      smallCache.add(`fp-${i}`)
    }

    expect(smallCache.size()).toBe(10)

    // Add one more to trigger eviction
    smallCache.add('fp-new')

    // Should have evicted ~10% (1 entry) plus added 1
    expect(smallCache.size()).toBeLessThanOrEqual(10)

    smallCache.stopCleanup()
  })

  test('clear removes all entries', () => {
    cache.add('fp1')
    cache.add('fp2')
    cache.add('fp3')

    expect(cache.size()).toBe(3)

    cache.clear()

    expect(cache.size()).toBe(0)
    expect(cache.isDuplicate('fp1')).toBe(false)
  })

  test('handles many concurrent operations', () => {
    const fingerprints = Array.from({ length: 50 }, (_, i) => `fp-${i}`)

    // Add all fingerprints
    fingerprints.forEach(fp => cache.add(fp))

    // All should be duplicates
    fingerprints.forEach(fp => {
      expect(cache.isDuplicate(fp)).toBe(true)
    })

    expect(cache.size()).toBe(50)
  })

  test('different fingerprints are not considered duplicates', () => {
    cache.add('fp1')

    expect(cache.isDuplicate('fp1')).toBe(true)
    expect(cache.isDuplicate('fp2')).toBe(false)
    expect(cache.isDuplicate('fp3')).toBe(false)
  })
})

describe('getDedupeWindow', () => {
  test('returns 10 seconds for pageview events', () => {
    expect(getDedupeWindow('pageview')).toBe(10000)
  })

  test('returns 5 seconds for click events', () => {
    expect(getDedupeWindow('click')).toBe(5000)
  })

  test('returns 30 seconds for submit events', () => {
    expect(getDedupeWindow('submit')).toBe(30000)
  })

  test('returns 60 seconds for error events', () => {
    expect(getDedupeWindow('error')).toBe(60000)
  })

  test('returns 60 seconds for custom events', () => {
    expect(getDedupeWindow('custom')).toBe(60000)
  })

  test('returns 60 seconds for unknown event types', () => {
    expect(getDedupeWindow('unknown_event')).toBe(60000)
    expect(getDedupeWindow('random')).toBe(60000)
  })
})

describe('DedupeMetrics', () => {
  beforeEach(() => {
    metrics.reset()
  })

  test('tracks total requests', () => {
    metrics.recordRequest()
    metrics.recordRequest()
    metrics.recordRequest()

    const data = metrics.getMetrics()

    expect(data.totalRequests).toBe(3)
  })

  test('tracks duplicates blocked', () => {
    metrics.recordRequest()
    metrics.recordDuplicate()
    metrics.recordRequest()
    metrics.recordDuplicate()

    const data = metrics.getMetrics()

    expect(data.totalRequests).toBe(2)
    expect(data.duplicatesBlocked).toBe(2)
  })

  test('calculates hit rate correctly', () => {
    metrics.recordRequest()
    metrics.recordRequest()
    metrics.recordRequest()
    metrics.recordRequest()
    metrics.recordDuplicate()

    const data = metrics.getMetrics()

    expect(data.hitRate).toBe(25) // 1/4 = 25%
  })

  test('returns 0 hit rate when no requests', () => {
    const data = metrics.getMetrics()

    expect(data.hitRate).toBe(0)
    expect(data.totalRequests).toBe(0)
    expect(data.duplicatesBlocked).toBe(0)
  })

  test('resets metrics correctly', () => {
    metrics.recordRequest()
    metrics.recordRequest()
    metrics.recordDuplicate()

    let data = metrics.getMetrics()
    expect(data.totalRequests).toBe(2)
    expect(data.duplicatesBlocked).toBe(1)

    metrics.reset()

    data = metrics.getMetrics()
    expect(data.totalRequests).toBe(0)
    expect(data.duplicatesBlocked).toBe(0)
  })

  test('includes cache size in metrics', () => {
    const data = metrics.getMetrics()

    expect(data.cacheSize).toBeGreaterThanOrEqual(0)
    expect(typeof data.cacheSize).toBe('number')
  })

  test('includes uptime in metrics', () => {
    const data = metrics.getMetrics()

    expect(data.uptime).toBeGreaterThanOrEqual(0)
    expect(typeof data.uptime).toBe('number')
  })

  test('hit rate has 2 decimal precision', () => {
    metrics.recordRequest()
    metrics.recordRequest()
    metrics.recordRequest()
    metrics.recordDuplicate()

    const data = metrics.getMetrics()

    // 1/3 = 33.33%
    expect(data.hitRate).toBe(33.33)
  })
})
