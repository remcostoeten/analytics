import { sql } from "../db";
import type { ContentMetric, ReferrerMetric, GeoDistribution } from "../types";
import {
	publicTraffic,
	externalReferrer,
	getRange,
	getTimeRangeFilter,
	COUNTRY_NAME_TO_ISO,
	geoScopeFilter,
	type GeoScope,
} from "./filters";

export async function getTopPages(
	projectId?: string,
	limit: number = 10,
	from?: Date,
	to?: Date,
	excludeVisitorId?: string | null,
	origin?: string | null,
	geo?: GeoScope | null,
): Promise<ContentMetric[]> {
	const range = getRange(from, to);
	const results =
		await sql`SELECT host, path, COUNT(*) as views, COUNT(DISTINCT visitor_id) as unique_visitors FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} ${geoScopeFilter(geo?.country, geo?.region)} AND type = 'pageview' AND ts >= ${range.from} AND ts <= ${range.to} AND path IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY host, path ORDER BY views DESC LIMIT ${limit}`;
	return results.map((r) => ({
		host: r.host as string,
		path: r.path as string,
		views: Number(r.views),
		uniqueVisitors: Number(r.unique_visitors),
	}));
}

export async function getTopReferrers(
	projectId?: string,
	limit: number = 10,
	from?: Date,
	to?: Date,
	excludeVisitorId?: string | null,
	origin?: string | null,
	geo?: GeoScope | null,
): Promise<ReferrerMetric[]> {
	const range = getRange(from, to);
	const results =
		await sql`WITH ref AS (SELECT regexp_replace(referrer, '^[a-zA-Z][a-zA-Z0-9+.-]*://([^/]+).*$', '\\1') as domain FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} ${geoScopeFilter(geo?.country, geo?.region)} AND ts >= ${range.from} AND ts <= ${range.to} AND referrer IS NOT NULL AND referrer != '' AND ${externalReferrer()} ${projectId ? sql`AND project_id = ${projectId}` : sql``}) SELECT domain, COUNT(*) as visits FROM ref GROUP BY domain ORDER BY visits DESC LIMIT ${limit}`;
	const total = results.reduce((sum, r) => sum + Number(r.visits), 0);
	return results.map((r) => {
		const domain = r.domain as string;
		return {
			referrer: domain,
			domain,
			visits: Number(r.visits),
			percentage: total > 0 ? (Number(r.visits) / total) * 100 : 0,
		};
	});
}

