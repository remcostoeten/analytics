// apps/ingestion/src/dedupe.ts
import { createHash } from 'crypto'

export type EventFingerprint = {
  projectId: string
  visitorId: string | null
  sessionId: string | null
  type: string
  path: string | null
  timestamp: number
}

/**
 * Generate SHA-256 fingerprint from event key fields
 * Rounds timestamp to 10-second window to handle minor clock skew
 */
export function generateFingerprint(event: EventFingerprint): string {
  // Round timestamp to nearest 10 seconds
  const roundedTimestamp = Math.floor(event.timestamp / 10000) * 10000

  const parts = [
    event.projectId,
    event.visitorId || 'no-visitor',
    event.sessionId || 'no-session',
    event.type,
    event.path || 'no-path',
    roundedTimestamp.toString(),
  ]

  const key = parts.join('::')
  return createHash('sha256').update(key).digest('hex')
}

type DedupeEntry = {
  expiresAt: number
}

/**
 * In-memory cache for deduplication with TTL and size limits
 * Thread-safe for single-process serverless deployments
 */
export class DedupeCache {
  private cache: Map<string, DedupeEntry>
  private readonly ttlMs: number
  private readonly maxSize: number
  private cleanupInterval: Timer | null = null

  constructor(ttlMs: number = 60000, maxSize: number = 100000) {
    this.cache = new Map()
    this.ttlMs = ttlMs
    this.maxSize = maxSize

    // Cleanup expired entries every minute
    this.startCleanup()
  }

  /**
   * Check if fingerprint exists in cache and is not expired
   */
  isDuplicate(fingerprint: string): boolean {
    const now = Date.now()
    const entry = this.cache.get(fingerprint)

    if (!entry) {
      return false
    }

    if (now >= entry.expiresAt) {
      // Expired, remove it
      this.cache.delete(fingerprint)
      return false
    }

    return true
  }

  /**
   * Add fingerprint to cache with TTL
   */
  add(fingerprint: string): void {
    const now = Date.now()

    this.cache.set(fingerprint, {
      expiresAt: now + this.ttlMs,
    })

    // Enforce size limit
    if (this.cache.size > this.maxSize) {
      this.evictOldest()
    }
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Clear all entries (for testing)
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Stop cleanup interval (for testing/shutdown)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000) // Every minute

    // Don't keep process alive for cleanup
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }

  /**
   * Remove expired entries from cache
   */
  private cleanup(): void {
    const now = Date.now()
    let removedCount = 0

    for (const [fingerprint, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(fingerprint)
        removedCount++
      }
    }

    if (removedCount > 0) {
      console.log(`[Dedupe] Cleaned up ${removedCount} expired entries. Cache size: ${this.cache.size}`)
    }
  }

  /**
   * Evict oldest entries when max size is reached
   * Removes 10% of entries based on insertion order
   */
  private evictOldest(): void {
    const toDelete = Math.floor(this.maxSize * 0.1)
    let deleted = 0

    for (const [fingerprint] of this.cache.entries()) {
      if (deleted >= toDelete) {
        break
      }
      this.cache.delete(fingerprint)
      deleted++
    }

    console.log(`[Dedupe] Evicted ${deleted} entries. Cache size: ${this.cache.size}`)
  }
}

/**
 * Configurable TTL per event type
 */
const DEDUPE_WINDOWS: Record<string, number> = {
  pageview: 10000,   // 10 seconds (pageviews are very frequent)
  click: 5000,       // 5 seconds (intentional double-clicks rare)
  submit: 30000,     // 30 seconds (form submissions need longer window)
  error: 60000,      // 60 seconds (errors might be logged multiple times)
  custom: 60000,     // 60 seconds (default for custom events)
}

/**
 * Get dedupe time window for event type
 */
export function getDedupeWindow(eventType: string): number {
  return DEDUPE_WINDOWS[eventType] || 60000
}

/**
 * Global dedupe cache instance
 * 60 second TTL, max 100k entries
 */
export const dedupeCache = new DedupeCache(60000, 100000)

/**
 * Metrics for monitoring dedupe performance
 */
export class DedupeMetrics {
  private totalRequests = 0
  private duplicatesBlocked = 0
  private lastResetTime = Date.now()

  recordRequest(): void {
    this.totalRequests++
  }

  recordDuplicate(): void {
    this.duplicatesBlocked++
  }

  getMetrics() {
    const hitRate = this.totalRequests > 0
      ? this.duplicatesBlocked / this.totalRequests
      : 0

    return {
      totalRequests: this.totalRequests,
      duplicatesBlocked: this.duplicatesBlocked,
      cacheSize: dedupeCache.size(),
      hitRate: Math.round(hitRate * 10000) / 100, // Percentage with 2 decimals
      uptime: Date.now() - this.lastResetTime,
    }
  }

  reset(): void {
    this.totalRequests = 0
    this.duplicatesBlocked = 0
    this.lastResetTime = Date.now()
  }
}

/**
 * Global metrics instance
 */
export const metrics = new DedupeMetrics()
