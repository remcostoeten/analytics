// apps/ingestion/src/handlers/ingest.ts
import { Context } from 'hono'
import { validateEventPayload } from '../validation.js'
import { extractGeoFromRequest, extractIpAddress, isLocalhost } from '../geo.js'
import { hashIp } from '../ip-hash.js'
import { detectBot, classifyDevice } from '../bot-detection.js'
import { generateFingerprint, dedupeCache, metrics } from '../dedupe.js'
import { rateLimiter, botRateLimiter } from '../rate-limit.js'

// Lazy import to avoid requiring DATABASE_URL during tests
let db: any = null
let events: any = null

async function getDb() {
  if (!db) {
    const dbModule = await import('../db.js')
    db = dbModule.db
    events = dbModule.events
  }
  return { db, events }
}

// Origin allowlist for additional security (empty = allow all)
const ORIGIN_ALLOWLIST: string[] = process.env.ORIGIN_ALLOWLIST 
  ? process.env.ORIGIN_ALLOWLIST.split(',').map(o => o.trim())
  : []

function isOriginAllowed(origin: string | null): boolean {
  // If no allowlist is configured, allow all origins
  if (ORIGIN_ALLOWLIST.length === 0) {
    return true
  }

  // Check if origin is in allowlist
  if (origin && ORIGIN_ALLOWLIST.includes(origin)) {
    return true
  }

  // TODO: Add per-project origin validation from database
  // For now, allow if origin matches project domain pattern
  return true
}

export async function handleIngest(c: Context) {
  try {
    // Record request for metrics
    metrics.recordRequest()

    const body = await c.req.json()
    const req = c.req.raw

    // Validate payload
    const result = validateEventPayload(body)

    if (!result.success) {
      return c.json(
        {
          ok: false,
          error: 'Invalid payload',
          details: result.error.issues,
        },
        400
      )
    }

    const payload = result.data

    // Extract IP and hash it for rate limiting
    const ip = extractIpAddress(req)
    const ipHash = await hashIp(ip ?? null)

    // Check origin for security
    const origin = c.req.header('origin') ?? null
    if (!isOriginAllowed(origin)) {
      return c.json(
        {
          ok: false,
          error: 'Origin not allowed',
        },
        403
      )
    }

    // Detect bots early for stricter rate limiting
    const botResult = detectBot(req)
    const limiter = botResult.isBot ? botRateLimiter : rateLimiter

    // Apply rate limiting
    if (!limiter.isAllowed(ipHash ?? '')) {
      const resetTime = limiter.getResetTime(ipHash ?? '')
      const remaining = limiter.getRemainingRequests(ipHash ?? '')
      
      return c.json(
        {
          ok: false,
          error: 'Rate limit exceeded',
          resetTime,
          remaining,
        },
        429
      )
    }

    // Extract geographic data from headers
    const geo = extractGeoFromRequest(req)

    // Classify device type
    const deviceType = classifyDevice(payload.ua, botResult.isBot)

    // Determine if localhost
    const localhost = isLocalhost(payload.host)

    // Generate fingerprint for deduplication
    const fingerprint = await generateFingerprint({
      projectId: payload.projectId,
      visitorId: payload.visitorId,
      sessionId: payload.sessionId,
      type: payload.type || 'pageview',
      path: payload.path,
      timestamp: Date.now(),
    })

    // Check for duplicate
    if (dedupeCache.isDuplicate(fingerprint)) {
      metrics.recordDuplicate()
      return c.json({ ok: true, deduped: true })
    }

    // Add to cache before DB insert to prevent race conditions
    dedupeCache.add(fingerprint)

    // Insert to database with all extracted data
    const { db, events } = await getDb()
    await db.insert(events).values({
      // Original payload
      projectId: payload.projectId,
      type: payload.type || 'pageview',
      path: payload.path,
      referrer: payload.referrer,
      origin: payload.origin,
      host: payload.host,
      ua: payload.ua,
      lang: payload.lang,
      visitorId: payload.visitorId,
      sessionId: payload.sessionId,

      // Extracted data
      ipHash,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      isLocalhost: localhost,
      deviceType,

      // Custom metadata (include bot detection info and fingerprint)
      meta: {
        ...payload.meta,
        botDetected: botResult.isBot,
        botReason: botResult.reason,
        botConfidence: botResult.confidence,
        fingerprint,
      },
    })

    return c.json({ ok: true })
  } catch (error) {
    console.error('Ingest error:', error)
    return c.json(
      {
        ok: false,
        error: 'Internal server error',
      },
      500
    )
  }
}
