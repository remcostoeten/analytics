# Visitor and Session ID Strategy

Owner: Remco
Status: Draft

## Overview

Client-side generated identifiers for tracking visitors and sessions without HTTP cookies, using browser storage APIs.

## Core Principles

- Cookie-free: No HTTP cookies
- Client-generated: UUIDs created in browser
- Storage: localStorage for visitor, sessionStorage for session
- Privacy: No cross-domain tracking
- Regeneration: Clear policies for ID rotation

## Visitor ID

### Purpose

Persistent identifier for a single browser on a device across multiple sessions.

### Generation

```typescript
// packages/sdk/src/visitor-id.ts
import { v4 as uuidv4 } from 'uuid'

const VISITOR_ID_KEY = 'remco_analytics_visitor_id'

export function getVisitorId(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  try {
    let visitorId = localStorage.getItem(VISITOR_ID_KEY)
    
    if (!visitorId) {
      visitorId = uuidv4()
      localStorage.setItem(VISITOR_ID_KEY, visitorId)
    }
    
    return visitorId
  } catch (error) {
    // localStorage might be blocked or unavailable
    // Generate ephemeral ID for this page load
    return uuidv4()
  }
}

export function resetVisitorId(): void {
  if (typeof window === 'undefined') {
    return
  }
  
  try {
    localStorage.removeItem(VISITOR_ID_KEY)
  } catch (error) {
    // Silently fail
  }
}
```

### Storage Details

- Key: `remco_analytics_visitor_id`
- Location: localStorage
- Lifetime: Survives browser restart
- Scope: Per origin (e.g., example.com)
- Size: 36 characters (UUID v4 format)
- Example: `550e8400-e29b-41d4-a716-446655440000`

### Persistence Behavior

| Action | Visitor ID |
|--------|-----------|
| Page reload | Preserved |
| Browser restart | Preserved |
| New tab | Same ID |
| Private/Incognito | New ID per session |
| Clear browsing data | Reset |
| Different subdomain | Different ID |

### Privacy Considerations

- No cross-domain tracking
- No cross-browser tracking
- No cross-device tracking
- User can clear localStorage to reset
- Incognito mode gets ephemeral ID

## Session ID

### Purpose

Temporary identifier for a single browsing session (tab lifetime).

### Generation

```typescript
// packages/sdk/src/session-id.ts
import { v4 as uuidv4 } from 'uuid'

const SESSION_ID_KEY = 'remco_analytics_session_id'
const SESSION_TIMEOUT_KEY = 'remco_analytics_session_timeout'
const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

export function getSessionId(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  try {
    const now = Date.now()
    const lastActivity = sessionStorage.getItem(SESSION_TIMEOUT_KEY)
    let sessionId = sessionStorage.getItem(SESSION_ID_KEY)
    
    // Check if session expired due to inactivity
    if (lastActivity && sessionId) {
      const elapsed = now - parseInt(lastActivity, 10)
      if (elapsed > SESSION_TIMEOUT_MS) {
        // Session expired, generate new one
        sessionId = null
      }
    }
    
    if (!sessionId) {
      sessionId = uuidv4()
      sessionStorage.setItem(SESSION_ID_KEY, sessionId)
    }
    
    // Update last activity timestamp
    sessionStorage.setItem(SESSION_TIMEOUT_KEY, now.toString())
    
    return sessionId
  } catch (error) {
    // sessionStorage might be blocked or unavailable
    return uuidv4()
  }
}

export function resetSessionId(): void {
  if (typeof window === 'undefined') {
    return
  }
  
  try {
    sessionStorage.removeItem(SESSION_ID_KEY)
    sessionStorage.removeItem(SESSION_TIMEOUT_KEY)
  } catch (error) {
    // Silently fail
  }
}
```

### Storage Details

- Key: `remco_analytics_session_id`
- Location: sessionStorage
- Lifetime: Tab lifetime, max 30 minutes inactivity
- Scope: Per origin per tab
- Size: 36 characters (UUID v4 format)

### Session Timeout Logic

- Default timeout: 30 minutes of inactivity
- Each event extends the session
- After 30 minutes idle, new session starts
- Closing tab ends session immediately

### Persistence Behavior

