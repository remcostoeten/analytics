// apps/ingestion/src/handlers/ingest.ts
import { Context } from 'hono'
import { db } from '@remcostoeten/db'
import { events } from '@remcostoeten/db'
import { validateEventPayload } from '../validation'
import { extractGeoFromRequest, extractIpAddress, isLocalhost } from '../geo'
import { hashIp } from '../ip-hash'
import { detectBot, classifyDevice } from '../bot-detection'
import { generateFingerprint, dedupeCache, metrics } from '../dedupe'

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

    // Extract IP and hash it
    const ip = extractIpAddress(req)
    const ipHash = hashIp(ip)

    // Extract geographic data from headers
    const geo = extractGeoFromRequest(req)

    // Detect bots
    const botResult = detectBot(req)

    // Classify device type
    const deviceType = classifyDevice(payload.ua, botResult.isBot)

    // Determine if localhost
    const localhost = isLocalhost(payload.host)

    // Generate fingerprint for deduplication
    const fingerprint = generateFingerprint({
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
