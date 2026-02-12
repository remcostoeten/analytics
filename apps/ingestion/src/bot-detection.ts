// apps/ingestion/src/bot-detection.ts

export type BotDetectionResult = {
  isBot: boolean
  reason: string | null
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Comprehensive list of bot patterns
 * Includes search engines, AI scrapers, headless browsers, and security scanners
 */
const BOT_PATTERNS = [
  // Generic bot indicators
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,

  // Search engines
  /googlebot/i,
  /bingbot/i,
  /slurp/i, // Yahoo
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /sogou/i,
  /exabot/i,

  // Social media crawlers
  /facebookexternalhit/i,
  /facebookcatalog/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /slackbot/i,
  /discordbot/i,

  // Monitoring and uptime
  /pingdom/i,
  /uptimerobot/i,
  /statuscake/i,
  /monitor/i,
  /newrelic/i,
  /datadog/i,

  // Headless browsers
  /headless/i,
  /phantom/i,
  /selenium/i,
  /webdriver/i,
  /puppeteer/i,
  /playwright/i,
  /chrome-lighthouse/i,

  // Security scanners
  /scanner/i,
  /nikto/i,
  /nmap/i,
  /masscan/i,
  /nessus/i,
  /acunetix/i,
  /qualys/i,

  // Command-line tools
  /curl/i,
  /wget/i,
  /python-requests/i,
  /python-urllib/i,
  /java\//i,
  /go-http-client/i,
  /okhttp/i,
  /apache-httpclient/i,

  // AI scrapers
  /gptbot/i,
  /chatgpt/i,
  /claude-web/i,
  /anthropic-ai/i,
  /cohere-ai/i,
  /perplexitybot/i,
  /ai2bot/i,
  /bytespider/i, // TikTok
  /claudebot/i,

  // SEO tools
  /ahrefsbot/i,
  /semrushbot/i,
  /mj12bot/i,
  /dotbot/i,
  /rogerbot/i,
  /screaming frog/i,

  // Content scrapers
  /feedfetcher/i,
  /feedparser/i,
  /rss/i,
  /aggregator/i,
  /newspaper/i,

  // Archive bots
  /archive\.org_bot/i,
  /ia_archiver/i,
  /wayback/i,
]

/**
 * Check if user agent matches known bot patterns
 */
export function isBotUserAgent(ua: string | null): boolean {
  if (!ua) {
    return false
  }

  return BOT_PATTERNS.some(pattern => pattern.test(ua))
}

/**
 * Check if request has Vercel bot header
 */
function isBotByVercelHeader(headers: Headers): boolean {
  const isBot = headers.get('x-vercel-bot')
  return isBot === '1' || isBot === 'true'
}

/**
 * Check if request has valid browser headers
 * Real browsers almost always send certain headers
 */
function hasValidBrowserHeaders(headers: Headers): boolean {
  const ua = headers.get('user-agent')
  const accept = headers.get('accept')
  const acceptLanguage = headers.get('accept-language')

  // Real browsers almost always send these
  if (!ua || !accept) {
    return false
  }

  // Real browsers send text/html in accept
  if (!accept.includes('text/html')) {
    return false
  }

  // Most real browsers send accept-language
  if (!acceptLanguage) {
    return false
  }

  return true
}

/**
 * Detect if request is from a bot
 * Uses multiple detection methods with confidence levels
 */
export function detectBot(req: Request): BotDetectionResult {
  const headers = req.headers
  const ua = headers.get('user-agent')

  // Check Vercel bot header (high confidence)
  if (isBotByVercelHeader(headers)) {
    return {
      isBot: true,
      reason: 'vercel-bot-header',
      confidence: 'high',
    }
  }

  // Check user agent patterns (high confidence)
  if (isBotUserAgent(ua)) {
    return {
      isBot: true,
      reason: 'bot-user-agent',
      confidence: 'high',
    }
  }

  // Check for missing browser headers (medium confidence)
  if (!hasValidBrowserHeaders(headers)) {
    return {
      isBot: true,
      reason: 'invalid-headers',
      confidence: 'medium',
    }
  }

  // Not detected as bot
  return {
    isBot: false,
    reason: null,
    confidence: 'low',
  }
}

/**
 * Classify device type from user agent
 */
export function classifyDevice(ua: string | null, isBot: boolean = false): string {
  if (!ua) {
    return 'unknown'
  }

  // Bots override device classification
  if (isBot) {
    return 'bot'
  }

  const lower = ua.toLowerCase()

  // Tablets (check before mobile since some include 'android')
  if (
    lower.includes('ipad') ||
    lower.includes('tablet')
  ) {
    return 'tablet'
  }

  // Android tablets (has android but not mobile)
  if (lower.includes('android') && !lower.includes('mobile')) {
    return 'tablet'
  }

  // Mobile devices
  if (
    lower.includes('mobile') ||
    lower.includes('android') ||
    lower.includes('iphone') ||
    lower.includes('ipod') ||
    lower.includes('blackberry') ||
    lower.includes('windows phone')
  ) {
    return 'mobile'
  }

  // Desktop
  if (
    lower.includes('windows') ||
    lower.includes('macintosh') ||
    lower.includes('linux') ||
    lower.includes('x11')
  ) {
    return 'desktop'
  }

  return 'unknown'
}
