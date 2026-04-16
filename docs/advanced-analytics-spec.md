# Advanced Analytics Specification

**Target Audience:** Dashboard Developers & AI Agents  
**Architecture Theme:** Single-Table Event Sourcing.  
All analytical metrics in this platform are exclusively driven by the `events` table in PostgreSQL. Instead of bloating the schema with normalized tables for transactions, search logs, and funnel stages, we leverage an event-sourcing architectural pattern. Every action is a discrete `event` with a strictly flat indexed schema, whilst complex unstructured payloads (like revenue, experiment variations, and custom segment properties) are dumped into the highly queryable `meta` JSONB column.

---

## 1. Funnel & Conversion Tracking

### The Payload Format
Track conversion steps precisely using `trackEvent()` natively from the SDK.
```typescript
import { trackEvent } from "@remcostoeten/analytics";

trackEvent("signup", { plan: "pro" });
trackEvent("purchase", { revenue: 99.00, method: "stripe" });
```

### Database Schema Target
- **Filter**: `type = 'event'`
- **Target**: `meta->>'eventName' IN ('signup', 'purchase')`

### How To Aggregate (Drizzle SQL)
Calculating exact conversions in sequence per session.
```typescript
export async function fetchConversionFunnel(projectId: string, range: DateRange) {
  const result = await db.execute(sql`
    WITH funnel AS (
      SELECT session_id,
        MIN(CASE WHEN path = '/pricing' THEN ts END) as step1_time,
        MIN(CASE WHEN meta->>'eventName' = 'signup' THEN ts END) as step2_time,
        MIN(CASE WHEN meta->>'eventName' = 'purchase' THEN ts END) as step3_time
      FROM ${events}
      WHERE project_id = ${projectId} AND ts BETWEEN ${range.start} AND ${range.end}
      GROUP BY session_id
    )
    SELECT 
      COUNT(step1_time) as step1_users,
      COUNT(step2_time) FILTER (WHERE step2_time >= step1_time) as step2_users,
      COUNT(step3_time) FILTER (WHERE step3_time >= step2_time) as step3_users,
      AVG(EXTRACT(EPOCH FROM (step3_time - step1_time))) as avg_time_to_conversion_seconds
    FROM funnel;
  `);
  return result.rows[0];
}
```

---

## 2. User Journey & Path Analysis

### The Payload Format
Automatically handled by `<Analytics />` via `pageview` tracking.

### Database Schema Target
- **Filter**: `type = 'pageview'`
- **Target**: `path`, ordered by `ts`, grouped by `sessionId`.

### How To Aggregate (Drizzle SQL)
Find the top 20 most frequent sequence of 3 pages users navigate.
```typescript
export async function fetchCommonPaths(projectId: string, range: DateRange) {
  const result = await db.execute(sql`
    WITH paths AS (
      SELECT session_id,
        path as step1,
        LEAD(path, 1) OVER(PARTITION BY session_id ORDER BY ts) as step2,
        LEAD(path, 2) OVER(PARTITION BY session_id ORDER BY ts) as step3
      FROM ${events}
      WHERE project_id = ${projectId} AND type = 'pageview' AND ts BETWEEN ${range.start} AND ${range.end}
    )
    SELECT step1, step2, step3, COUNT(*) as frequency
    FROM paths
    WHERE step1 IS NOT NULL AND step2 IS NOT NULL
    GROUP BY step1, step2, step3
    ORDER BY frequency DESC
    LIMIT 20;
  `);
  return result.rows;
}
```

---

## 3. Cohort & Retention Analysis

### The Payload Format
Automatically handled (relies on `visitorId` injection from SDK).

### Database Schema Target
- **Target**: Count distinct `visitorId`, bounded by `ts`.

### How To Aggregate (Drizzle SQL)
Daily/Weekly retention by cohort (1st seen to returning activity).
```typescript
export async function fetchWeeklyRetention(projectId: string) {
  const result = await db.execute(sql`
    WITH user_cohorts AS (
      SELECT visitor_id, DATE_TRUNC('week', MIN(ts)) AS cohort_week
      FROM ${events} 
      WHERE project_id = ${projectId}
      GROUP BY visitor_id
    ),
    active_weeks AS (
      SELECT DISTINCT e.visitor_id, DATE_TRUNC('week', e.ts) AS active_week
      FROM ${events} e
      WHERE project_id = ${projectId}
    )
    SELECT 
      c.cohort_week,
      EXTRACT(DAY FROM (a.active_week - c.cohort_week))/7 AS weeks_since_signup,
      COUNT(DISTINCT c.visitor_id) AS retained_users
    FROM user_cohorts c
    JOIN active_weeks a ON c.visitor_id = a.visitor_id
    GROUP BY c.cohort_week, weeks_since_signup
    ORDER BY c.cohort_week DESC, weeks_since_signup ASC;
  `);
  return result.rows;
}
```

