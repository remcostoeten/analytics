# Dashboard Build Prompt

You are building a brand-new analytics dashboard for this product. Ignore any existing dashboard implementation. Assume you know nothing about the codebase unless explicitly stated below.

The UI direction is the attached reference image: a clean, enterprise-style operations dashboard with a left sidebar, top navigation, compact KPI cards, a large primary visualization area, and a right-side activity feed. The overall feel should be polished, dense, information-rich, and calm. Think modern internal tooling, not marketing site. Use a light neutral palette, subtle borders, restrained shadows, and clear hierarchy.

## Goal

Build the dashboard as the main analytics surface for the product. The dashboard should help a user understand:

- overall traffic volume
- visitor/session behavior
- top content
- referral sources
- geography
- bot traffic
- localhost/internal traffic
- ingestion health and event quality

The dashboard should feel like a live operations console, not a generic chart page.

## Product Context

This is an analytics system with a client SDK that sends events to an ingestion service. The dashboard reads from Postgres via Drizzle. The ingestion layer validates payloads, hashes IPs, detects bots, deduplicates events, and enriches records with geo and device data before inserting them.

The dashboard should not store data. It should only read and visualize what is already persisted.

## Exact Database Schema

Use this schema exactly. Do not invent extra tables or fields.

### `events`

```ts
events = pgTable(
  "events",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    projectId: text("project_id").notNull(),
    type: text("type").notNull().default("pageview"),
    ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
    path: text("path"),
    referrer: text("referrer"),
    origin: text("origin"),
    host: text("host"),
    isLocalhost: boolean("is_localhost").default(false),
    ua: text("ua"),
    lang: text("lang"),
    deviceType: text("device_type"),
    ipHash: text("ip_hash"),
    visitorId: text("visitor_id"),
    sessionId: text("session_id"),
    country: text("country"),
    region: text("region"),
    city: text("city"),
    meta: jsonb("meta")
  }
)
```

### `resume`

```ts
resume = pgTable("resume", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  event: text("event").notNull(),
  ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
  path: text("path"),
  referrer: text("referrer"),
  origin: text("origin"),
  host: text("host"),
  isLocalhost: boolean("is_localhost"),
  ua: text("ua"),
  lang: text("lang"),
  ipHash: text("ip_hash"),
  visitorId: text("visitor_id"),
  country: text("country"),
  region: text("region"),
  city: text("city"),
  deviceType: text("device_type"),
  resumeVersion: text("resume_version"),
  meta: jsonb("meta")
})
```

### `visitors`

```ts
visitors = pgTable(
  "visitors",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    fingerprint: text("fingerprint").notNull().unique(),
    firstSeen: timestamp("first_seen", { withTimezone: true }).notNull().defaultNow(),
    lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
    visitCount: integer("visit_count").notNull().default(1),
    deviceType: text("device_type"),
    os: text("os"),
    osVersion: text("os_version"),
    browser: text("browser"),
    browserVersion: text("browser_version"),
    screenResolution: text("screen_resolution"),
    timezone: text("timezone"),
    language: text("language"),
    country: text("country"),
    region: text("region"),
    city: text("city"),
    ipHash: text("ip_hash"),
    ua: text("ua"),
    meta: jsonb("meta")
  }
)
```

### `visitor_events`

```ts
visitorEvents = pgTable(
  "visitor_events",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    visitorId: bigint("visitor_id", { mode: "bigint" }).notNull().references(() => visitors.id),
    eventType: text("event_type").notNull(),
    ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
    path: text("path"),
    referrer: text("referrer"),
    sessionId: text("session_id"),
    durationMs: integer("duration_ms"),
    meta: jsonb("meta")
  }
)
```

## Ingestion and Derived Data

The ingestion service enriches raw events before insert. The dashboard should surface both raw and derived data when possible.

Derived or computed fields available in `events.meta`:

- `botDetected`
- `botReason`
- `botConfidence`
- `fingerprint`