| Action | Session ID |
|--------|-----------|
| Page reload | Preserved |
| Browser restart | Reset |
| New tab | New ID |
| 30 min idle | Reset on next event |
| Tab close | Reset |
| Different subdomain | Different ID |

## SDK Integration

### Analytics Component

```typescript
// packages/sdk/src/analytics.tsx
import { useEffect } from 'react'
import { getVisitorId } from './visitor-id'
import { getSessionId } from './session-id'
import { trackPageView } from './track'

type AnalyticsProps = {
  projectId?: string
  ingestUrl?: string
}

export function Analytics({ projectId, ingestUrl }: AnalyticsProps) {
  useEffect(() => {
    const visitorId = getVisitorId()
    const sessionId = getSessionId()
    
    trackPageView({
      visitorId,
      sessionId,
      projectId,
      ingestUrl,
    })
  }, [projectId, ingestUrl])
  
  return null
}
```

### Track Function

```typescript
// packages/sdk/src/track.ts
import { getVisitorId } from './visitor-id'
import { getSessionId } from './session-id'

type TrackOptions = {
  visitorId?: string
  sessionId?: string
  projectId?: string
  ingestUrl?: string
}

export function track(
  eventType: string,
  meta?: Record<string, unknown>,
  options: TrackOptions = {}
) {
  const visitorId = options.visitorId || getVisitorId()
  const sessionId = options.sessionId || getSessionId()
  
  const payload = {
    type: eventType,
    visitorId,
    sessionId,
    projectId: options.projectId || window.location.hostname,
    path: window.location.pathname,
    referrer: document.referrer,
    origin: window.location.origin,
    host: window.location.hostname,
    ua: navigator.userAgent,
    lang: navigator.language,
    meta: meta || null,
  }
  
  const url = options.ingestUrl || 
    process.env.NEXT_PUBLIC_REMCO_ANALYTICS_URL ||
    'https://analytics-ingest.remcostoeten.com/ingest'
  
  // Use sendBeacon for reliability
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(payload)], {
      type: 'application/json',
    })
    navigator.sendBeacon(url, blob)
  } else {
    // Fallback to fetch with keepalive
    fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Silently fail
    })
  }
}

export function trackPageView(options: TrackOptions = {}) {
  track('pageview', undefined, options)
}
```

## Server-Side Handling

### Ingestion Storage

Store IDs exactly as received:

```typescript
// apps/ingestion/src/handlers/ingest.ts
async function handleIngest(req: Request) {
  const payload = await req.json()
  
  await db.insert(events).values({
    visitorId: payload.visitorId || null,
    sessionId: payload.sessionId || null,
    // ... other fields
  })
}
```

### No Server-Side Generation

- Server never generates visitor or session IDs
- Server accepts null values gracefully
- First-time visitors might have null IDs briefly

## Dashboard Queries

### Unique Visitors Estimate

```typescript
// apps/dashboard/src/queries/unique-visitors.ts
async function getUniqueVisitors(
  projectId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const result = await db
    .select({
      count: sql<number>`COUNT(DISTINCT visitor_id)`,
    })
    .from(events)
    .where(
      and(
        eq(events.projectId, projectId),
        gte(events.ts, startDate),
        lte(events.ts, endDate),
        isNotNull(events.visitorId)
      )
    )
  
  return result[0]?.count || 0
}
```

### Session Count Estimate

```typescript
// apps/dashboard/src/queries/sessions.ts
async function getSessionCount(
  projectId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const result = await db
    .select({
      count: sql<number>`COUNT(DISTINCT session_id)`,
    })
    .from(events)
    .where(
      and(
        eq(events.projectId, projectId),
        gte(events.ts, startDate),
        lte(events.ts, endDate),
        isNotNull(events.sessionId)
      )
    )
  
  return result[0]?.count || 0
}
```

### Average Session Duration