---

## 4. Real-Time Data

### The Payload Format
Continuous automatic SDK pings.

### Database Schema Target
- Timeframe constraint on `ts`.

### How To Aggregate (Drizzle SQL)
Active pages with live visitors in the last 5 minutes.
```typescript
export async function fetchLiveActivePages(projectId: string) {
  return db.select({
      path: events.path,
      activeVisitors: sql<number>\`COUNT(DISTINCT \${events.visitorId})\`
    })
    .from(events)
    .where(and(
      eq(events.projectId, projectId), 
      gte(events.ts, sql\`NOW() - INTERVAL '5 minutes'\`),
      eq(events.type, 'pageview')
    ))
    .groupBy(events.path)
    .orderBy(desc(sql\`COUNT(DISTINCT \${events.visitorId})\`));
}
```

---

## 5. Error & Exception Tracking

### The Payload Format
Triggered automatically via `.catch()` blocks using the SDK.
```typescript
import { trackError } from "@remcostoeten/analytics";
try { throw new Error("API Timeout"); } catch (e) { trackError(e as Error); }
```

### Database Schema Target
- **Filter**: `type = 'error'`
- **Target**: `meta->>'message'`, `meta->>'stack'`, `meta->>'browser'`

### How To Aggregate (Drizzle SQL)
Error impact (which messages affect most users).
```typescript
export async function fetchErrorImpact(projectId: string, range: DateRange) {
  return db.select({
      message: sql<string>\`\${events.meta}->>'message'\`,
      occurrenceCount: sql<number>\`COUNT(*)\`,
      affectedUsers: sql<number>\`COUNT(DISTINCT \${events.visitorId})\`
    })
    .from(events)
    .where(and(
      eq(events.projectId, projectId),
      eq(events.type, 'error'),
      isNotNull(sql\`\${events.meta}->>'message'\`),
      gte(events.ts, range.start),
      lte(events.ts, range.end)
    ))
    .groupBy(sql\`\${events.meta}->>'message'\`)
    .orderBy(desc(sql\`COUNT(DISTINCT \${events.visitorId})\`));
}
```

---

## 6. Custom Events & Properties

### The Payload Format
Extensible generic events.
```typescript
trackEvent("video_played", { videoId: "xyz", category: "tutorial" });
```

### Database Schema Target
- **Filter**: `type = 'event'`, `meta->>'eventName' = 'video_played'`

### How To Aggregate (Drizzle SQL)
Property breakdown of a specific event type.
```typescript
export async function fetchCustomEventPropertyBreakdown(projectId: string, eventName: string, propertyKey: string, range: DateRange) {
  return db.select({
      propertyValue: sql<string>\`\${events.meta}->>\${propertyKey}\`,
      count: sql<number>\`COUNT(*)\`
    })
    .from(events)
    .where(and(
      eq(events.projectId, projectId),
      eq(events.type, 'event'),
      eq(sql\`\${events.meta}->>'eventName'\`, eventName),
      gte(events.ts, range.start),
      lte(events.ts, range.end)
    ))
    .groupBy(sql\`\${events.meta}->>\${propertyKey}\`)
    .orderBy(desc(sql\`COUNT(*)\`));
}
```

---

## 7. Search Analytics

### The Payload Format
Push directly via frontend input forms.
```typescript
trackEvent("site_search", { query: "dark mode", resultCount: 0 });
```

### Database Schema Target
- **Target**: `meta->>'query'`, `meta->>'resultCount'`

### How To Aggregate (Drizzle SQL)
Identify zero-result searches.
```typescript
export async function fetchZeroResultSearches(projectId: string, range: DateRange) {
  return db.select({
      query: sql<string>\`LOWER(\${events.meta}->>'query')\`,
      searches: sql<number>\`COUNT(*)\`
    })
    .from(events)
    .where(and(
      eq(events.projectId, projectId),
      eq(sql\`\${events.meta}->>'eventName'\`, 'site_search'),
      eq(sql\`\${events.meta}->>'resultCount'\`, '0'),
      gte(events.ts, range.start),
      lte(events.ts, range.end)
    ))
    .groupBy(sql\`LOWER(\${events.meta}->>'query')\`)
    .orderBy(desc(sql\`COUNT(*)\`));
}
```

---

## 8. Revenue & E-commerce

### The Payload Format
Send at post-checkout resolution.
```typescript
trackEvent("transaction", { orderId: "ORD-99", revenue: 149.99, currency: "USD", items: 3 });
```

### Database Schema Target
- **Target**: Typecast `meta->>'revenue'` to numerical values.

