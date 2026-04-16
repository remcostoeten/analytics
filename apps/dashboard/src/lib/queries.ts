"use server";

import { db } from "./db";
import { events } from "@remcostoeten/db";
import { eq, and, gte, lte, sql, desc, isNotNull } from "drizzle-orm";
import type { DateRange } from "./date-utils";

export type TimeGranularity = "hour" | "day";

export type TimeseriesPoint = {
  ts: Date;
  count: number;
};

export type TopPage = {
  path: string | null;
  views: number;
};

export type TopReferrer = {
  referrer: string;
  visits: number;
};

export type GeoEntry = {
  country: string | null;
  region: string | null;
  city: string | null;
  visitors: number;
};

export type EntryExitPage = {
  path: string;
  count: number;
};

export type KpiChange = {
  value: number;
  previousValue: number;
  changePercent: number | null;
};

export type DashboardMetrics = {
  pageviews: number;
  visitors: number;
  sessions: number;
  avgSessionDurationMs: number;
  avgPagesPerSession: number;
  bounceRate: number;
  timeseries: TimeseriesPoint[];
  topPages: TopPage[];
  topReferrers: TopReferrer[];
  geo: GeoEntry[];
  entryPages: EntryExitPage[];
  exitPages: EntryExitPage[];
  wow: {
    pageviews: KpiChange;
    visitors: KpiChange;
    sessions: KpiChange;
    avgSessionDurationMs: KpiChange;
    avgPagesPerSession: KpiChange;
    bounceRate: KpiChange;
  };
};

export type FilterOptions = {
  showBots?: boolean;
  showLocalhost?: boolean;
};

function rangeFilter(projectId: string, range: DateRange, filters?: FilterOptions) {
  const conditions = [
    eq(events.projectId, projectId),
    gte(events.ts, range.start),
    lte(events.ts, range.end)
  ];

  if (!filters?.showLocalhost) {
    conditions.push(eq(events.isLocalhost, false));
  }

  if (!filters?.showBots) {
    conditions.push(sql`NOT (${events.meta}->>'botDetected') = 'true'`);
  }

  return and(...conditions);
}

function pageviewRangeFilter(projectId: string, range: DateRange, filters?: FilterOptions) {
  return and(rangeFilter(projectId, range, filters), eq(events.type, "pageview"));
}

export type SessionSummary = {
  avgSessionDurationMs: number;
  avgPagesPerSession: number;
  bounceRate: number;
};

export async function fetchSessionSummary(
  projectId: string,
  range: DateRange,
  filters?: FilterOptions
): Promise<SessionSummary> {
  const result = await db.execute(sql`
    with session_stats as (
      select
        ${events.sessionId} as session_id,
        count(*) filter (where ${events.type} = 'pageview') as pageviews,
        extract(epoch from max(${events.ts}) - min(${events.ts})) * 1000 as duration_ms
      from ${events}
      where ${rangeFilter(projectId, range, filters)}
        and ${events.sessionId} is not null
      group by ${events.sessionId}
    )
    select
      coalesce(avg(pageviews), 0)::float8 as avg_pages_per_session,
      coalesce(avg(duration_ms), 0)::float8 as avg_session_duration_ms,
      case
        when count(*) = 0 then 0::float8
        else (count(*) filter (where pageviews = 1) * 100.0 / count(*))::float8
      end as bounce_rate
    from session_stats
  `);

  const summary = result.rows[0] as {
    avg_pages_per_session?: number | string | null;
    avg_session_duration_ms?: number | string | null;
    bounce_rate?: number | string | null;
  } | undefined;

  return {
    avgSessionDurationMs: Number(summary?.avg_session_duration_ms ?? 0),
    avgPagesPerSession: Number(summary?.avg_pages_per_session ?? 0),
    bounceRate: Number(summary?.bounce_rate ?? 0),
  };
}

function previousRange(range: DateRange): DateRange {
  const durationMs = range.end.getTime() - range.start.getTime();
  return {
    start: new Date(range.start.getTime() - durationMs),
    end: new Date(range.start.getTime()),
  };
}

