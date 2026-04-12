/**
 * Generate daily salt from IP_HASH_SECRET + current date
 * This ensures same IP gets same hash within a day, but different hash on different days
 */
async function getDailySalt(): Promise<string> {
  const today = new Date().toISOString().split('T')[0]
  const secret = process.env.IP_HASH_SECRET || 'default-secret-change-me'

  if (secret === 'default-secret-change-me' && process.env.NODE_ENV === 'production') {
    console.warn('WARNING: Using default IP_HASH_SECRET in production!')
  }

  const msgUint8 = new TextEncoder().encode(secret + today)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Hash IP address with daily salt rotation
 * Returns null if IP is null or undefined
 * Uses SHA-256 for security
 */
export async function hashIp(ip: string | null): Promise<string | null> {
  if (!ip) {
    return null
  }

  const salt = await getDailySalt()
  const msgUint8 = new TextEncoder().encode(ip + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}


/**
 * Validate that IP_HASH_SECRET is set in production
 */
export function validateIpHashSecret(): boolean {
  const secret = process.env.IP_HASH_SECRET

  if (!secret) {
    return false
  }

  if (secret === 'default-secret-change-me') {
    return false
  }

  if (secret.length < 32) {
    console.warn('IP_HASH_SECRET should be at least 32 characters for security')
    return false
  }

  return true
}
