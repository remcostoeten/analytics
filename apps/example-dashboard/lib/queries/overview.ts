import { sql } from "../db";
import type { TimeSeries, DashboardData } from "../types";
import { publicTraffic, getRange, getTimeRangeFilter, formatNumber, calculateTrend } from "./filters";
import {
	getPageviewsKPI,
	getUniqueVisitorsKPI,
	getSessionsKPI,
	getEventsKPI,
	getBotRateKPI,
	getErrorCountKPI,
	getLocalhostRateKPI,
} from "./kpis";
import { getTopPages, getTopReferrers, getGeoDistribution, getEntryExitPages } from "./content";
import { getDeviceBreakdown } from "./audience";
import { getRecentEvents } from "./realtime";

export async function getPageviewsTrend(
	projectId?: string,
	hours: number = 24,
	from?: Date,
	to?: Date,
): Promise<TimeSeries> {
	const range = from && to ? { from, to } : getTimeRangeFilter(hours);
	const results =
		await sql`SELECT date_trunc('hour', ts) as bucket, COUNT(*) as count FROM events WHERE ${publicTraffic()} AND type = 'pageview' AND ts >= ${range.from} AND ts <= ${range.to} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY bucket ORDER BY bucket ASC`;
	return {
		id: "pageviews-trend",
		label: "Pageviews",
		color: "hsl(var(--chart-1))",
		data: results.map((r) => ({ timestamp: new Date(r.bucket as string), value: Number(r.count) })),
	};
}

export async function getVisitorsTrend(
	projectId?: string,
	hours: number = 24,
	from?: Date,
	to?: Date,
): Promise<TimeSeries> {
	const range = from && to ? { from, to } : getTimeRangeFilter(hours);
	const results =
		await sql`SELECT date_trunc('hour', ts) as bucket, COUNT(DISTINCT visitor_id) as count FROM events WHERE ${publicTraffic()} AND ts >= ${range.from} AND ts <= ${range.to} AND visitor_id IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY bucket ORDER BY bucket ASC`;
	return {
		id: "visitors-trend",
		label: "Visitors",
		color: "hsl(var(--chart-2))",
		data: results.map((r) => ({ timestamp: new Date(r.bucket as string), value: Number(r.count) })),
	};
}

export async function getProjects() {
	const results =
		await sql`SELECT DISTINCT project_id, COUNT(*) as event_count FROM events WHERE ${publicTraffic()} GROUP BY project_id ORDER BY event_count DESC`;
	return results.map((r) => ({ id: r.project_id || "default", eventCount: Number(r.event_count) }));
}

