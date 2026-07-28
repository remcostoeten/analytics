import { cacheLife, cacheTag } from "next/cache";
import { sql } from "../db";
import { COUNTRY_NAME_TO_ISO, externalReferrer, geoScopeFilter, type GeoScope } from "./filters";

export type VisitorSegment = "all" | "new" | "returning";
export type VisitorSort = "last_seen" | "visit_count" | "first_seen" | "total_time";

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
	totalDurationMs: number;
	pageviews: number;
	lastEntryPath: string | null;
};

function sortColumn(sort: VisitorSort) {
	if (sort === "visit_count") return sql`visit_count`;
	if (sort === "first_seen") return sql`first_seen`;
	if (sort === "total_time") return sql`total_duration_ms`;
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
	geo?: GeoScope | null,
	search?: string | null,
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
	const geoFilter = geo?.country
		? sql`AND EXISTS (SELECT 1 FROM events WHERE events.visitor_id = visitors.fingerprint ${geoScopeFilter(geo.country, geo.region)})`
		: sql``;
	const searchTerm = search?.trim() ? `%${search.trim()}%` : null;
	const searchFilter = searchTerm
		? sql`AND (
			visitors.fingerprint ILIKE ${searchTerm}
			OR visitors.country ILIKE ${searchTerm}
			OR visitors.city ILIKE ${searchTerm}
			OR visitors.browser ILIKE ${searchTerm}
			OR visitors.os ILIKE ${searchTerm}
			OR visitors.device_type ILIKE ${searchTerm}
		)`
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
      COALESCE(visitors.is_internal, false) as is_internal,
      COALESCE(activity.total_duration_ms, 0) as total_duration_ms,
      COALESCE(activity.pageviews, 0) as pageviews,
      activity.last_entry_path
    FROM visitors
    LEFT JOIN LATERAL (
      SELECT
        SUM(session_duration.duration_ms) as total_duration_ms,
        SUM(session_duration.pageviews) as pageviews,
        (array_agg(session_duration.entry_path ORDER BY session_duration.started_at DESC))[1] as last_entry_path
      FROM (
        SELECT
          MIN(events.ts) as started_at,
          EXTRACT(EPOCH FROM MAX(events.ts) - MIN(events.ts)) * 1000 as duration_ms,
          COUNT(*) FILTER (WHERE events.type = 'pageview') as pageviews,
          (array_agg(events.path ORDER BY events.ts) FILTER (WHERE events.path IS NOT NULL))[1] as entry_path
        FROM events
        WHERE events.visitor_id = visitors.fingerprint AND events.session_id IS NOT NULL
        GROUP BY events.session_id
      ) session_duration
    ) activity ON true
    WHERE (visitors.is_internal = false OR visitors.is_internal IS NULL)
      AND visitors.last_seen >= ${from}
      AND visitors.last_seen <= ${to}
      ${segmentFilter}
      ${projectFilter}
      ${excludeFilter}
      ${originFilter}
      ${geoFilter}
      ${searchFilter}
    ORDER BY ${sortColumn(sort)} DESC NULLS LAST
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
      ${geoFilter}
      ${searchFilter}
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
			totalDurationMs: Math.round(Number(r.total_duration_ms) || 0),
			pageviews: Number(r.pageviews) || 0,
			lastEntryPath: (r.last_entry_path as string | null) ?? null,
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
    WHERE visitor_id = ${fingerprint} AND referrer IS NOT NULL AND referrer != '' AND ${externalReferrer()}
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

const NOISE_EVENT_NAMES = ["time-on-page", "scroll", "web-vitals"];

export type VisitorInsights = {
	engagement: {
		sessions: number;
		totalDurationMs: number;
		avgDurationMs: number;
		avgPageviews: number;
		bounceRate: number;
		totalPageviews: number;
		totalEvents: number;
		activeDays: number;
		lifespanDays: number;
	};
	returnPattern: {
		avgGapMs: number | null;
		medianGapMs: number | null;
		longestGapMs: number | null;
		currentGapMs: number | null;
		favoriteDay: string | null;
		favoriteHour: number | null;
	};
	heatmap: { data: number[][]; maxCount: number; days: string[] };
	dailyActivity: { day: string; sessions: number; pageviews: number }[];
	geoHistory: {
		country: string | null;
		countryCode: string | null;
		region: string | null;
		city: string | null;
		events: number;
		firstSeen: string;
		lastSeen: string;
	}[];
	utmHistory: {
		source: string;
		medium: string | null;
		campaign: string | null;
		visits: number;
		lastSeen: string;
	}[];
	hosts: { host: string; count: number }[];
	customEvents: { name: string; count: number; lastSeen: string }[];
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function getVisitorInsights(fingerprint: string): Promise<VisitorInsights> {
	"use cache";
	cacheTag(`visitor:${fingerprint}`);
	cacheLife("minutes");

	const sessionRollup = sql`
    SELECT
      session_id,
      MIN(ts) as started_at,
      MAX(ts) as ended_at,
      COUNT(*) as events,
      COUNT(*) FILTER (WHERE type = 'pageview') as pageviews
    FROM events
    WHERE visitor_id = ${fingerprint} AND session_id IS NOT NULL
    GROUP BY session_id
  `;

	const [
		[engagementRow],
		[gapRow],
		[spanRow],
		heatmapRows,
		dailyRows,
		geoRows,
		utmRows,
		hostRows,
		eventRows,
	] = await Promise.all([
		sql`
      WITH s AS (${sessionRollup})
      SELECT
        COUNT(*) as sessions,
        COALESCE(SUM(EXTRACT(EPOCH FROM ended_at - started_at) * 1000), 0) as total_ms,
        COALESCE(AVG(EXTRACT(EPOCH FROM ended_at - started_at) * 1000), 0) as avg_ms,
        COALESCE(AVG(pageviews), 0) as avg_pageviews,
        COALESCE(SUM(pageviews), 0) as total_pageviews,
        COALESCE(SUM(events), 0) as total_events,
        COUNT(*) FILTER (WHERE pageviews <= 1) as bounces
      FROM s
    `,
		sql`
      WITH s AS (${sessionRollup}),
      gaps AS (
        SELECT EXTRACT(EPOCH FROM started_at - LAG(started_at) OVER (ORDER BY started_at)) * 1000 as gap_ms
        FROM s
      )
      SELECT
        AVG(gap_ms) as avg_gap,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gap_ms) as median_gap,
        MAX(gap_ms) as longest_gap
      FROM gaps
      WHERE gap_ms IS NOT NULL
    `,
		sql`
      SELECT
        COUNT(DISTINCT ts::date) as active_days,
        MIN(ts) as first_ts,
        MAX(ts) as last_ts
      FROM events
      WHERE visitor_id = ${fingerprint}
    `,
		sql`
      SELECT EXTRACT(DOW FROM ts) as day_of_week, EXTRACT(HOUR FROM ts) as hour, COUNT(*) as count
      FROM events
      WHERE visitor_id = ${fingerprint} AND type = 'pageview'
      GROUP BY day_of_week, hour
    `,
		sql`
      SELECT
        date_trunc('day', ts) as day,
        COUNT(DISTINCT session_id) as sessions,
        COUNT(*) FILTER (WHERE type = 'pageview') as pageviews
      FROM events
      WHERE visitor_id = ${fingerprint}
      GROUP BY day
      ORDER BY day ASC
    `,
		sql`
      SELECT country, region, city, COUNT(*) as events, MIN(ts) as first_seen, MAX(ts) as last_seen
      FROM events
      WHERE visitor_id = ${fingerprint} AND country IS NOT NULL
      GROUP BY country, region, city
      ORDER BY last_seen DESC
      LIMIT 15
    `,
		sql`
      SELECT
        meta->>'utmSource' as source,
        meta->>'utmMedium' as medium,
        meta->>'utmCampaign' as campaign,
        COUNT(DISTINCT session_id) as visits,
        MAX(ts) as last_seen
      FROM events
      WHERE visitor_id = ${fingerprint} AND NULLIF(meta->>'utmSource', '') IS NOT NULL
      GROUP BY source, medium, campaign
      ORDER BY last_seen DESC
      LIMIT 10
    `,
		sql`
      SELECT host, COUNT(*) as count
      FROM events
      WHERE visitor_id = ${fingerprint} AND host IS NOT NULL
      GROUP BY host
      ORDER BY count DESC
      LIMIT 10
    `,
		sql`
      SELECT meta->>'eventName' as name, COUNT(*) as count, MAX(ts) as last_seen
      FROM events
      WHERE visitor_id = ${fingerprint}
        AND NULLIF(meta->>'eventName', '') IS NOT NULL
        AND meta->>'eventName' != ALL(${NOISE_EVENT_NAMES})
      GROUP BY name
      ORDER BY count DESC
      LIMIT 20
    `,
	]);

	const heatmap = Array(7)
		.fill(null)
		.map(() => Array(24).fill(0) as number[]);
	let maxCount = 0;
	let favoriteDay: string | null = null;
	let favoriteHour: number | null = null;
	heatmapRows.forEach((r) => {
		const val = Number(r.count);
		const day = Number(r.day_of_week);
		const hour = Number(r.hour);
		heatmap[day][hour] = val;
		if (val > maxCount) {
			maxCount = val;
			favoriteDay = DAY_LABELS[day];
			favoriteHour = hour;
		}
	});

	const firstTs = spanRow?.first_ts ? new Date(spanRow.first_ts as string) : null;
	const lastTs = spanRow?.last_ts ? new Date(spanRow.last_ts as string) : null;
	const sessions = Number(engagementRow?.sessions ?? 0);
	const bounces = Number(engagementRow?.bounces ?? 0);

	return {
		engagement: {
			sessions,
			totalDurationMs: Math.round(Number(engagementRow?.total_ms ?? 0)),
			avgDurationMs: Math.round(Number(engagementRow?.avg_ms ?? 0)),
			avgPageviews: Math.round(Number(engagementRow?.avg_pageviews ?? 0) * 10) / 10,
			bounceRate: sessions > 0 ? Math.round((bounces / sessions) * 1000) / 10 : 0,
			totalPageviews: Number(engagementRow?.total_pageviews ?? 0),
			totalEvents: Number(engagementRow?.total_events ?? 0),
			activeDays: Number(spanRow?.active_days ?? 0),
			lifespanDays:
				firstTs && lastTs
					? Math.max(1, Math.ceil((lastTs.getTime() - firstTs.getTime()) / 86_400_000))
					: 0,
		},
		returnPattern: {
			avgGapMs:
				gapRow?.avg_gap !== null && gapRow?.avg_gap !== undefined
					? Math.round(Number(gapRow.avg_gap))
					: null,
			medianGapMs:
				gapRow?.median_gap !== null && gapRow?.median_gap !== undefined
					? Math.round(Number(gapRow.median_gap))
					: null,
			longestGapMs:
				gapRow?.longest_gap !== null && gapRow?.longest_gap !== undefined
					? Math.round(Number(gapRow.longest_gap))
					: null,
			currentGapMs: lastTs ? Date.now() - lastTs.getTime() : null,
			favoriteDay,
			favoriteHour,
		},
		heatmap: { data: heatmap, maxCount, days: DAY_LABELS },
		dailyActivity: dailyRows.map((r) => ({
			day: new Date(r.day as string).toISOString(),
			sessions: Number(r.sessions),
			pageviews: Number(r.pageviews),
		})),
		geoHistory: geoRows.map((r) => ({
			country: r.country as string | null,
			countryCode: COUNTRY_NAME_TO_ISO[r.country as string] || (r.country as string | null),
			region: r.region as string | null,
			city: r.city as string | null,
			events: Number(r.events),
			firstSeen: r.first_seen as string,
			lastSeen: r.last_seen as string,
		})),
		utmHistory: utmRows.map((r) => ({
			source: r.source as string,
			medium: r.medium as string | null,
			campaign: r.campaign as string | null,
			visits: Number(r.visits),
			lastSeen: r.last_seen as string,
		})),
		hosts: hostRows.map((r) => ({ host: r.host as string, count: Number(r.count) })),
		customEvents: eventRows.map((r) => ({
			name: r.name as string,
			count: Number(r.count),
			lastSeen: r.last_seen as string,
		})),
	};
}

export type SessionTrailStep = {
	ts: string;
	kind: "pageview" | "event";
	path: string | null;
	name: string | null;
	dwellMs: number | null;
	scrollDepth: number | null;
	referrer: string | null;
};

export async function getVisitorSessionTrail(
	fingerprint: string,
	sessionId: string,
): Promise<{ steps: SessionTrailStep[] }> {
	const rows = await sql`
    SELECT
      ts, type, path, referrer,
      meta->>'eventName' as event_name,
      meta->>'timeOnPageMs' as time_on_page_ms,
      meta->>'depth' as scroll_depth
    FROM events
    WHERE visitor_id = ${fingerprint} AND session_id = ${sessionId}
    ORDER BY ts ASC
    LIMIT 500
  `;

	const steps: SessionTrailStep[] = [];
	const stepByPath = new Map<string, SessionTrailStep>();

	for (const row of rows) {
		const eventName = row.event_name as string | null;
		const path = row.path as string | null;

		if (row.type === "pageview") {
			const step: SessionTrailStep = {
				ts: row.ts as string,
				kind: "pageview",
				path,
				name: null,
				dwellMs: null,
				scrollDepth: null,
				referrer: (row.referrer as string | null) ?? null,
			};
			steps.push(step);
			if (path) stepByPath.set(path, step);
			continue;
		}

		if (eventName === "time-on-page" && path) {
			const step = stepByPath.get(path);
			if (step) {
				step.dwellMs = (step.dwellMs ?? 0) + Math.round(Number(row.time_on_page_ms) || 0);
			}
			continue;
		}

		if (eventName === "scroll" && path) {
			const step = stepByPath.get(path);
			const depth = Math.round(Number(row.scroll_depth) || 0);
			if (step) {
				step.scrollDepth = Math.max(step.scrollDepth ?? 0, depth);
			}
			continue;
		}

		if (eventName && !NOISE_EVENT_NAMES.includes(eventName)) {
			steps.push({
				ts: row.ts as string,
				kind: "event",
				path,
				name: eventName,
				dwellMs: null,
				scrollDepth: null,
				referrer: null,
			});
		}
	}

	return { steps };
}