function changePercent(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? null : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

async function fetchCoreKpis(
  projectId: string,
  range: DateRange,
  filters?: FilterOptions
) {
  const base = rangeFilter(projectId, range, filters);
  const pageviewFilter = pageviewRangeFilter(projectId, range, filters);

  const [pageviewsResult, visitorsResult, sessionsResult, sessionSummary] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(events).where(pageviewFilter),
    db
      .select({ count: sql<number>`count(distinct ${events.visitorId})` })
      .from(events)
      .where(and(base, isNotNull(events.visitorId))),
    db
      .select({ count: sql<number>`count(distinct ${events.sessionId})` })
      .from(events)
      .where(and(base, isNotNull(events.sessionId))),
    fetchSessionSummary(projectId, range, filters),
  ]);

  return {
    pageviews: pageviewsResult[0]?.count ?? 0,
    visitors: visitorsResult[0]?.count ?? 0,
    sessions: sessionsResult[0]?.count ?? 0,
    avgSessionDurationMs: sessionSummary.avgSessionDurationMs,
    avgPagesPerSession: sessionSummary.avgPagesPerSession,
    bounceRate: sessionSummary.bounceRate,
  };
}

export async function fetchEntryPages(
  projectId: string,
  range: DateRange,
  limit: number = 10,
  filters?: FilterOptions
): Promise<EntryExitPage[]> {
  const result = await db.execute(sql`
    with first_pages as (
      select distinct on (${events.sessionId})
        ${events.path} as path
      from ${events}
      where ${rangeFilter(projectId, range, filters)}
        and ${events.sessionId} is not null
        and ${events.type} = 'pageview'
      order by ${events.sessionId}, ${events.ts} asc
    )
    select path, count(*)::int as count
    from first_pages
    where path is not null
    group by path
    order by count desc
    limit ${limit}
  `);

  return (result.rows as Array<{ path: string; count: number }>).map(function (row) {
    return { path: row.path, count: Number(row.count) };
  });
}

export async function fetchExitPages(
  projectId: string,
  range: DateRange,
  limit: number = 10,
  filters?: FilterOptions
): Promise<EntryExitPage[]> {
  const result = await db.execute(sql`
    with last_pages as (
      select distinct on (${events.sessionId})
        ${events.path} as path
      from ${events}
      where ${rangeFilter(projectId, range, filters)}
        and ${events.sessionId} is not null
        and ${events.type} = 'pageview'
      order by ${events.sessionId}, ${events.ts} desc
    )
    select path, count(*)::int as count
    from last_pages
    where path is not null
    group by path
    order by count desc
    limit ${limit}
  `);

  return (result.rows as Array<{ path: string; count: number }>).map(function (row) {
    return { path: row.path, count: Number(row.count) };
  });
}

export async function fetchMetrics(
  projectId: string,
  range: DateRange,
  filters?: FilterOptions
): Promise<DashboardMetrics> {
  const prev = previousRange(range);

  const [current, previous, timeseries, topPages, topReferrers, geo, entryPages, exitPages] = await Promise.all([
    fetchCoreKpis(projectId, range, filters),
    fetchCoreKpis(projectId, prev, filters),
    fetchTimeseries(projectId, range, "day", filters),
    fetchTopPages(projectId, range, 10, filters),
    fetchTopReferrers(projectId, range, 10, filters),
    fetchGeo(projectId, range, filters),
    fetchEntryPages(projectId, range, 10, filters),
    fetchExitPages(projectId, range, 10, filters),
  ]);

  return {
    pageviews: current.pageviews,
    visitors: current.visitors,
    sessions: current.sessions,
    avgSessionDurationMs: current.avgSessionDurationMs,
    avgPagesPerSession: current.avgPagesPerSession,
    bounceRate: current.bounceRate,
    timeseries,
    topPages,
    topReferrers,
    geo,
    entryPages,
    exitPages,
    wow: {
      pageviews: { value: current.pageviews, previousValue: previous.pageviews, changePercent: changePercent(current.pageviews, previous.pageviews) },
      visitors: { value: current.visitors, previousValue: previous.visitors, changePercent: changePercent(current.visitors, previous.visitors) },
      sessions: { value: current.sessions, previousValue: previous.sessions, changePercent: changePercent(current.sessions, previous.sessions) },
      avgSessionDurationMs: { value: current.avgSessionDurationMs, previousValue: previous.avgSessionDurationMs, changePercent: changePercent(current.avgSessionDurationMs, previous.avgSessionDurationMs) },
      avgPagesPerSession: { value: current.avgPagesPerSession, previousValue: previous.avgPagesPerSession, changePercent: changePercent(current.avgPagesPerSession, previous.avgPagesPerSession) },
      bounceRate: { value: current.bounceRate, previousValue: previous.bounceRate, changePercent: changePercent(current.bounceRate, previous.bounceRate) },
    },
  };
}

export async function fetchTimeseries(
  projectId: string,
  range: DateRange,
  granularity: TimeGranularity = "day",
  filters?: FilterOptions
): Promise<TimeseriesPoint[]> {
  const trunc = granularity === "hour" ? "hour" : "day";
  const bucket = sql<Date>`date_trunc(${trunc}, ${events.ts})`;

  const result = await db
    .select({
      ts: bucket,
      count: sql<number>`count(*)`,
    })
    .from(events)
    .where(pageviewRangeFilter(projectId, range, filters))
    .groupBy(sql`1`)
    .orderBy(sql`1 asc`);

  return result;
}