export async function getReferrerDetail(
	from: Date,
	to: Date,
	domain: string,
	projectId: string | null,
	excludeVisitorId?: string | null,
	origin?: string | null,
) {
	const [stats] =
		await sql`SELECT COUNT(*) as total_visits, COUNT(DISTINCT visitor_id) as unique_visitors, COUNT(DISTINCT session_id) as sessions FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} AND referrer LIKE ${"%" + domain + "%"} ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const s = stats || { total_visits: 0, unique_visitors: 0, sessions: 0 };
	const landingPages =
		await sql`SELECT path, COUNT(*) as visits FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} AND referrer LIKE ${"%" + domain + "%"} AND path IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY path ORDER BY visits DESC LIMIT 10`;
	return {
		domain,
		totalVisits: Number(s.total_visits || 0),
		uniqueVisitors: Number(s.unique_visitors || 0),
		sessions: Number(s.sessions || 0),
		topLandingPages: landingPages.map((p) => ({ path: p.path, visits: Number(p.visits) })),
	};
}

export async function getGeoDistribution(
	projectId?: string,
	limit: number = 100,
	from?: Date,
	to?: Date,
	excludeVisitorId?: string | null,
	origin?: string | null,
): Promise<GeoDistribution[]> {
	const range = from && to ? { from, to } : getTimeRangeFilter(24);
	const results =
		await sql`SELECT country, COUNT(*) as count FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${range.from} AND ts <= ${range.to} AND country IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY country ORDER BY count DESC LIMIT ${limit}`;
	const total = results.reduce((sum, r) => sum + Number(r.count), 0);
	return results.map((r) => {
		const name = r.country as string;
		return {
			country: name,
			countryCode: COUNTRY_NAME_TO_ISO[name],
			count: Number(r.count),
			percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
		};
	});
}

export async function getGeoCities(
	from: Date,
	to: Date,
	country: string | null,
	projectId: string | null,
	excludeVisitorId?: string | null,
	origin?: string | null,
) {
	const results =
		await sql`SELECT city, region, country, COUNT(*) as count, COUNT(DISTINCT visitor_id) as visitors FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} AND city IS NOT NULL AND city != '' ${country ? sql`AND country = ${country}` : sql``} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY city, region, country ORDER BY count DESC LIMIT 100`;
	const total = results.reduce((sum, r) => sum + Number(r.count), 0);
	return results.map((r) => ({
		city: r.city,
		region: r.region,
		country: r.country,
		count: Number(r.count),
		visitors: Number(r.visitors),
		percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
	}));
}

export async function getCityPoints(
	from: Date,
	to: Date,
	projectId: string | null,
	country?: string | null,
	excludeVisitorId?: string | null,
	origin?: string | null,
) {
	const results =
		await sql`SELECT city, region, country, AVG(latitude)::numeric as latitude, AVG(longitude)::numeric as longitude, COUNT(*) as events, COUNT(DISTINCT visitor_id) as visitors FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} AND city IS NOT NULL AND city != '' AND latitude IS NOT NULL AND longitude IS NOT NULL ${country ? sql`AND country = ${country}` : sql``} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY city, region, country HAVING COUNT(DISTINCT visitor_id) >= 3 ORDER BY events DESC LIMIT 500`;
	return results.map((r) => {
		const name = r.country as string;
		return {
			city: r.city as string,
			region: (r.region as string) || null,
			country: name,
			countryCode:
				COUNTRY_NAME_TO_ISO[name] || (/^[A-Za-z]{2}$/.test(name) ? name.toUpperCase() : null),
			latitude: Number(r.latitude),
			longitude: Number(r.longitude),
			events: Number(r.events),
			visitors: Number(r.visitors),
		};
	});
}

export async function getGeoDetail(
	from: Date,
	to: Date,
	projectId: string | null,
	excludeVisitorId?: string | null,
	origin?: string | null,
) {
	const countries =
		await sql`SELECT country, COUNT(*) as count, COUNT(DISTINCT visitor_id) as visitors, COUNT(DISTINCT session_id) as sessions FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} AND country IS NOT NULL AND country != '' ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY country ORDER BY count DESC LIMIT 12`;
	const regions =
		await sql`SELECT region, country, COUNT(*) as count, COUNT(DISTINCT visitor_id) as visitors FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} AND region IS NOT NULL AND region != '' ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY region, country ORDER BY count DESC LIMIT 12`;
	const cities =
		await sql`SELECT city, region, country, COUNT(*) as count, COUNT(DISTINCT visitor_id) as visitors, COUNT(DISTINCT session_id) as sessions FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} AND city IS NOT NULL AND city != '' ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY city, region, country ORDER BY count DESC LIMIT 16`;
	const [quality] =
		await sql`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE country IS NOT NULL AND country != '') as country_known, COUNT(*) FILTER (WHERE region IS NOT NULL AND region != '') as region_known, COUNT(*) FILTER (WHERE city IS NOT NULL AND city != '') as city_known FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const total = Number(quality?.total || 0);
	function percent(value: number) {
		return total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
	}
	return {
		countries: countries.map((r) => ({
			country: r.country,
			countryCode: COUNTRY_NAME_TO_ISO[r.country],
			count: Number(r.count),
			visitors: Number(r.visitors),
			sessions: Number(r.sessions),
		})),
		regions: regions.map((r) => ({
			region: r.region,
			country: r.country,
			countryCode: COUNTRY_NAME_TO_ISO[r.country],
			count: Number(r.count),
			visitors: Number(r.visitors),
		})),
		cities: cities.map((r) => ({
			city: r.city,
			region: r.region,
			country: r.country,
			countryCode: COUNTRY_NAME_TO_ISO[r.country],
			count: Number(r.count),
			visitors: Number(r.visitors),
			sessions: Number(r.sessions),
		})),
		quality: {
			total,
			countryKnown: percent(Number(quality?.country_known || 0)),
			regionKnown: percent(Number(quality?.region_known || 0)),
			cityKnown: percent(Number(quality?.city_known || 0)),
		},
	};
}