### How To Aggregate (Drizzle SQL)
Average Order Value and Session Gross.
```typescript
export async function fetchEcommerceMetrics(projectId: string, range: DateRange) {
  const result = await db.execute(sql`
    SELECT 
      COUNT(*) as total_orders,
      SUM(CAST(meta->>'revenue' AS numeric)) as total_revenue,
      AVG(CAST(meta->>'revenue' AS numeric)) as average_order_value,
      SUM(CAST(meta->>'items' AS numeric)) as total_items_sold
    FROM ${events}
    WHERE project_id = ${projectId} 
      AND meta->>'eventName' = 'transaction'
      AND ts BETWEEN ${range.start} AND ${range.end}
  `);
  return result.rows[0];
}
```

---

## 9. A/B Testing & Feature Flags

### The Payload Format
Merge experiments universally across pageviews so every behavior metric carries its context.
```typescript
// During SDK initialization or route load
trackPageView({ experiments: { "pricing_tab_color": "green_variant" } });
```

### Database Schema Target
- **Target**: Join behavior against the `experiments` json depth.

### How To Aggregate (Drizzle SQL)
Variant conversion performance.
```typescript
export async function fetchVariantConversion(projectId: string, experimentKey: string) {
  const result = await db.execute(sql`
    WITH exposures AS (
      SELECT session_id, meta->'experiments'->>${experimentKey} AS variant
      FROM ${events} 
      WHERE project_id = ${projectId} AND meta->'experiments'->>${experimentKey} IS NOT NULL
    ),
    conversions AS (
      SELECT DISTINCT session_id FROM ${events} WHERE meta->>'eventName' = 'purchase'
    )
    SELECT e.variant, 
      COUNT(DISTINCT e.session_id) as total_exposed,
      COUNT(DISTINCT c.session_id) as total_converted,
      (COUNT(DISTINCT c.session_id)::float / COUNT(DISTINCT e.session_id)::float) * 100 as conversion_rate
    FROM exposures e
    LEFT JOIN conversions c ON e.session_id = c.session_id
    GROUP BY e.variant;
  `);
  return result.rows;
}
```

---

## 10. Advanced Segmentation

### The Payload Format
Define user permanent traits when tracked.
```typescript
trackEvent("login", { userProperties: { role: "admin", plan: "pro" } });
```

### Database Schema Target
- Wrap KPI queries using generic equality filters extracting JSON text.

### How To Aggregate (Drizzle SQL)
```typescript
export async function fetchSegmentedBounceRate(projectId: string, planType: string) {
  const result = await db.execute(sql`
    WITH session_stats AS (
      SELECT session_id,
        COUNT(*) FILTER (WHERE type = 'pageview') as pageviews
      FROM ${events}
      WHERE project_id = ${projectId} AND meta->'userProperties'->>'plan' = ${planType}
      GROUP BY session_id
    )
    SELECT (COUNT(*) FILTER (WHERE pageviews = 1)::float / NULLIF(COUNT(*), 0)) * 100 as segmented_bounce_rate
    FROM session_stats;
  `);
  return result.rows[0];
}
```

---

## 11. Comparison & Benchmarks

### The Payload Format
Automated per core metrics.

### Database Schema Target
- Duplicate fetches shifted by timeline offset (`end` = `start` offset).

### How To Aggregate (Drizzle SQL)
As established in `previousRange()` existing architecture.

---

## 12. Attribution

### The Payload Format
Attached natively on entry by SDK if query triggers exist (`utm_source` etc).

### Database Schema Target
- Compare `utmSource` on the *earliest* session timestamps against goal completion.

### How To Aggregate (Drizzle SQL)
First-Touch Revenue Attribution.
```typescript
export async function fetchFirstTouchAttribution(projectId: string) {
  const result = await db.execute(sql`
    WITH first_touches AS (
      SELECT DISTINCT ON (visitor_id) visitor_id, meta->>'utmSource' as source
      FROM ${events} 
      WHERE project_id = ${projectId} AND meta->>'utmSource' IS NOT NULL
      ORDER BY visitor_id, ts ASC
    ),
    purchases AS (
      SELECT visitor_id, CAST(meta->>'revenue' AS numeric) as revenue
      FROM ${events} 
      WHERE project_id = ${projectId} AND meta->>'eventName' = 'transaction'
    )
    SELECT f.source, 
      COUNT(p.visitor_id) as total_conversions,
      SUM(p.revenue) as total_attributed_revenue
    FROM first_touches f
    JOIN purchases p ON f.visitor_id = p.visitor_id
    GROUP BY f.source
    ORDER BY total_attributed_revenue DESC;
  `);
  return result.rows;
}
```
