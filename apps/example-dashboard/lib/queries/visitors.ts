import { cacheLife, cacheTag } from "next/cache";
import { sql } from "../db";
import { COUNTRY_NAME_TO_ISO } from "./filters";

export type VisitorSegment = "all" | "new" | "returning";
export type VisitorSort = "last_seen" | "visit_count" | "first_seen";

export type VisitorExplorerRow = {
	id: string;
	fingerprint: string;
	firstSeen: string;
	lastSeen: string;
	visitCount: number;
	deviceType: string | null;
	browser: string | null;
	os: string | null;
	country: string | null;
	city: string | null;
	isInternal: boolean;
};

function sortColumn(sort: VisitorSort) {
	if (sort === "visit_count") return sql`visit_count`;
	if (sort === "first_seen") return sql`first_seen`;
	return sql`last_seen`;
}

export async function getVisitorsExplorer(
	from: Date,
	to: Date,
	projectId: string | null,
	segment: VisitorSegment = "all",
	sort: VisitorSort = "last_seen",
	limit: number = 25,
	offset: number = 0,
	excludeVisitorId?: string | null,
	origin?: string | null,
): Promise<{ rows: VisitorExplorerRow[]; total: number }> {
	const segmentFilter =
		segment === "new"
			? sql`AND visitors.visit_count <= 1`
			: segment === "returning"
				? sql`AND visitors.visit_count > 1`
				: sql``;

	const projectFilter = projectId ? sql`AND visitors.project_id = ${projectId}` : sql``;
	const excludeFilter = excludeVisitorId
		? sql`AND visitors.fingerprint IS DISTINCT FROM ${excludeVisitorId}`
		: sql``;
	const originFilter = origin
		? sql`AND EXISTS (SELECT 1 FROM events WHERE events.visitor_id = visitors.fingerprint AND events.host = ${origin})`
		: sql``;

	const rows = await sql`
    SELECT
      visitors.id,
      visitors.fingerprint,
      visitors.first_seen,
      visitors.last_seen,
      visitors.visit_count,
      visitors.device_type,
      visitors.browser,
      visitors.os,
      visitors.country,
      visitors.city,
      COALESCE(visitors.is_internal, false) as is_internal
    FROM visitors
    WHERE (visitors.is_internal = false OR visitors.is_internal IS NULL)
      AND visitors.last_seen >= ${from}
      AND visitors.last_seen <= ${to}
      ${segmentFilter}
      ${projectFilter}
      ${excludeFilter}
      ${originFilter}
    ORDER BY ${sortColumn(sort)} DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

	const [{ count }] = await sql`
    SELECT COUNT(*) as count
    FROM visitors
    WHERE (visitors.is_internal = false OR visitors.is_internal IS NULL)
      AND visitors.last_seen >= ${from}
      AND visitors.last_seen <= ${to}
      ${segmentFilter}
      ${projectFilter}
      ${excludeFilter}
      ${originFilter}
  `;

	return {
		rows: rows.map((r) => ({
			id: String(r.id),
			fingerprint: r.fingerprint,
			firstSeen: r.first_seen,
			lastSeen: r.last_seen,
			visitCount: Number(r.visit_count),
			deviceType: r.device_type,
			browser: r.browser,
			os: r.os,
			country: COUNTRY_NAME_TO_ISO[r.country as string] || r.country,
			city: r.city,
			isInternal: Boolean(r.is_internal),
		})),
		total: Number(count),
	};
}

export type VisitorRecurrence = {
	returningRate: number;
	totalVisitors: number;
	returningVisitors: number;
	distribution: { bucket: "1" | "2-4" | "5-9" | "10+"; count: number }[];
	trend: { bucket: string; newVisitors: number; returningVisitors: number }[];
};

export async function getVisitorRecurrence(
	from: Date,
	to: Date,
	projectId: string | null,
	excludeVisitorId?: string | null,
): Promise<VisitorRecurrence> {
	const projectFilter = projectId ? sql`AND project_id = ${projectId}` : sql``;
	const excludeFilter = excludeVisitorId
		? sql`AND fingerprint IS DISTINCT FROM ${excludeVisitorId}`
		: sql``;

	const [totals] = await sql`
    SELECT
      COUNT(*) as total_visitors,
      COUNT(*) FILTER (WHERE visit_count > 1) as returning_visitors
    FROM visitors
    WHERE (is_internal = false OR is_internal IS NULL)
      AND last_seen >= ${from}
      AND last_seen <= ${to}
      ${projectFilter}
      ${excludeFilter}
  `;

	const distributionRows = await sql`
    SELECT
      CASE
        WHEN visit_count <= 1 THEN '1'
        WHEN visit_count BETWEEN 2 AND 4 THEN '2-4'
        WHEN visit_count BETWEEN 5 AND 9 THEN '5-9'
        ELSE '10+'
      END as bucket,
      COUNT(*) as count
    FROM visitors
    WHERE (is_internal = false OR is_internal IS NULL)
      AND last_seen >= ${from}
      AND last_seen <= ${to}
      ${projectFilter}
      ${excludeFilter}
    GROUP BY bucket
  `;

	const granularity = to.getTime() - from.getTime() > 3 * 86_400_000 ? "day" : "hour";
	const trendRows = await sql`
    SELECT
      date_trunc(${granularity}, first_seen) as bucket,
      COUNT(*) FILTER (WHERE visit_count <= 1) as new_visitors,
      COUNT(*) FILTER (WHERE visit_count > 1) as returning_visitors
    FROM visitors
    WHERE (is_internal = false OR is_internal IS NULL)
      AND first_seen >= ${from}
      AND first_seen <= ${to}
      ${projectFilter}
      ${excludeFilter}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

	const bucketOrder: Record<string, number> = { "1": 0, "2-4": 1, "5-9": 2, "10+": 3 };
	const distribution = (["1", "2-4", "5-9", "10+"] as const).map((bucket) => {
		const row = distributionRows.find((r) => r.bucket === bucket);
		return { bucket, count: row ? Number(row.count) : 0 };
	});
	distribution.sort((a, b) => bucketOrder[a.bucket] - bucketOrder[b.bucket]);

	const totalVisitors = Number(totals?.total_visitors ?? 0);
	const returningVisitors = Number(totals?.returning_visitors ?? 0);

	return {
		returningRate: totalVisitors > 0 ? (returningVisitors / totalVisitors) * 100 : 0,
		totalVisitors,
		returningVisitors,
		distribution,
		trend: trendRows.map((r) => ({
			bucket: new Date(r.bucket as string).toISOString(),
			newVisitors: Number(r.new_visitors),
			returningVisitors: Number(r.returning_visitors),
		})),
	};
}