export async function fetchTopPages(
  projectId: string,
  range: DateRange,
  limit: number = 10,
  filters?: FilterOptions
): Promise<TopPage[]> {
  const result = await db
    .select({
      path: events.path,
      views: sql<number>`count(*)`,
    })
    .from(events)
    .where(pageviewRangeFilter(projectId, range, filters))
    .groupBy(events.path)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  return result;
}

export async function fetchTopReferrers(
  projectId: string,
  range: DateRange,
  limit: number = 10,
  filters?: FilterOptions
): Promise<TopReferrer[]> {
  const result = await db
    .select({
      referrer: events.referrer,
      visits: sql<number>`count(*)`,
    })
    .from(events)
    .where(and(
      rangeFilter(projectId, range, filters),
      isNotNull(events.referrer),
      sql`${events.referrer} != ''`
    ))
    .groupBy(events.referrer)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  return result.map((r) => ({
    referrer: r.referrer!,
    visits: r.visits,
  }));
}

export async function fetchGeo(
  projectId: string,
  range: DateRange,
  filters?: FilterOptions
): Promise<GeoEntry[]> {
  const result = await db
    .select({
      country: events.country,
      region: events.region,
      city: events.city,
      visitors: sql<number>`count(distinct ${events.visitorId})`,
    })
    .from(events)
    .where(rangeFilter(projectId, range, filters))
    .groupBy(events.country, events.region, events.city)
    .orderBy(desc(sql`count(distinct ${events.visitorId})`))
    .limit(50);

  return result;
}
export async function fetchProjects(): Promise<string[]> {
  const result = await db
    .select({
      projectId: events.projectId,
    })
    .from(events)
    .groupBy(events.projectId)
    .orderBy(events.projectId);

  const projects = result.map((r) => r.projectId).filter(Boolean) as string[];
  
  // Ensure localhost is always an option
  if (!projects.includes("localhost")) {
    return ["localhost", ...projects];
  }
  
  return projects;
}

export type BreakDownEntry = { label: string; count: number };

export async function fetchDeviceTypes(projectId: string, range: DateRange, filters?: FilterOptions): Promise<BreakDownEntry[]> {
  const result = await db.select({
      label: events.deviceType,
      count: sql<number>`count(*)`,
    })
    .from(events)
    .where(and(rangeFilter(projectId, range, filters), isNotNull(events.deviceType)))
    .groupBy(events.deviceType)
    .orderBy(desc(sql`count(*)`));
  return result.map(r => ({ label: r.label || 'Unknown', count: Number(r.count) }));
}

export async function fetchLanguages(projectId: string, range: DateRange, filters?: FilterOptions): Promise<BreakDownEntry[]> {
  const result = await db.select({
      label: events.lang,
      count: sql<number>`count(*)`,
    })
    .from(events)
    .where(and(rangeFilter(projectId, range, filters), isNotNull(events.lang)))
    .groupBy(events.lang)
    .orderBy(desc(sql`count(*)`));
  return result.map(r => ({ label: r.label || 'Unknown', count: Number(r.count) }));
}

export async function fetchBrowsers(projectId: string, range: DateRange, filters?: FilterOptions): Promise<BreakDownEntry[]> {
  const result = await db.select({
      label: sql<string>`${events.meta}->>'browser'`,
      count: sql<number>`count(*)`,
    })
    .from(events)
    .where(and(rangeFilter(projectId, range, filters), sql`${events.meta}->>'browser' IS NOT NULL`))
    .groupBy(sql`${events.meta}->>'browser'`)
    .orderBy(desc(sql`count(*)`));
  return result.map(r => ({ label: r.label || 'Unknown', count: Number(r.count) }));
}

export async function fetchOperatingSystems(projectId: string, range: DateRange, filters?: FilterOptions): Promise<BreakDownEntry[]> {
  const result = await db.select({
      label: sql<string>`${events.meta}->>'os'`,
      count: sql<number>`count(*)`,
    })
    .from(events)
    .where(and(rangeFilter(projectId, range, filters), sql`${events.meta}->>'os' IS NOT NULL`))
    .groupBy(sql`${events.meta}->>'os'`)
    .orderBy(desc(sql`count(*)`));
  return result.map(r => ({ label: r.label || 'Unknown', count: Number(r.count) }));
}