export async function getEntryExitPages(
	from: Date,
	to: Date,
	projectId: string | null,
	excludeVisitorId?: string | null,
	origin?: string | null,
) {
	const entryPages =
		await sql`WITH first_pages AS (SELECT DISTINCT ON (session_id) session_id, path FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} AND type = 'pageview' AND session_id IS NOT NULL AND path IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} ORDER BY session_id, ts ASC) SELECT path, COUNT(*) as count FROM first_pages GROUP BY path ORDER BY count DESC LIMIT 10`;
	const exitPages =
		await sql`WITH last_pages AS (SELECT DISTINCT ON (session_id) session_id, path FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} AND type = 'pageview' AND session_id IS NOT NULL AND path IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} ORDER BY session_id, ts DESC) SELECT path, COUNT(*) as count FROM last_pages GROUP BY path ORDER BY count DESC LIMIT 10`;
	return {
		entryPages: entryPages.map((r) => ({ path: r.path, count: Number(r.count) })),
		exitPages: exitPages.map((r) => ({ path: r.path, count: Number(r.count) })),
	};
}

export async function getTopPaths(
	from: Date,
	to: Date,
	projectId: string | null,
	excludeVisitorId?: string | null,
	origin?: string | null,
) {
	const paths =
		await sql`WITH session_paths AS (SELECT session_id, ARRAY_AGG(path ORDER BY ts) as path_sequence FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} AND type = 'pageview' AND session_id IS NOT NULL AND path IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY session_id HAVING COUNT(*) > 1), path_strings AS (SELECT array_to_string(path_sequence[1:5], ' → ') as path, COUNT(*) as count FROM session_paths GROUP BY path) SELECT * FROM path_strings ORDER BY count DESC LIMIT 15`;
	const total = paths.reduce((s, r) => s + Number(r.count), 0);
	return paths.map((r) => ({
		path: r.path,
		count: Number(r.count),
		percentage: total > 0 ? Math.round((Number(r.count) / total) * 1000) / 10 : 0,
	}));
}