```typescript
// apps/dashboard/src/queries/session-duration.ts
async function getAverageSessionDuration(
  projectId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const result = await db
    .select({
      sessionId: events.sessionId,
      firstEvent: sql<Date>`MIN(ts)`,
      lastEvent: sql<Date>`MAX(ts)`,
    })
    .from(events)
    .where(
      and(
        eq(events.projectId, projectId),
        gte(events.ts, startDate),
        lte(events.ts, endDate),
        isNotNull(events.sessionId)
      )
    )
    .groupBy(events.sessionId)
  
  if (result.length === 0) {
    return 0
  }
  
  const totalDuration = result.reduce((sum, session) => {
    const duration = session.lastEvent.getTime() - session.firstEvent.getTime()
    return sum + duration
  }, 0)
  
  return Math.round(totalDuration / result.length / 1000) // seconds
}
```

## Edge Cases

### Storage Blocked

When localStorage or sessionStorage is unavailable:
- Generate ephemeral UUID for page load
- Analytics still works, but no persistence
- Each page load is treated as new visitor/session

```typescript
function safeGetStorage(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key)
  } catch (error) {
    // Safari private mode, browser restrictions
    return null
  }
}
```

### Server-Side Rendering

```typescript
// packages/sdk/src/analytics.tsx
export function Analytics({ projectId, ingestUrl }: AnalyticsProps) {
  useEffect(() => {
    // Only runs client-side
    if (typeof window === 'undefined') {
      return
    }
    
    const visitorId = getVisitorId()
    const sessionId = getSessionId()
    
    trackPageView({ visitorId, sessionId, projectId, ingestUrl })
  }, [projectId, ingestUrl])
  
  return null
}
```

### Multiple Tabs

- Each tab gets same visitor ID (localStorage is shared)
- Each tab gets unique session ID (sessionStorage is per-tab)
- This is expected behavior

### Incognito Mode

- localStorage/sessionStorage work but cleared on window close
- Each incognito window is isolated
- Treated as ephemeral visitor

## Testing Strategy

### Unit Tests

```typescript
// packages/sdk/src/__tests__/visitor-id.test.ts
import { getVisitorId, resetVisitorId } from '../visitor-id'

describe('getVisitorId', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  
  it('generates new UUID on first call', () => {
    const id = getVisitorId()
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
  })
  
  it('returns same ID on subsequent calls', () => {
    const id1 = getVisitorId()
    const id2 = getVisitorId()
    expect(id1).toBe(id2)
  })
  
  it('resets ID when requested', () => {
    const id1 = getVisitorId()
    resetVisitorId()
    const id2 = getVisitorId()
    expect(id1).not.toBe(id2)
  })
})
```

### Integration Tests

- Test SDK in real browser environment
- Verify localStorage persistence across reloads
- Verify sessionStorage cleared on tab close
- Test behavior when storage is blocked

## Migration Considerations

### Changing ID Format

If UUID format changes in future:
- Keep backward compatibility
- Accept both old and new formats
- Don't regenerate existing IDs

### Adding Timestamp

Future enhancement: store creation timestamp with ID

```typescript
type VisitorData = {
  id: string
  createdAt: number
}
```

## Privacy Controls

### User Opt-Out

```typescript
// packages/sdk/src/opt-out.ts
const OPT_OUT_KEY = 'remco_analytics_opt_out'

export function optOut(): void {
  if (typeof window === 'undefined') {
    return
  }
  
  localStorage.setItem(OPT_OUT_KEY, 'true')
  resetVisitorId()
  resetSessionId()
}

export function optIn(): void {
  if (typeof window === 'undefined') {
    return
  }
  
  localStorage.removeItem(OPT_OUT_KEY)
}

export function isOptedOut(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  
  return localStorage.getItem(OPT_OUT_KEY) === 'true'
}
```

### DNT Header Support

```typescript
// packages/sdk/src/track.ts
function shouldTrack(): boolean {
  // Respect Do Not Track
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') {
    return false
  }
  
  // Respect opt-out
  if (isOptedOut()) {
    return false
  }
  
  return true
}
```

## Acceptance Criteria

- [ ] Visitor ID persists across page reloads
- [ ] Session ID persists within tab lifetime
- [ ] Session ID resets after 30 minutes idle
- [ ] Storage blocked scenario handled gracefully
- [ ] SSR doesn't break (client-side only)
- [ ] Multiple tabs have same visitor ID
- [ ] Multiple tabs have different session IDs
- [ ] Dashboard queries use IDs correctly
- [ ] Opt-out mechanism works
- [ ] No HTTP cookies are used