# Geo Lookup and IP Handling

Owner: Remco
Status: Draft

## Overview

Strategy for deriving geographic location from incoming requests and handling IP addresses in a privacy-preserving way.

## Geo Lookup Strategy

### Primary Approach: Vercel Edge Headers

When deployed on Vercel, use edge-provided headers:

```typescript
// apps/ingestion/src/geo.ts
type GeoData = {
  country: string | null
  region: string | null
  city: string | null
}

function extractGeoFromHeaders(headers: Headers): GeoData {
  return {
    country: headers.get('x-vercel-ip-country') || null,
    region: headers.get('x-vercel-ip-country-region') || null,
    city: headers.get('x-vercel-ip-city') || null,
  }
}
```

### Vercel Header Reference

| Header | Example | Notes |
|--------|---------|-------|
| `x-vercel-ip-country` | `US` | ISO 3166-1 alpha-2 |
| `x-vercel-ip-country-region` | `CA` | State/province code |
| `x-vercel-ip-city` | `San Francisco` | City name, UTF-8 |
| `x-vercel-ip-timezone` | `America/Los_Angeles` | Optional, not stored |
| `x-vercel-ip-latitude` | `37.7749` | Optional, not stored |
| `x-vercel-ip-longitude` | `-122.4194` | Optional, not stored |

### Fallback Strategy

For local development or non-Vercel deployments:

```typescript
function extractGeoFromRequest(req: Request): GeoData {
  const headers = req.headers
  
  // Try Vercel headers first
  const vercelGeo = extractGeoFromHeaders(headers)
  if (vercelGeo.country) {
    return vercelGeo
  }
  
  // Try Cloudflare headers
  const cfCountry = headers.get('cf-ipcountry')
  if (cfCountry && cfCountry !== 'XX') {
    return {
      country: cfCountry,
      region: null,
      city: null,
    }
  }
  
  // Local development: no geo data
  return {
    country: null,
    region: null,
    city: null,
  }
}
```

### No External Geo Database

For MVP:
- Do NOT implement MaxMind GeoIP
- Do NOT implement IP2Location
- Do NOT call external geo APIs
- Rely entirely on edge headers
- Accept null values when headers are missing

Rationale:
- Simplicity over completeness
- Vercel covers 99% of use cases
- Geo data is nice-to-have, not critical
- Avoid dependency on external services

## IP Address Handling

### Privacy First Principle

Never store raw IP addresses. Use hashed values only.

### IP Extraction

```typescript
function extractIpAddress(req: Request): string | null {
  const headers = req.headers
  
  // Vercel provides this
  const vercelIp = headers.get('x-real-ip')
  if (vercelIp) {
    return vercelIp
  }
  
  // Cloudflare
  const cfIp = headers.get('cf-connecting-ip')
  if (cfIp) {
    return cfIp
  }
  
  // Standard proxy headers
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    // Take first IP in chain
    return forwarded.split(',')[0].trim()
  }
  
  // Local development
  return null
}
```

### IP Hashing Strategy

```typescript
// packages/db/src/ip-hash.ts
import { createHash } from 'crypto'

function getDailySalt(): string {
  const today = new Date().toISOString().split('T')[0]
  const secret = process.env.IP_HASH_SECRET || 'default-secret-change-me'
  return createHash('sha256').update(secret + today).digest('hex')
}

export function hashIp(ip: string | null): string | null {
  if (!ip) {
    return null
  }
  
  const salt = getDailySalt()
  return createHash('sha256').update(ip + salt).digest('hex')
}
```

### Salt Rotation

- Daily salt rotation
- Salt derived from `IP_HASH_SECRET` env var + current date
- Same IP gets same hash within a day
- Different hash on different days
- This prevents long-term tracking while allowing daily dedupe

### Environment Variable

```bash
# .env.local for ingestion
IP_HASH_SECRET=generate-a-random-string-here-min-32-chars
```

Generate secret:
```bash
openssl rand -hex 32
```

## Rate Limiting by IP

### Strategy

Use IP hash for rate limiting to prevent abuse without storing IPs.

```typescript
// Simple in-memory rate limiter for MVP
type RateLimitEntry = {
  count: number
  resetAt: number
}

const rateLimits = new Map<string, RateLimitEntry>()

function checkRateLimit(ipHash: string | null): boolean {
  if (!ipHash) {
    return true // Allow if no IP
  }
  
  const now = Date.now()
  const entry = rateLimits.get(ipHash)
  
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ipHash, {
      count: 1,
      resetAt: now + 60000, // 1 minute window
    })
    return true
  }
  
  if (entry.count >= 100) {
    return false // Exceeded 100 requests per minute
  }
  
  entry.count++
  return true
}
```