export async function getCountryDetail(
	from: Date,
	to: Date,
	country: string,
	projectId: string | null,
	excludeVisitorId?: string | null,
	origin?: string | null,
) {
	const [stats] =
		await sql`SELECT COUNT(*) as total_events, COUNT(DISTINCT visitor_id) as unique_visitors, COUNT(DISTINCT session_id) as sessions FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} AND country = ${country} ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const s = stats || { total_events: 0, unique_visitors: 0, sessions: 0 };

	const topCities =
		await sql`SELECT city, COUNT(*) as count FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} AND country = ${country} AND city IS NOT NULL AND city != '' ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY city ORDER BY count DESC LIMIT 8`;
	const cityPoints = await getCityPoints(from, to, projectId, country, excludeVisitorId, origin);

	const topRegions =
		await sql`SELECT region, COUNT(*) as count FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} AND country = ${country} AND region IS NOT NULL AND region != '' ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY region ORDER BY count DESC LIMIT 6`;

	const topPages =
		await sql`SELECT path, COUNT(*) as count FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} AND country = ${country} AND type = 'pageview' AND path IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY path ORDER BY count DESC LIMIT 8`;

	const topReferrers =
		await sql`SELECT referrer, COUNT(*) as count FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} AND country = ${country} AND referrer IS NOT NULL AND referrer != '' AND ${externalReferrer()} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY referrer ORDER BY count DESC LIMIT 6`;

	const recentVisitors =
		await sql`WITH recent AS (SELECT visitor_id, MAX(ts) as last_seen, MIN(ts) as first_seen, COUNT(*) as events, COUNT(DISTINCT session_id) as sessions, (ARRAY_AGG(city ORDER BY ts DESC) FILTER (WHERE city IS NOT NULL AND city != ''))[1] as city, (ARRAY_AGG(region ORDER BY ts DESC) FILTER (WHERE region IS NOT NULL AND region != ''))[1] as region FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} AND country = ${country} AND visitor_id IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY visitor_id ORDER BY last_seen DESC LIMIT 15) SELECT r.*, v.device_type, v.browser, v.os FROM recent r LEFT JOIN LATERAL (SELECT device_type, browser, os FROM visitors WHERE fingerprint = r.visitor_id LIMIT 1) v ON true ORDER BY r.last_seen DESC`;

	const recentEvents =
		await sql`SELECT visitor_id, type, path, ts, city, meta->>'eventName' as event_name FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} AND country = ${country} ${projectId ? sql`AND project_id = ${projectId}` : sql``} ORDER BY ts DESC LIMIT 25`;

	const spanMs = to.getTime() - from.getTime();
	const prevFrom = new Date(from.getTime() - spanMs);
	const [prevStats] =
		await sql`SELECT COUNT(*) as total_events, COUNT(DISTINCT visitor_id) as unique_visitors, COUNT(DISTINCT session_id) as sessions FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${prevFrom} AND ts < ${from} AND country = ${country} ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;

	const trend =
		await sql`SELECT DATE_TRUNC('day', ts) as day, COUNT(*) as events, COUNT(DISTINCT visitor_id) as visitors FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} AND country = ${country} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY day ORDER BY day`;

	const [audience] =
		await sql`WITH in_range AS (SELECT DISTINCT visitor_id FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} AND country = ${country} AND visitor_id IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``}), firsts AS (SELECT e.visitor_id, MIN(e.ts) as first_ever FROM events e JOIN in_range r ON r.visitor_id = e.visitor_id GROUP BY e.visitor_id) SELECT COUNT(*) FILTER (WHERE first_ever >= ${from}) as new_visitors, COUNT(*) FILTER (WHERE first_ever < ${from}) as returning_visitors FROM firsts`;

	const [sessionStats] =
		await sql`WITH session_stats AS (SELECT session_id, COUNT(*) FILTER (WHERE type = 'pageview') as pageviews, MAX(ts) - MIN(ts) as duration FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} AND country = ${country} AND session_id IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY session_id) SELECT AVG(pageviews) as avg_pageviews, AVG(EXTRACT(EPOCH FROM duration)) as avg_duration_seconds, COUNT(*) as total_sessions, COUNT(*) FILTER (WHERE pageviews <= 1) as single_page_sessions FROM session_stats`;

	const topEvents =
		await sql`SELECT COALESCE(meta->>'eventName', 'unnamed') as name, COUNT(*) as count, COUNT(DISTINCT visitor_id) as visitors FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} AND country = ${country} AND type = 'event' ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY name ORDER BY count DESC LIMIT 8`;

	const techRows =
		await sql`WITH vis AS (SELECT DISTINCT visitor_id FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} AND country = ${country} AND visitor_id IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``}) SELECT v.device_type, v.browser, v.os, COUNT(*) as count FROM vis LEFT JOIN LATERAL (SELECT device_type, browser, os FROM visitors WHERE fingerprint = vis.visitor_id LIMIT 1) v ON true GROUP BY v.device_type, v.browser, v.os ORDER BY count DESC`;

	const heatmapRows =
		await sql`SELECT EXTRACT(DOW FROM ts) as day_of_week, EXTRACT(HOUR FROM ts) as hour, COUNT(*) as count FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} AND country = ${country} AND type = 'pageview' ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY day_of_week, hour ORDER BY day_of_week, hour`;

	const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
	const [liveNow] =
		await sql`SELECT COUNT(DISTINCT visitor_id) as active_visitors FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${fiveMinutesAgo} AND country = ${country} ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;

	const heatmapGrid = Array(7)
		.fill(null)
		.map(() => Array(24).fill(0));
	let heatmapMax = 0;
	heatmapRows.forEach((r) => {
		const val = Number(r.count);
		heatmapGrid[Number(r.day_of_week)][Number(r.hour)] = val;
		if (val > heatmapMax) heatmapMax = val;
	});

	function aggregateTech(key: "device_type" | "browser" | "os") {
		const counts = new Map<string, number>();
		techRows.forEach((r) => {
			const label = (r[key] as string) || "Unknown";
			counts.set(label, (counts.get(label) ?? 0) + Number(r.count));
		});
		return [...counts.entries()]
			.map(([label, count]) => ({ label, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 5);
	}

	function extractDomain(ref: string): string {
		try {
			return new URL(ref).hostname;
		} catch {
			return ref;
		}
	}

	return {
		country,
		totalEvents: Number(s.total_events || 0),
		uniqueVisitors: Number(s.unique_visitors || 0),
		sessions: Number(s.sessions || 0),
		topCities: topCities.map((r) => ({ city: r.city, count: Number(r.count) })),
		cityPoints,
		topRegions: topRegions.map((r) => ({ region: r.region, count: Number(r.count) })),
		topPages: topPages.map((r) => ({ path: r.path, count: Number(r.count) })),
		topReferrers: topReferrers.map((r) => ({
			referrer: extractDomain(r.referrer),
			count: Number(r.count),
		})),
		recentVisitors: recentVisitors.map((r) => ({
			fingerprint: r.visitor_id as string,
			lastSeen: r.last_seen as string,
			firstSeen: r.first_seen as string,
			events: Number(r.events),
			sessions: Number(r.sessions),
			city: (r.city as string) || null,
			region: (r.region as string) || null,
			deviceType: (r.device_type as string) || null,
			browser: (r.browser as string) || null,
			os: (r.os as string) || null,
		})),
		recentEvents: recentEvents.map((r) => ({
			fingerprint: r.visitor_id as string,
			type: r.type as string,
			path: (r.path as string) || null,
			timestamp: r.ts as string,
			city: (r.city as string) || null,
			eventName: (r.event_name as string) || null,
		})),
		previous: {
			totalEvents: Number(prevStats?.total_events || 0),
			uniqueVisitors: Number(prevStats?.unique_visitors || 0),
			sessions: Number(prevStats?.sessions || 0),
		},
		trend: trend.map((r) => ({
			day: r.day as string,
			events: Number(r.events),
			visitors: Number(r.visitors),
		})),
		audience: {
			newVisitors: Number(audience?.new_visitors || 0),
			returningVisitors: Number(audience?.returning_visitors || 0),
		},
		engagement: {
			avgPageviews: Math.round(Number(sessionStats?.avg_pageviews || 0) * 10) / 10,
			avgDurationSeconds: Math.round(Number(sessionStats?.avg_duration_seconds || 0)),
			bounceRate:
				Number(sessionStats?.total_sessions || 0) > 0
					? Math.round(
							(Number(sessionStats?.single_page_sessions || 0) /
								Number(sessionStats?.total_sessions)) *
								1000,
						) / 10
					: 0,
		},
		topEvents: topEvents.map((r) => ({
			name: r.name as string,
			count: Number(r.count),
			visitors: Number(r.visitors),
		})),
		technology: {
			devices: aggregateTech("device_type"),
			browsers: aggregateTech("browser"),
			os: aggregateTech("os"),
		},
		heatmap: {
			data: heatmapGrid,
			maxCount: heatmapMax,
			days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
		},
		liveVisitors: Number(liveNow?.active_visitors || 0),
	};
}