export async function getOverviewExtended(from: Date, to: Date, projectId: string | null) {
	const [stats] =
		await sql`SELECT COUNT(*) as total_events, COUNT(*) FILTER (WHERE type = 'pageview') as pageviews, COUNT(DISTINCT visitor_id) as unique_visitors, COUNT(DISTINCT session_id) as sessions, COUNT(DISTINCT country) as countries, COUNT(*) FILTER (WHERE type = 'error') as errors, COUNT(*) FILTER (WHERE bot_detected = true OR meta->>'botDetected' = 'true') as bot_hits, AVG(CAST(meta->>'timeOnPageMs' as float)) FILTER (WHERE meta->>'eventName' = 'time-on-page') as avg_time_on_page FROM events WHERE ${publicTraffic()} AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const s = stats || {
		total_events: 0,
		pageviews: 0,
		unique_visitors: 0,
		sessions: 0,
		countries: 0,
		errors: 0,
		bot_hits: 0,
		avg_time_on_page: 0,
	};
	return {
		totalEvents: Number(s.total_events || 0),
		pageviews: Number(s.pageviews || 0),
		uniqueVisitors: Number(s.unique_visitors || 0),
		sessions: Number(s.sessions || 0),
		countries: Number(s.countries || 0),
		errors: Number(s.errors || 0),
		botHits: Number(s.bot_hits || 0),
		avgTimeOnPage: Math.round(Number(s.avg_time_on_page || 0)),
	};
}

export async function getSegmentedMetrics(
	from: Date,
	to: Date,
	segment: string,
	projectId: string | null,
) {
	let segmentFilter = sql``;
	if (segment === "pro") segmentFilter = sql`AND meta->'userProperties'->>'plan' = 'pro'`;
	else if (segment === "free") segmentFilter = sql`AND meta->'userProperties'->>'plan' = 'free'`;
	const [metrics] =
		await sql`SELECT COUNT(*) as events, COUNT(*) FILTER (WHERE type = 'pageview') as pageviews, COUNT(DISTINCT visitor_id) as visitors, COUNT(DISTINCT session_id) as sessions, COALESCE(SUM(CAST(meta->>'revenue' AS numeric)), 0) as revenue, COUNT(*) FILTER (WHERE path = '/signup') as signups, AVG(CAST(meta->>'timeOnPageMs' AS float)) FILTER (WHERE meta->>'eventName' = 'time-on-page') as avg_time FROM events WHERE ${publicTraffic()} AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``} ${segmentFilter}`;
	const m = metrics || {
		events: 0,
		pageviews: 0,
		visitors: 0,
		sessions: 0,
		revenue: 0,
		signups: 0,
		avg_time: 0,
	};
	const planDist =
		await sql`SELECT COALESCE(meta->'userProperties'->>'plan', 'unknown') as plan, COUNT(DISTINCT visitor_id) as visitors FROM events WHERE ${publicTraffic()} AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY plan`;
	return {
		segment,
		events: Number(m.events || 0),
		pageviews: Number(m.pageviews || 0),
		visitors: Number(m.visitors || 0),
		sessions: Number(m.sessions || 0),
		revenue: Number(m.revenue || 0),
		signups: Number(m.signups || 0),
		avgTimeOnPage: Math.round(Number(m.avg_time || 0) || 0),
		planDistribution: planDist.map((r) => ({ plan: r.plan, visitors: Number(r.visitors) })),
	};
}

export async function getDashboardData(
	projectId?: string,
	from?: Date,
	to?: Date,
): Promise<DashboardData> {
	const range = getRange(from, to);
	const [
		pageviewsKPI,
		uniqueVisitorsKPI,
		sessionsKPI,
		eventsKPI,
		botRateKPI,
		errorsKPI,
		localhostRateKPI,
		pageviewsTrend,
		visitorsTrend,
		topPages,
		topReferrers,
		geoByCountry,
		devices,
		recentEvents,
		browsersData,
		osData,
		langsData,
		screensData,
	] = await Promise.all([
		getPageviewsKPI(projectId, range.from, range.to),
		getUniqueVisitorsKPI(projectId, range.from, range.to),
		getSessionsKPI(projectId, range.from, range.to),
		getEventsKPI(projectId, range.from, range.to),
		getBotRateKPI(projectId, range.from, range.to),
		getErrorCountKPI(projectId, range.from, range.to),
		getLocalhostRateKPI(projectId, range.from, range.to),
		getPageviewsTrend(projectId, 24, range.from, range.to),
		getVisitorsTrend(projectId, 24, range.from, range.to),
		getTopPages(projectId, 10, range.from, range.to),
		getTopReferrers(projectId, 10, range.from, range.to),
		getGeoDistribution(projectId, 100, range.from, range.to),
		getDeviceBreakdown(projectId, range.from, range.to),
		getRecentEvents(projectId, 20, range.from, range.to),
		(async () => {
			const res =
				await sql`SELECT COALESCE(meta->>'browser', 'Unknown') as browser, COUNT(*) as count FROM events WHERE ${publicTraffic()} AND ts >= ${range.from} AND ts <= ${range.to} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY browser ORDER BY count DESC LIMIT 10`;
			const total = res.reduce((sum: number, r: any) => sum + Number(r.count), 0);
			return res.map((r) => ({
				browser: r.browser,
				count: Number(r.count),
				percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
			}));
		})(),
		(async () => {
			const res =
				await sql`SELECT COALESCE(meta->>'os', 'Unknown') as os, COUNT(*) as count FROM events WHERE ${publicTraffic()} AND ts >= ${range.from} AND ts <= ${range.to} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY os ORDER BY count DESC LIMIT 10`;
			const total = res.reduce((sum: number, r: any) => sum + Number(r.count), 0);
			return res.map((r) => ({
				os: r.os,
				count: Number(r.count),
				percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
			}));
		})(),
		(async () => {
			const res =
				await sql`SELECT COALESCE(lang, 'Unknown') as language, COUNT(*) as count FROM events WHERE ${publicTraffic()} AND ts >= ${range.from} AND ts <= ${range.to} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY lang ORDER BY count DESC LIMIT 10`;
			const total = res.reduce((sum: number, r: any) => sum + Number(r.count), 0);
			return res.map((r) => ({
				language: r.language,
				count: Number(r.count),
				percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
			}));
		})(),
		(async () => {
			const res =
				await sql`SELECT COALESCE(meta->>'screenSize', 'Unknown') as screen_size, COUNT(*) as count FROM events WHERE ${publicTraffic()} AND ts >= ${range.from} AND ts <= ${range.to} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY screen_size ORDER BY count DESC LIMIT 10`;
			const total = res.reduce((sum: number, r: any) => sum + Number(r.count), 0);
			return res.map((r) => ({
				screenSize: r.screen_size,
				count: Number(r.count),
				percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
			}));
		})(),
	]);

	return {
		kpis: {
			pageviews: pageviewsKPI,
			uniqueVisitors: uniqueVisitorsKPI,
			sessions: sessionsKPI,
			events: eventsKPI,
			botRate: botRateKPI,
			localhostRate: localhostRateKPI,
			errorCount: errorsKPI,
		},
		trends: {
			pageviews: pageviewsTrend,
			visitors: visitorsTrend,
			sessions: { id: "sessions-trend", label: "Sessions", data: [] },
			eventsByType: [],
			botVsHuman: [],
		},
		content: { topPages, topReferrers, entryPages: [], exitPages: [] },
		audience: {
			geoByCountry,
			geoByRegion: [],
			geoByCity: [],
			devices,
			browsers: browsersData.map((b: any) => ({ name: b.browser, ...b })),
			os: osData.map((o: any) => ({ name: o.os, ...o })),
			languages: langsData.map((l: any) => ({ name: l.language, ...l })),
			screenResolutions: screensData.map((s: any) => ({ name: s.screenSize, ...s })),
		},
		quality: {
			botTraffic: [],
			totalBotEvents: 0,
			dedupedEventCount: 0,
			ingestionRate: 0,
			errorRate: 0,
			localhostTraffic: Number(localhostRateKPI.value),
			eventTypeMix: [],
		},
		realtime: { recentEvents, liveSessions: [], liveSessionCount: 0, recentBotDetections: [] },
		lastUpdated: new Date(),
		dataRange: range,
	};
}