Derived columns written directly to `events`:

- `ipHash`
- `country`
- `region`
- `city`
- `isLocalhost`
- `deviceType`

The dashboard should treat these as first-class analytics dimensions.

## Current Event Payload Shape

The SDK sends this payload shape to ingestion:

```ts
type EventPayload = {
  type: "pageview" | "event" | "click" | "error"
  projectId: string
  path: string
  referrer: string | null
  origin: string
  host: string
  ua: string
  lang: string
  visitorId: string
  sessionId: string
  meta?: Record<string, unknown>
}
```

## Metrics to Build

Use the following metrics and visualizations. Do not invent data that is not derivable from the schema.

### Core KPI cards

- Pageviews
- Unique visitors
- Sessions
- Events
- Bot rate
- Localhost rate
- Error count

### Trend charts

- Pageviews over time
- Unique visitors over time
- Sessions over time
- Events by type over time
- Bot vs human traffic over time

### Content and acquisition

- Top pages by views
- Top referrers by visits
- Entry pages
- Exit pages if derivable from event order

### Audience

- Geographic distribution by country
- Geographic distribution by region
- Geographic distribution by city
- Device type breakdown
- Browser breakdown if the `visitors` table is used
- OS breakdown if the `visitors` table is used
- Language breakdown
- Screen resolution breakdown if the `visitors` table is used

### Quality and operations

- Bot traffic volume
- Bot reasons
- Deduped event count
- Ingestion rate
- Error rate
- Localhost/internal traffic
- Event type mix

### Real-time live view

- Recent events stream
- Recent ingestion activity
- Live session count
- Live geo activity
- Live bot detections

## Recommended Dashboard Layout

Match the reference image structurally.

### Left sidebar

- Logo / product name
- Main section
- Live overview
- Streams
- Incidents
- Pipelines section
- Ingest
- HTTP API
- Webhooks
- Batch jobs
- Routing
- Audience section
- Segments
- Alerts
- Analytics section
- Explorer
- Reports
- Quotas
- Settings

### Top bar

- Live status pill
- Search box
- Tabs such as Live, Streams, Regions, Quality, Exports
- Time range selector
- Project selector

### Main content

- Top row of KPI cards
- Large primary visualization area
- Secondary panels for live stream, top pages, referrers, and geo
- Use dense spacing and clear data hierarchy

### Right rail

- Live signal stream
- Recent alerts
- Recent bot detections
- Recent ingest events

## Visual Design Requirements

- Light neutral UI
- Enterprise dashboard feel
- Subtle gray borders
- Minimal shadows
- Compact cards
- Tight but readable spacing
- Strong hierarchy for numbers
- Small status indicators
- Tables or list rows with clear separators
- Use charts sparingly and only where they add clarity
- Avoid decorative fluff
- Avoid generic SaaS purple
- Avoid playful styling
- The design should feel like a live ops console

## Interaction Requirements

- Support project switching
- Support time range switching
- Support bot and localhost filtering
- Support search/filtering of pages and referrers
- Support drill-down from aggregate metrics to underlying rows
- Support loading and empty states
- Support real-time refresh or polling for live sections

## Data Rules

- Never show raw IP addresses
- Use `ipHash` only if needed for dedupe/diagnostics
- Deduplicate repeated pageview spam in summaries
- Separate bot and human traffic when possible
- Treat localhost traffic as a separate filterable class
- Do not assume all events are pageviews
- Use `type` as a real dimension

## Implementation Expectations

- Build full page code, not snippets
- Use TypeScript
- Prefer boring reliability over abstraction
- Keep data logic separate from presentation
- Make the dashboard production-grade
- If a metric is not directly derivable, label it clearly as unavailable
- If a chart needs a fallback, show a clear empty state

## Output Expectation

Produce a dashboard that feels like the reference image, but powered by the exact analytics schema above. The result should be immediately useful for monitoring traffic, content, geography, bots, and ingestion health.