export type VisitorSession = {
	sessionId: string | null;
	startedAt: string | Date;
	endedAt: string | Date;
	durationMs: number | null;
	entryPath: string | null;
	exitPath: string | null;
	referrer: string | null;
	pageviews: number;
	events: number;
	country: string | null;
	deviceType: string | null;
};

export async function getVisitorSessions(fingerprint: string): Promise<VisitorSession[]> {
	"use cache";
	cacheTag(`visitor:${fingerprint}`);
	cacheLife("minutes");

	let rows: readonly Record<string, unknown>[] = [];
	try {
		rows = await sql`
      SELECT session_id, started_at, last_event_at, entry_path, exit_path, referrer,
        pageviews, events, duration_ms, country, device_type
      FROM sessions
      WHERE visitor_id = ${fingerprint}
      ORDER BY started_at DESC
      LIMIT 30
    `;
	} catch {
		rows = [];
	}

	if (rows.length > 0) {
		return rows.map((s) => ({
			sessionId: s.session_id as string | null,
			startedAt: s.started_at as string,
			endedAt: s.last_event_at as string,
			durationMs: s.duration_ms !== null ? Number(s.duration_ms) : null,
			entryPath: s.entry_path as string | null,
			exitPath: s.exit_path as string | null,
			referrer: s.referrer as string | null,
			pageviews: Number(s.pageviews ?? 0),
			events: Number(s.events ?? 0),
			country: (s.country as string | null) ?? null,
			deviceType: (s.device_type as string | null) ?? null,
		}));
	}

	const grouped = await sql`
    SELECT session_id, MIN(ts) as started_at, MAX(ts) as ended_at, COUNT(*) as events,
      COUNT(*) FILTER (WHERE type = 'pageview') as pageviews,
      array_agg(path ORDER BY ts) FILTER (WHERE path IS NOT NULL) as paths
    FROM events
    WHERE visitor_id = ${fingerprint} AND session_id IS NOT NULL
    GROUP BY session_id
    ORDER BY started_at DESC
    LIMIT 30
  `;

	return grouped.map((s) => {
		const paths = (s.paths as string[] | null) || [];
		const started = new Date(s.started_at as string);
		const ended = new Date(s.ended_at as string);
		return {
			sessionId: s.session_id as string | null,
			startedAt: s.started_at as string,
			endedAt: s.ended_at as string,
			durationMs: ended.getTime() - started.getTime(),
			entryPath: paths[0] ?? null,
			exitPath: paths[paths.length - 1] ?? null,
			referrer: null,
			pageviews: Number(s.pageviews),
			events: Number(s.events),
			country: null,
			deviceType: null,
		};
	});
}

export async function getVisitorProfile(fingerprint: string) {
	"use cache";
	cacheTag(`visitor:${fingerprint}`);
	cacheLife("minutes");

	const [visitor] = await sql`
    SELECT
      id, fingerprint, first_seen, last_seen, visit_count, device_type, os, os_version,
      browser, browser_version, screen_resolution, timezone, language, country, region,
      city, ua, meta, COALESCE(is_internal, false) as is_internal
    FROM visitors
    WHERE fingerprint = ${fingerprint}
    LIMIT 1
  `;

	if (!visitor) return null;

	const topPages = await sql`
    SELECT path, COUNT(*) as count
    FROM events
    WHERE visitor_id = ${fingerprint} AND type = 'pageview' AND path IS NOT NULL
    GROUP BY path
    ORDER BY count DESC
    LIMIT 10
  `;

	const referrers = await sql`
    SELECT referrer, COUNT(*) as count, MAX(ts) as last_seen
    FROM events
    WHERE visitor_id = ${fingerprint} AND referrer IS NOT NULL AND referrer != ''
    GROUP BY referrer
    ORDER BY last_seen DESC
    LIMIT 10
  `;

	return {
		visitor: {
			id: String(visitor.id),
			fingerprint: visitor.fingerprint,
			firstSeen: visitor.first_seen,
			lastSeen: visitor.last_seen,
			visitCount: Number(visitor.visit_count),
			deviceType: visitor.device_type,
			os: visitor.os,
			osVersion: visitor.os_version,
			browser: visitor.browser,
			browserVersion: visitor.browser_version,
			screenResolution: visitor.screen_resolution,
			timezone: visitor.timezone,
			language: visitor.language,
			country: visitor.country,
			region: visitor.region,
			city: visitor.city,
			userAgent: visitor.ua,
			meta: visitor.meta as Record<string, unknown> | null,
			isInternal: Boolean(visitor.is_internal),
		},
		topPages: topPages.map((r) => ({ path: r.path as string, count: Number(r.count) })),
		referrers: referrers.map((r) => ({
			referrer: r.referrer as string,
			count: Number(r.count),
			lastSeen: r.last_seen,
		})),
	};
}
