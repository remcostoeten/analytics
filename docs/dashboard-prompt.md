# Dashboard Agent Context & Prompt

You are an AI assistant tasked with building a premium analytics dashboard. You have access to a PostgreSQL database via Drizzle ORM. Use this document as your source of truth for the data model and available query patterns.

---

## 1. Database Schema (`events` table)

The core data lives in the `events` table in PostgreSQL.

```typescript
export const events = pgTable("events", {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    projectId: text("project_id").notNull(),          // Site ID (e.g. skriuw.dev)
    type: text("type").notNull().default("pageview"), // pageview, event, click, error
    ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
    path: text("path"),                               // URL path
    referrer: text("referrer"),                       // Originating URL
    origin: text("origin"),
    host: text("host"),
    isLocalhost: boolean("is_localhost").default(false),
    ua: text("ua"),                                   // Raw User Agent
    lang: text("lang"),                               // Browser language
    deviceType: text("device_type"),                  // desktop, mobile, tablet
    visitorId: text("visitor_id"),                    // Persistent visitor UUID
    sessionId: text("session_id"),                    // 30m session UUID
    country: text("country"),                         // Geo-IP country code
    region: text("region"),
    city: text("city"),
    meta: jsonb("meta")                               // FLEXIBLE METADATA BLOB
})
```

---

## 2. Metadata Dictionary (`meta` JSONB)

Most advanced metrics (Performance, Engagement, Hardware) are stored in the `meta` blob. You query these using `sql\`${events.meta}->>'key'\``.

| Key | Type | Description |
|---|---|---|
| `browser` | string | Normalized browser name (Chrome, Safari, etc.) |
| `os` | string | Operating System (Mac OS, Windows, iOS,etc.) |
| `screenSize` | string | Hardware resolution (e.g. "1920x1080") |
| `viewport` | string | Current viewport size (e.g. "1440x900") |
| `utmSource` | string | Traffic source campaign |
| `eventName` | string | Discriminator for `type: 'event'`. Values: `web-vitals`, `scroll`, `time-on-page`. |

### Performance (`eventName: 'web-vitals'`)
- `ttfb`, `fcp`, `lcp`, `cls`, `inp` (numeric, ms)

### Engagement
- `depth` (numeric, 0-100) - Max scroll depth for `eventName: 'scroll'`.
- `timeOnPageMs` (numeric, ms) - Duration for `eventName: 'time-on-page'`.

---

## 3. Available Query API

The following functions are already implemented in `apps/dashboard/src/lib/queries.ts`. Use them as blueprints or call them directly.

### Core Metrics
- `fetchMetrics(projectId, range, filters)`: Returns standard KPIs (Views, Visitors, Sessions, Bounce Rate, Duration).
- `fetchTimeseries(projectId, range, granularity)`: Hourly/Daily pageview stats.

### Breakdowns (New)
- `fetchDeviceTypes(projectId, range)`
- `fetchBrowsers(projectId, range)`
- `fetchOperatingSystems(projectId, range)`
- `fetchLanguages(projectId, range)`
- `fetchScreenSizes(projectId, range)`
- `fetchGeo(projectId, range)`

### Drilldowns (Clickable Elements)
- `fetchCustomEvents(projectId, range)`: Groups by `meta->>'eventName'`.
- `fetchClickElements(projectId, range)`: Groups by `meta->>'elementName'`.
- `fetchErrors(projectId, range)`: Groups by error `message`.

### Real-time
- `fetchLiveVisitors(projectId)`: Distinct visitors in the last 5 minutes.
- `fetchNewVsReturning(projectId, range)`: Cohort analysis.

---

## 4. Implementation Guidelines

1. **Filtering**: Always use `rangeFilter(projectId, range, filters)` to handle robot exclusion and project scoping.
2. **Aggregations**: Use PostgreSQL `extract(epoch from ...)` for durations and `avg()` for vitals.
3. **JSONB Casting**: Remember to cast JSONB fields for numeric aggregation:
   `sql\`avg(cast(${events.meta}->>'ttfb' as float))\``
4. **Efficiency**: Use `count(distinct visitorId)` for absolute unique visitor counts.
