# Bot Filtering and Traffic Quality

Owner: Remco
Status: Draft

## Overview

Strategy for identifying and filtering bot traffic to maintain analytics data quality without blocking legitimate automated tools.

## Philosophy

- Start permissive, refine over time
- Block obvious spam bots
- Allow search engine crawlers (they don't execute JS anyway)
- Allow monitoring tools (Uptime Robot, etc.)
- Log suspected bots for review before blocking

## Detection Methods

### Method 1: User Agent Analysis

Primary method for bot detection.

```typescript
// apps/ingestion/src/bot-detection.ts
const BOT_PATTERNS = [
  // Obvious bots
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  
  // Search engines
  /googlebot/i,
  /bingbot/i,
  /slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  
  // Social media crawlers
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /telegrambot/i,
  
  // Monitoring and uptime
  /pingdom/i,
  /uptimerobot/i,
  /statuscake/i,
  /monitor/i,
  
  // Headless browsers
  /headless/i,
  /phantom/i,
  /selenium/i,
  /webdriver/i,
  /puppeteer/i,
  /playwright/i,
  
  // Security scanners
  /scanner/i,
  /nikto/i,
  /nmap/i,
  /masscan/i,
  /nessus/i,
  
  // Misc automated tools
  /curl/i,
  /wget/i,
  /python-requests/i,
  /java\//i,
  /go-http-client/i,
  /okhttp/i,
  
  // AI scrapers
  /gptbot/i,
  /chatgpt/i,
  /claude-web/i,
  /anthropic-ai/i,
  /cohere-ai/i,
  /perplexitybot/i,
  /ai2bot/i,
]

export function isBotUserAgent(ua: string | null): boolean {
  if (!ua) {
    return false
  }
  
  return BOT_PATTERNS.some(pattern => pattern.test(ua))
}
```

### Method 2: Vercel Bot Header

Vercel provides bot detection via header.

```typescript
function isBotByVercelHeader(headers: Headers): boolean {
  const isBot = headers.get('x-vercel-bot')
  return isBot === '1' || isBot === 'true'
}
```

### Method 3: Missing Critical Headers

Real browsers send certain headers that bots often omit.

```typescript
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
```

### Method 4: JavaScript Execution Detection

Bots that don't execute JavaScript won't send events from SDK.

```typescript
// This happens automatically - if the SDK runs, JS executed
// No additional logic needed, but worth noting
```

### Method 5: Behavioral Signals

Patterns that suggest bot behavior.

```typescript
type BehaviorSignals = {
  eventsPerMinute: number
  uniquePaths: number
  sessionDuration: number
}

function isSuspiciousBehavior(signals: BehaviorSignals): boolean {
  // More than 60 events per minute
  if (signals.eventsPerMinute > 60) {
    return true
  }
  
  // Visited more than 100 unique paths in session
  if (signals.uniquePaths > 100) {
    return true
  }
  
  // Session shorter than 1 second with multiple events
  if (signals.sessionDuration < 1000 && signals.eventsPerMinute > 10) {
    return true
  }
  
  return false
}
```

## Complete Bot Detection Function

```typescript
// apps/ingestion/src/bot-detection.ts
export type BotDetectionResult = {
  isBot: boolean
  reason: string | null
  confidence: 'high' | 'medium' | 'low'
}

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
```

## Bot Handling Strategy

### MVP Approach: Store All, Tag Bots

Don't reject bot traffic initially, tag it for filtering later.

```typescript
// apps/ingestion/src/handlers/ingest.ts
async function handleIngest(req: Request) {
  const payload = await req.json()
  const botResult = detectBot(req)
  
  // Classify device type
  let deviceType = classifyDevice(payload.ua)
  if (botResult.isBot) {
    deviceType = 'bot'
  }
  
  const event = {
    ...payload,
    deviceType,
    meta: {
      ...payload.meta,
      botDetected: botResult.isBot,
      botReason: botResult.reason,
      botConfidence: botResult.confidence,
    },
  }
  
  await db.insert(events).values(event)
  
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json' },
  })
}
```

### Future: Reject High-Confidence Bots

After validating bot detection works:

```typescript
async function handleIngest(req: Request) {
  const botResult = detectBot(req)
  
  // Reject obvious bots
  if (botResult.isBot && botResult.confidence === 'high') {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, // Return 200 to not reveal bot detection
      headers: { 'content-type': 'application/json' },
    })
  }
  
  // Process normally
}
```

## Device Classification

```typescript
// apps/ingestion/src/device-classification.ts
export function classifyDevice(ua: string | null): string {
  if (!ua) {
    return 'unknown'
  }
  
  const lower = ua.toLowerCase()
  
  // Check for bot first
  if (isBotUserAgent(ua)) {
    return 'bot'
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
  
  // Tablets
  if (
    lower.includes('ipad') ||
    lower.includes('tablet') ||
    (lower.includes('android') && !lower.includes('mobile'))
  ) {
    return 'tablet'
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
```

## Dashboard Filtering

### Default View: Exclude Bots

```typescript
// apps/dashboard/src/queries/events.ts
type EventFilters = {
  projectId: string
  startDate: Date
  endDate: Date
  includeBots?: boolean
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
  
  // Exclude bots by default
  if (!filters.includeBots) {
    query = query.where(ne(events.deviceType, 'bot'))
  }
  
  return query
}
```

### Toggle for Including Bots

```typescript
// apps/dashboard/src/components/filter-panel.tsx
export function FilterPanel() {
  const [includeBots, setIncludeBots] = useState(false)
  
  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={includeBots}
          onChange={(e) => setIncludeBots(e.target.checked)}
        />
        Include bot traffic
      </label>
    </div>
  )
}
```

## Known Good Bots

Some bots should never be filtered in analytics.

```typescript
const ALLOWED_BOTS = [
  // Search engine bots (for SEO verification)
  /googlebot/i,
  /bingbot/i,
  
  // Social media preview bots (for sharing metrics)
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
]

export function isAllowedBot(ua: string | null): boolean {
  if (!ua) {
    return false
  }
  
  return ALLOWED_BOTS.some(pattern => pattern.test(ua))
}
```

## Honeypot Endpoints

Detect bots that crawl everything.

```typescript
// apps/ingestion/src/app.ts
app.get('/wp-admin', (c) => {
  // WordPress admin page that doesn't exist
  // Real users won't access this, bots will
  const ip = extractIpAddress(c.req.raw)
  const ipHash = hashIp(ip)
  
  // Mark this IP as suspicious
  markIpAsSuspicious(ipHash)
  
  return c.text('Not found', 404)
})

app.get('/admin', (c) => {
  const ip = extractIpAddress(c.req.raw)
  const ipHash = hashIp(ip)
  markIpAsSuspicious(ipHash)
  return c.text('Not found', 404)
})
```

## Rate Limiting Bot Traffic

More aggressive rate limiting for detected bots.

```typescript
function getRateLimitForRequest(req: Request): number {
  const botResult = detectBot(req)
  
  if (botResult.isBot && botResult.confidence === 'high') {
    return 10 // 10 requests per minute
  }
  
  return 100 // Normal rate limit
}
```

## Monitoring Bot Traffic

### Dashboard Widget

Show bot traffic percentage:

```typescript
// apps/dashboard/src/queries/bot-stats.ts
async function getBotTrafficPercentage(
  projectId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const total = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(events)
    .where(
      and(
        eq(events.projectId, projectId),
        gte(events.ts, startDate),
        lte(events.ts, endDate)
      )
    )
  
  const bots = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(events)
    .where(
      and(
        eq(events.projectId, projectId),
        gte(events.ts, startDate),
        lte(events.ts, endDate),
        eq(events.deviceType, 'bot')
      )
    )
  
  const totalCount = total[0]?.count || 0
  const botCount = bots[0]?.count || 0
  
  if (totalCount === 0) {
    return 0
  }
  
  return Math.round((botCount / totalCount) * 100)
}
```

### Alert on Bot Spike

```typescript
async function checkBotSpike(projectId: string): Promise<boolean> {
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const percentage = await getBotTrafficPercentage(
    projectId,
    last24h,
    new Date()
  )
  
  // Alert if more than 50% bot traffic
  return percentage > 50
}
```

## Testing Bot Detection

### Unit Tests

```typescript
// apps/ingestion/src/__tests__/bot-detection.test.ts
import { isBotUserAgent, detectBot } from '../bot-detection'

describe('isBotUserAgent', () => {
  it('detects googlebot', () => {
    const ua = 'Mozilla/5.0 (compatible; Googlebot/2.1)'
    expect(isBotUserAgent(ua)).toBe(true)
  })
  
  it('detects headless chrome', () => {
    const ua = 'Mozilla/5.0 HeadlessChrome/91.0'
    expect(isBotUserAgent(ua)).toBe(true)
  })
  
  it('allows real browsers', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    expect(isBotUserAgent(ua)).toBe(false)
  })
  
  it('detects curl', () => {
    const ua = 'curl/7.64.1'
    expect(isBotUserAgent(ua)).toBe(true)
  })
})
```

### Integration Tests

```typescript
// Test with real bot user agents
const botUserAgents = [
  'Googlebot/2.1',
  'curl/7.64.1',
  'python-requests/2.28.0',
  'HeadlessChrome/91.0',
]

botUserAgents.forEach(ua => {
  test(`Detects bot: ${ua}`, async () => {
    const response = await fetch('http://localhost:3000/ingest', {
      method: 'POST',
      headers: {
        'user-agent': ua,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ type: 'pageview', path: '/' }),
    })
    
    expect(response.ok).toBe(true)
    
    // Verify deviceType is 'bot' in database
  })
})
```

## False Positive Handling

### Whitelist Known Tools

```typescript
const WHITELISTED_PATTERNS = [
  // Developer tools that should be allowed
  /firefox/i,
  /chrome/i,
  /safari/i,
  /edge/i,
]

function isWhitelisted(ua: string | null): boolean {
  if (!ua) {
    return false
  }
  
  return WHITELISTED_PATTERNS.some(pattern => pattern.test(ua))
}
```

### Manual Override

Allow manual bot classification in dashboard:

```typescript
// apps/dashboard/src/actions/override-bot-status.ts
async function overrideBotStatus(
  eventId: bigint,
  isBot: boolean
): Promise<void> {
  await db
    .update(events)
    .set({
      deviceType: isBot ? 'bot' : 'desktop',
      meta: sql`jsonb_set(meta, '{botOverride}', 'true'::jsonb)`,
    })
    .where(eq(events.id, eventId))
}
```

## Performance Considerations

### Cache Bot Detection Results

```typescript
const botCache = new Map<string, BotDetectionResult>()

export function detectBotCached(req: Request): BotDetectionResult {
  const ua = req.headers.get('user-agent') || ''
  
  if (botCache.has(ua)) {
    return botCache.get(ua)!
  }
  
  const result = detectBot(req)
  botCache.set(ua, result)
  
  // Limit cache size
  if (botCache.size > 10000) {
    const firstKey = botCache.keys().next().value
    botCache.delete(firstKey)
  }
  
  return result
}
```

## Acceptance Criteria

- [ ] Bot detection function implemented
- [ ] User agent patterns cover common bots
- [ ] Vercel bot header is checked
- [ ] Device type classification works
- [ ] Bots are tagged in database
- [ ] Dashboard filters exclude bots by default
- [ ] Dashboard shows bot traffic percentage
- [ ] Rate limiting is stricter for bots
- [ ] Unit tests for bot detection pass
- [ ] No false positives for major browsers

## Future Enhancements

- Machine learning based bot detection
- Behavioral analysis over time
- IP reputation scoring
- Challenge-response for suspicious traffic
- CAPTCHA integration for extreme cases