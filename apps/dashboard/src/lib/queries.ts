"use server";

import { db } from "./db";
import { events } from "./schema";
import { eq, and, gte, lte, sql, desc, isNotNull } from "drizzle-orm";
import type { DateRange } from "./date-utils";

export type TimeGranularity = "hour" | "day";

export type TimeseriesPoint = {
  ts: Date;
  count: number;
};

export type TopPage = {
  path: string;
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

export type DashboardMetrics = {
  pageviews: number;
  visitors: number;
  sessions: number;
  timeseries: TimeseriesPoint[];
  topPages: TopPage[];
  topReferrers: TopReferrer[];
  geo: GeoEntry[];
};

function rangeFilter(projectId: string, range: DateRange) {
  return and(
    eq(events.projectId, projectId),
    gte(events.ts, range.start),
    lte(events.ts, range.end)
  );
}

export async function fetchMetrics(
  projectId: string,
  range: DateRange
): Promise<DashboardMetrics> {
  const base = rangeFilter(projectId, range);
  const pageviewFilter = and(base, eq(events.type, "pageview"));

  const [pageviewsResult, visitorsResult, sessionsResult] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(events).where(pageviewFilter),
    db
      .select({ count: sql<number>`count(distinct ${events.visitorId})` })
      .from(events)
      .where(and(base, isNotNull(events.visitorId))),
    db
      .select({ count: sql<number>`count(distinct ${events.sessionId})` })
      .from(events)
      .where(and(base, isNotNull(events.sessionId))),
  ]);

  const [timeseries, topPages, topReferrers, geo] = await Promise.all([
    fetchTimeseries(projectId, range, "day"),
    fetchTopPages(projectId, range, 10),
    fetchTopReferrers(projectId, range, 10),
    fetchGeo(projectId, range),
  ]);

  return {
    pageviews: pageviewsResult[0]?.count ?? 0,
    visitors: visitorsResult[0]?.count ?? 0,
    sessions: sessionsResult[0]?.count ?? 0,
    timeseries,
    topPages,
    topReferrers,
    geo,
  };
}

export async function fetchTimeseries(
  projectId: string,
  range: DateRange,
  granularity: TimeGranularity = "day"
): Promise<TimeseriesPoint[]> {
  const trunc = granularity === "hour" ? "hour" : "day";
  const bucket = sql`date_trunc(${trunc}, ${events.ts})`;

  const result = await db
    .select({
      ts: sql<Date>`${bucket}`,
      count: sql<number>`count(*)`,
    })
    .from(events)
    .where(
      and(
        eq(events.projectId, projectId),
        eq(events.type, "pageview"),
        gte(events.ts, range.start),
        lte(events.ts, range.end)
      )
    )
    .groupBy(bucket)
    .orderBy(sql`${bucket} asc`);

  return result;
}

export async function fetchTopPages(
  projectId: string,
  range: DateRange,
  limit: number = 10
): Promise<TopPage[]> {
  const result = await db
    .select({
      path: events.path,
      views: sql<number>`count(*)`,
    })
    .from(events)
    .where(
      and(
        eq(events.projectId, projectId),
        eq(events.type, "pageview"),
        gte(events.ts, range.start),
        lte(events.ts, range.end)
      )
    )
    .groupBy(events.path)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  return result;
}

export async function fetchTopReferrers(
  projectId: string,
  range: DateRange,
  limit: number = 10
): Promise<TopReferrer[]> {
  const result = await db
    .select({
      referrer: events.referrer,
      visits: sql<number>`count(*)`,
    })
    .from(events)
    .where(
      and(
        eq(events.projectId, projectId),
        gte(events.ts, range.start),
        lte(events.ts, range.end),
        isNotNull(events.referrer),
        sql`${events.referrer} != ''`
      )
    )
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
  range: DateRange
): Promise<GeoEntry[]> {
  const result = await db
    .select({
      country: events.country,
      region: events.region,
      city: events.city,
      visitors: sql<number>`count(distinct ${events.visitorId})`,
    })
    .from(events)
    .where(
      and(
        eq(events.projectId, projectId),
        gte(events.ts, range.start),
        lte(events.ts, range.end)
      )
    )
    .groupBy(events.country, events.region, events.city)
    .orderBy(desc(sql`count(distinct ${events.visitorId})`))
    .limit(50);

  return result;
}
