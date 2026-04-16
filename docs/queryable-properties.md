# Analytics Platform - Queryable Properties Reference

This document maps out every single property available for you to query and build UI around in your external dashboard, breaking down the structured Postgres schema and the flexible `meta` payload.

---

## 1. Top-Level DB Columns (`events` table)

These columns are fully indexed (where appropriate) and natively typed in Drizzle.

| Column | Type | Description |
|---|---|---|
| `id` | `bigint` | Primary Key. |
| `projectId` | `string` | The site identifier (e.g., `skriuw.vercel.app`). Filter by this for all queries. |
| `type` | `string` | Primary event category. Allowed values: `pageview`, `event`, `click`, `error`, `scroll`, `time-on-page`, `web-vitals`. |
| `ts` | `timestamp` | Exact time the event hit the ingestion server. |
| `path` | `string` | The URL path (e.g., `/pricing`). Useful for top pages and entry/exit mapping. |
| `referrer` | `string` | Where the user came from (e.g., `https://google.com`). |
| `origin` | `string` | The exact protocol+domain origin. |
| `host` | `string` | The domain host. |
| `isLocalhost` | `boolean` | Flag generated at ingestion to filter out dev traffic (`true` or `false`). |
| `ua` | `string` | Raw User-Agent string. *(See `meta` for the parsed breakdown).* |
| `lang` | `string` | Raw language string from browser (`en-US`, `nl-NL`). |
| `deviceType` | `string` | Parsed device classification (`mobile`, `tablet`, `desktop`, `bot`, `unknown`). |
| `visitorId` | `string` | Unique client UUID (persisted in localStorage). |
| `sessionId` | `string` | Unique session UUID (persisted in sessionStorage, 30m timeout). |
| `country` | `string` | Geo country code (e.g., `US`, `NL`). |
| `region` | `string` | Geo region code. |
| `city` | `string` | Geo city name. |
| `ipHash` | `string` | SHA-256 hash of the IP (used for rate limiting, never raw). |

---

## 2. Dynamic Payload (`meta` JSONB column)

The `meta` column holds rich data without requiring rigid schema migrations. You query these in Drizzle using the `->>` JSON text-extraction operator: `sql\`${events.meta}->>'propertyName'\``.

### A. Bot & Forensics (Attached by Ingestion via `ua-parser-js` / logic)
| Meta Key | Example Value | Query String |
|---|---|---|
| `botDetected` | `true` or `false` | `sql\`${events.meta}->>'botDetected'\`` |
| `botReason` | `'vercel-bot-header'`, `'bot-user-agent'`, `'invalid-headers'` | `sql\`${events.meta}->>'botReason'\`` |
| `botConfidence`| `'high'`, `'medium'`, `'low'` | `sql\`${events.meta}->>'botConfidence'\`` |
| `browser` | `'Chrome'`, `'Safari'` | `sql\`${events.meta}->>'browser'\`` |
| `browserVersion`| `'120.0.0'` | `sql\`${events.meta}->>'browserVersion'\`` |
| `os` | `'Mac OS'`, `'Windows'`, `'iOS'`| `sql\`${events.meta}->>'os'\`` |
| `osVersion` | `'14.0'` | `sql\`${events.meta}->>'osVersion'\`` |
| `fingerprint` | `'abc123sha256hash...'` | `sql\`${events.meta}->>'fingerprint'\`` |

### B. Viewport & Network (Attached by SDK on every valid event)
| Meta Key | Example Value | Query String |
|---|---|---|
| `screenSize` | `'1920x1080'` | `sql\`${events.meta}->>'screenSize'\`` |
| `viewport` | `'1440x900'` | `sql\`${events.meta}->>'viewport'\`` |
| `pixelRatio` | `2` | `sql\`${events.meta}->>'pixelRatio'\`` |
| `connectionType`| `'4g'`, `'wifi'` | `sql\`${events.meta}->>'connectionType'\`` |
| `connectionDownlink`| `10.5` (Mbps approximation) | `sql\`${events.meta}->>'connectionDownlink'\`` |

### C. UTM Campaigns (Attached by SDK when present in URL params)
| Meta Key | Example Value | Query String |
|---|---|---|
| `utmSource` | `'twitter'`, `'newsletter_oct'`| `sql\`${events.meta}->>'utmSource'\`` |
| `utmMedium` | `'social'`, `'email'` | `sql\`${events.meta}->>'utmMedium'\`` |
| `utmCampaign` | `'black_friday'` | `sql\`${events.meta}->>'utmCampaign'\`` |
| `utmContent` | `'hero_banner'` | `sql\`${events.meta}->>'utmContent'\`` |
| `utmTerm` | `'b2b_saas'` | `sql\`${events.meta}->>'utmTerm'\`` |

### D. Specific Event Type Context
Depending on the `type` column, different metadata fields will be populated natively by the SDK:

**When `type = 'event'` (Custom & Automated Events)**
- `eventName`: The string discriminator (e.g., `web-vitals`, `time-on-page`, `scroll`, or custom triggers).
  - *If `eventName = 'time-on-page'`*: `timeOnPageMs` (number, milliseconds).
  - *If `eventName = 'scroll'`*: `depth` (number, max percent scrolled, e.g., `85`).
  - *If `eventName = 'web-vitals'`*: `ttfb`, `fcp`, `lcp`, `cls`, `inp` (numbers, milliseconds).

**When `type = 'click'`**
- `elementName`: The name, tag, or path of what was clicked.

**When `type = 'error'`**
- `message`: The raw Error.message string.
- `stack`: The full stack trace.

---

## 3. How to use this in Drizzle

To query a specific JSON key cleanly inside your external dashboard, use the `sql` template literal string syntax.

**Example 1: Break down traffic by Browser OS**
```typescript
const result = await db.select({
  osName: sql<string>\`${events.meta}->>'os'\`,
  count: sql<number>\`count(*)\`
})
.from(events)
.where(isNotNull(sql\`${events.meta}->>'os'\`))
.groupBy(sql\`${events.meta}->>'os'\`)
```

**Example 2: Discover exact time users spend on a specific page**
```typescript
const result = await db.select({
  avgTimeMs: sql<number>\`avg(cast(${events.meta}->>'timeOnPageMs' as float))\`
})
.from(events)
.where(and(
  eq(events.type, 'event'),
  eq(sql\`${events.meta}->>'eventName'\`, 'time-on-page'),
  eq(events.path, '/pricing')
))
```