### Limits

- 100 requests per minute per IP
- Temporary block for 1 minute
- No persistent storage needed for MVP
- Consider Redis for production if needed

## Localhost Detection

```typescript
function isLocalhost(host: string | null): boolean {
  if (!host) {
    return false
  }
  
  const lower = host.toLowerCase()
  
  return (
    lower === 'localhost' ||
    lower.startsWith('localhost:') ||
    lower === '127.0.0.1' ||
    lower.startsWith('127.0.0.1:') ||
    lower === '::1' ||
    lower.startsWith('[::1]') ||
    lower.endsWith('.local') ||
    lower.endsWith('.localhost')
  )
}
```

## Preview Environment Detection

```typescript
function isPreviewEnvironment(host: string | null): boolean {
  if (!host) {
    return false
  }
  
  // Vercel preview deployments
  if (host.includes('.vercel.app') && !host.startsWith('www.')) {
    return true
  }
  
  // Custom preview patterns
  if (host.includes('-preview.') || host.includes('.preview.')) {
    return true
  }
  
  if (host.startsWith('preview-') || host.startsWith('staging-')) {
    return true
  }
  
  return false
}
```

## Complete Ingestion Flow

```typescript
// apps/ingestion/src/handlers/ingest.ts
import { hashIp } from '@remcostoeten/db/ip-hash'
import { extractGeoFromRequest } from '../geo'
import { isLocalhost, isPreviewEnvironment } from '../utils'

async function handleIngest(req: Request) {
  const host = new URL(req.url).hostname
  const ip = extractIpAddress(req)
  const ipHash = hashIp(ip)
  
  // Rate limit check
  if (!checkRateLimit(ipHash)) {
    return new Response('Rate limit exceeded', { status: 429 })
  }
  
  // Extract geo
  const geo = extractGeoFromRequest(req)
  
  // Determine environment flags
  const localhost = isLocalhost(host)
  const preview = isPreviewEnvironment(host)
  
  // Build event
  const event = {
    ...payloadFromRequest,
    ipHash,
    country: geo.country,
    region: geo.region,
    city: geo.city,
    isLocalhost: localhost,
    // Store preview flag in meta if needed
    meta: preview ? { ...meta, preview: true } : meta,
  }
  
  // Insert to database
  await db.insert(events).values(event)
  
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json' },
  })
}
```

## Dashboard Filtering

Allow filtering by environment in dashboard:

```typescript
// apps/dashboard/src/queries/events.ts
type EventFilters = {
  projectId: string
  startDate: Date
  endDate: Date
  excludeLocalhost?: boolean
  excludePreview?: boolean
}

function buildEventQuery(filters: EventFilters) {
  let query = db
    .select()
    .from(events)
    .where(
      and(
        eq(events.projectId, filters.projectId),
        gte(events.ts, filters.startDate),
        lte(events.ts, filters.endDate)
      )
    )
  
  if (filters.excludeLocalhost) {
    query = query.where(eq(events.isLocalhost, false))
  }
  
  return query
}
```

## Testing Considerations

### Local Development

When running ingestion locally:
- No Vercel headers present
- Geo data will be null
- IP will be null or 127.0.0.1
- This is expected and acceptable

### Testing with Real Geo

Use Vercel preview deployments to test:
- Deploy to Vercel
- Access from different locations
- Verify geo headers are populated
- Check database for correct geo data

### Mock Headers

For testing, mock Vercel headers:

```typescript
const mockHeaders = new Headers({
  'x-vercel-ip-country': 'US',
  'x-vercel-ip-country-region': 'CA',
  'x-vercel-ip-city': 'San Francisco',
  'x-real-ip': '192.0.2.1',
})
```

## Acceptance Criteria

- [ ] Geo extraction works with Vercel headers
- [ ] Fallback returns null gracefully
- [ ] IP hashing uses daily salt
- [ ] IP_HASH_SECRET is required in production
- [ ] Rate limiting prevents abuse
- [ ] Localhost detection works
- [ ] Preview environment detection works
- [ ] Dashboard can filter by environment
- [ ] No raw IPs stored in database

## Security Checklist

- [ ] Never log raw IP addresses
- [ ] IP_HASH_SECRET is not committed to git
- [ ] Salt rotation is working
- [ ] Rate limiting is enabled
- [ ] Headers are validated before use
- [ ] No geo data leaks in client responses