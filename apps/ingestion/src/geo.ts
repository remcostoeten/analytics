// apps/ingestion/src/geo.ts

export type GeoData = {
  country: string | null
  region: string | null
  city: string | null
}

/**
 * Extract geographic data from Vercel edge headers
 */
function extractGeoFromVercelHeaders(headers: Headers): GeoData {
  const country = headers.get('x-vercel-ip-country')
  const region = headers.get('x-vercel-ip-country-region')
  const city = headers.get('x-vercel-ip-city')

  if (country) {
    return {
      country,
      region,
      city,
    }
  }

  return {
    country: null,
    region: null,
    city: null,
  }
}

/**
 * Extract geographic data from Cloudflare headers (fallback)
 */
function extractGeoFromCloudflareHeaders(headers: Headers): GeoData {
  const country = headers.get('cf-ipcountry')

  if (country && country !== 'XX') {
    return {
      country,
      region: null,
      city: null,
    }
  }

  return {
    country: null,
    region: null,
    city: null,
  }
}

/**
 * Extract geographic data from request headers
 * Tries Vercel headers first, then Cloudflare, then returns nulls
 */
export function extractGeoFromRequest(req: Request): GeoData {
  const headers = req.headers

  // Try Vercel headers first
  const vercelGeo = extractGeoFromVercelHeaders(headers)
  if (vercelGeo.country) {
    return vercelGeo
  }

  // Try Cloudflare headers as fallback
  const cfGeo = extractGeoFromCloudflareHeaders(headers)
  if (cfGeo.country) {
    return cfGeo
  }

  // No geo data available
  return {
    country: null,
    region: null,
    city: null,
  }
}

/**
 * Extract IP address from request headers
 * Tries multiple headers in order of preference
 */
export function extractIpAddress(req: Request): string | null {
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
    // Take first IP in chain (client IP)
    return forwarded.split(',')[0].trim()
  }

  // Local development
  return null
}

/**
 * Check if host is localhost
 */
export function isLocalhost(host: string | null): boolean {
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

/**
 * Check if environment is a preview deployment
 */
export function isPreviewEnvironment(host: string | null): boolean {
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