export async function fetchEventTypes(projectId: string, range: DateRange, filters?: FilterOptions): Promise<BreakDownEntry[]> {
  const result = await db.select({
      label: events.type,
      count: sql<number>`count(*)`,
    })
    .from(events)
    .where(rangeFilter(projectId, range, filters))
    .groupBy(events.type)
    .orderBy(desc(sql`count(*)`));
  return result.map(r => ({ label: r.label || 'Unknown', count: Number(r.count) }));
}

export async function fetchCustomEvents(projectId: string, range: DateRange, filters?: FilterOptions): Promise<BreakDownEntry[]> {
  const result = await db.select({
      label: sql<string>`${events.meta}->>'eventName'`,
      count: sql<number>`count(*)`,
    })
    .from(events)
    .where(and(rangeFilter(projectId, range, filters), eq(events.type, 'event'), sql`${events.meta}->>'eventName' IS NOT NULL`))
    .groupBy(sql`${events.meta}->>'eventName'`)
    .orderBy(desc(sql`count(*)`));
  return result.map(r => ({ label: r.label || 'Unknown', count: Number(r.count) }));
}

export async function fetchClickElements(projectId: string, range: DateRange, filters?: FilterOptions): Promise<BreakDownEntry[]> {
  const result = await db.select({
      label: sql<string>`${events.meta}->>'elementName'`,
      count: sql<number>`count(*)`,
    })
    .from(events)
    .where(and(rangeFilter(projectId, range, filters), eq(events.type, 'click'), sql`${events.meta}->>'elementName' IS NOT NULL`))
    .groupBy(sql`${events.meta}->>'elementName'`)
    .orderBy(desc(sql`count(*)`));
  return result.map(r => ({ label: r.label || 'Unknown', count: Number(r.count) }));
}

export async function fetchErrors(projectId: string, range: DateRange, filters?: FilterOptions): Promise<BreakDownEntry[]> {
  const result = await db.select({
      label: sql<string>`${events.meta}->>'message'`,
      count: sql<number>`count(*)`,
    })
    .from(events)
    .where(and(rangeFilter(projectId, range, filters), eq(events.type, 'error'), sql`${events.meta}->>'message' IS NOT NULL`))
    .groupBy(sql`${events.meta}->>'message'`)
    .orderBy(desc(sql`count(*)`));
  return result.map(r => ({ label: r.label || 'Unknown', count: Number(r.count) }));
}

export async function fetchScreenSizes(projectId: string, range: DateRange, filters?: FilterOptions): Promise<BreakDownEntry[]> {
  const result = await db.select({
      label: sql<string>`${events.meta}->>'screenSize'`,
      count: sql<number>`count(*)`,
    })
    .from(events)
    .where(and(rangeFilter(projectId, range, filters), sql`${events.meta}->>'screenSize' IS NOT NULL`))
    .groupBy(sql`${events.meta}->>'screenSize'`)
    .orderBy(desc(sql`count(*)`));
  return result.map(r => ({ label: r.label || 'Unknown', count: Number(r.count) }));
}

export async function fetchLiveVisitors(projectId: string, filters?: FilterOptions): Promise<number> {
  const range = {
    start: new Date(Date.now() - 5 * 60 * 1000),
    end: new Date()
  };
  const result = await db.select({
      count: sql<number>`count(distinct ${events.visitorId})`
    })
    .from(events)
    .where(and(rangeFilter(projectId, range, filters), isNotNull(events.visitorId)));
    
  return Number(result[0]?.count ?? 0);
}

export async function fetchNewVsReturning(projectId: string, range: DateRange, filters?: FilterOptions) {
  const result = await db.execute(sql`
    with visitors_in_range as (
      select distinct ${events.visitorId}
      from ${events}
      where ${rangeFilter(projectId, range, filters)} and ${events.visitorId} is not null
    ),
    returning_visitors as (
      select distinct ${events.visitorId}
      from ${events}
      where ${events.projectId} = ${projectId} 
        and ${events.ts} < ${range.start.toISOString()}
        and coalesce(${events.isLocalhost}, false) = ${filters?.showLocalhost ? sql`coalesce(${events.isLocalhost}, false)` : false}
        and (${filters?.showBots ? sql`true` : sql`coalesce(${events.meta}->>'botDetected', 'false') != 'true'`})
        and ${events.visitorId} in (select * from visitors_in_range)
    )
    select 
      (select count(*) from visitors_in_range) as total,
      (select count(*) from returning_visitors) as returning
  `);
  
  const total = Number(result.rows[0]?.total ?? 0);
  const returning = Number(result.rows[0]?.returning ?? 0);
  
  return {
    new: total - returning,
    returning
  };
}

