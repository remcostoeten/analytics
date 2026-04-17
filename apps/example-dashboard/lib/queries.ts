import { sql } from "./db";
import type {
	KPIMetric,
	TimeSeries,
	ContentMetric,
	ReferrerMetric,
	GeoDistribution,
	DeviceBreakdown,
	SignalEvent,
	DashboardData,
} from "./types";

const COUNTRY_NAME_TO_ISO: Record<string, string> = {
	"United States": "US",
	Netherlands: "NL",
	"United Kingdom": "GB",
	Germany: "DE",
	France: "FR",
	Canada: "CA",
	Australia: "AU",
	Japan: "JP",
	Brazil: "BR",
	India: "IN",
	China: "CN",
	Spain: "ES",
	Italy: "IT",
};

function getTimeRangeFilter(hours: number = 24): { from: Date; to: Date } {
	const to = new Date();
	const from = new Date(to.getTime() - hours * 60 * 60 * 1000);
	return { from, to };
}

function formatNumber(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return n.toLocaleString();
}

function calculateTrend(
	current: number,
	previous: number,
): { value: number; direction: "up" | "down" | "flat"; isPositive: boolean } {
	if (previous === 0) return { value: 0, direction: "flat", isPositive: true };
	const change = ((current - previous) / previous) * 100;
	return {
		value: Math.abs(change),
		direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
		isPositive: change >= 0,
	};
}

export async function getPageviewsKPI(projectId?: string): Promise<KPIMetric> {
	const { from, to } = getTimeRangeFilter(24);
	const previousRange = getTimeRangeFilter(48);
	const [currentResult] =
		await sql`SELECT COUNT(*) as count FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND type = 'pageview' AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const [previousResult] =
		await sql`SELECT COUNT(*) as count FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND type = 'pageview' AND ts >= ${previousRange.from} AND ts < ${from} ${projectId ? sql`AND project_id = ${projectId}` : sql``} `;
	const current = Number(currentResult?.count || 0);
	const previous = Number(previousResult?.count || 0);
	return {
		id: "pageviews",
		label: "Pageviews",
		value: current,
		formattedValue: formatNumber(current),
		trend: calculateTrend(current, previous),
	};
}

export async function getUniqueVisitorsKPI(projectId?: string): Promise<KPIMetric> {
	const { from, to } = getTimeRangeFilter(24);
	const previousRange = getTimeRangeFilter(48);
	const [currentResult] =
		await sql`SELECT COUNT(DISTINCT visitor_id) as count FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} AND visitor_id IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const [previousResult] =
		await sql`SELECT COUNT(DISTINCT visitor_id) as count FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${previousRange.from} AND ts < ${from} AND visitor_id IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const current = Number(currentResult?.count || 0);
	const previous = Number(previousResult?.count || 0);
	return {
		id: "unique-visitors",
		label: "Unique Visitors",
		value: current,
		formattedValue: formatNumber(current),
		trend: calculateTrend(current, previous),
	};
}

export async function getSessionsKPI(projectId?: string): Promise<KPIMetric> {
	const { from, to } = getTimeRangeFilter(24);
	const [result] =
		await sql`SELECT COUNT(DISTINCT session_id) as count FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} AND session_id IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const val = Number(result?.count || 0);
	return { id: "sessions", label: "Sessions", value: val, formattedValue: formatNumber(val) };
}

export async function getEventsKPI(projectId?: string): Promise<KPIMetric> {
	const { from, to } = getTimeRangeFilter(24);
	const [result] =
		await sql`SELECT COUNT(*) as count FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const val = Number(result?.count || 0);
	return { id: "events", label: "Total Events", value: val, formattedValue: formatNumber(val) };
}

export async function getBotRateKPI(projectId?: string): Promise<KPIMetric> {
	const { from, to } = getTimeRangeFilter(24);
	const [result] =
		await sql`SELECT COUNT(*) FILTER (WHERE meta->>'botDetected' = 'true') as bots, COUNT(*) as total FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const total = Number(result?.total || 0);
	const bots = Number(result?.bots || 0);
	const rate = total > 0 ? (bots / total) * 100 : 0;
	return {
		id: "bot-rate",
		label: "Bot Rate",
		value: rate,
		formattedValue: `${rate.toFixed(1)}%`,
		unit: "%",
	};
}

export async function getErrorCountKPI(projectId?: string): Promise<KPIMetric> {
	const { from, to } = getTimeRangeFilter(24);
	const [result] =
		await sql`SELECT COUNT(*) as count FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND type = 'error' AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const val = Number(result?.count || 0);
	return { id: "errors", label: "Errors", value: val, formattedValue: formatNumber(val) };
}

export async function getPageviewsTrend(
	projectId?: string,
	hours: number = 24,
): Promise<TimeSeries> {
	const { from, to } = getTimeRangeFilter(hours);
	const results =
		await sql`SELECT date_trunc('hour', ts) as bucket, COUNT(*) as count FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND type = 'pageview' AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY bucket ORDER BY bucket ASC`;
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
): Promise<TimeSeries> {
	const { from, to } = getTimeRangeFilter(hours);
	const results =
		await sql`SELECT date_trunc('hour', ts) as bucket, COUNT(DISTINCT visitor_id) as count FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} AND visitor_id IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY bucket ORDER BY bucket ASC`;
	return {
		id: "visitors-trend",
		label: "Visitors",
		color: "hsl(var(--chart-2))",
		data: results.map((r) => ({ timestamp: new Date(r.bucket as string), value: Number(r.count) })),
	};
}

export async function getTopPages(
	projectId?: string,
	limit: number = 10,
): Promise<ContentMetric[]> {
	const { from, to } = getTimeRangeFilter(24);
	const results =
		await sql`SELECT path, COUNT(*) as views, COUNT(DISTINCT visitor_id) as unique_visitors FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND type = 'pageview' AND ts >= ${from} AND ts <= ${to} AND path IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY path ORDER BY views DESC LIMIT ${limit}`;
	return results.map((r) => ({
		path: r.path as string,
		views: Number(r.views),
		uniqueVisitors: Number(r.unique_visitors),
	}));
}

export async function getTopReferrers(
	projectId?: string,
	limit: number = 10,
): Promise<ReferrerMetric[]> {
	const { from, to } = getTimeRangeFilter(24);
	const results =
		await sql`SELECT referrer, COUNT(*) as visits FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} AND referrer IS NOT NULL AND referrer != '' ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY referrer ORDER BY visits DESC LIMIT ${limit}`;
	const total = results.reduce((sum, r) => sum + Number(r.visits), 0);
	return results.map((r) => {
		const referrer = r.referrer as string;
		let domain = referrer;
		try {
			domain = new URL(referrer).hostname;
		} catch {}
		return {
			referrer,
			domain,
			visits: Number(r.visits),
			percentage: total > 0 ? (Number(r.visits) / total) * 100 : 0,
		};
	});
}

export async function getGeoDistribution(
	projectId?: string,
	limit: number = 100,
): Promise<GeoDistribution[]> {
	const { from, to } = getTimeRangeFilter(24);
	const results =
		await sql`SELECT country, COUNT(*) as count FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} AND country IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY country ORDER BY count DESC LIMIT ${limit}`;
	const total = results.reduce((sum, r) => sum + Number(r.count), 0);
	return results.map((r) => {
		const name = r.country as string;
		const country = COUNTRY_NAME_TO_ISO[name] || name;
		return {
			country,
			count: Number(r.count),
			percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
		};
	});
}

export async function getDeviceBreakdown(projectId?: string): Promise<DeviceBreakdown[]> {
	const { from, to } = getTimeRangeFilter(24);
	const results =
		await sql`SELECT COALESCE(device_type, 'Unknown') as device_type, COUNT(*) as count FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY device_type ORDER BY count DESC`;
	const total = results.reduce((sum, r) => sum + Number(r.count), 0);
	return results.map((r) => ({
		type: r.device_type as string,
		count: Number(r.count),
		percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
	}));
}

export async function getRecentEvents(
	projectId?: string,
	limit: number = 20,
): Promise<SignalEvent[]> {
	const results =
		await sql`SELECT id, type, path, ts, country, device_type, meta FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND TRUE ${projectId ? sql`AND project_id = ${projectId}` : sql``} ORDER BY ts DESC LIMIT ${limit}`;
	return results.map((r) => {
		const meta = (r.meta as Record<string, unknown>) || {};
		const isBot = meta.botDetected === true;
		const isError = r.type === "error";
		return {
			id: String(r.id),
			type: isError ? "error" : isBot ? "warn" : "ok",
			category: r.type as string,
			message: `${r.type} on ${r.path || "/"}${r.country ? ` from ${r.country}` : ""}`,
			timestamp: new Date(r.ts as string),
			metadata: { deviceType: r.device_type, ...meta },
		};
	});
}

export async function getLocalhostRateKPI(projectId?: string): Promise<KPIMetric> {
	const { from, to } = getTimeRangeFilter(24);
	const [result] =
		await sql`SELECT COUNT(*) FILTER (WHERE is_localhost = true) as localhost, COUNT(*) as total FROM events WHERE ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const total = Number(result?.total || 0);
	const localhost = Number(result?.localhost || 0);
	const rate = total > 0 ? (localhost / total) * 100 : 0;
	return {
		id: "localhost-rate",
		label: "Localhost",
		value: rate,
		formattedValue: `${rate.toFixed(1)}%`,
		unit: "%",
	};
}

export async function getDashboardData(projectId?: string): Promise<DashboardData> {
	const { from, to } = getTimeRangeFilter(24);
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
		getPageviewsKPI(projectId),
		getUniqueVisitorsKPI(projectId),
		getSessionsKPI(projectId),
		getEventsKPI(projectId),
		getBotRateKPI(projectId),
		getErrorCountKPI(projectId),
		getLocalhostRateKPI(projectId),
		getPageviewsTrend(projectId),
		getVisitorsTrend(projectId),
		getTopPages(projectId),
		getTopReferrers(projectId),
		getGeoDistribution(projectId),
		getDeviceBreakdown(projectId),
		getRecentEvents(projectId),
		(async () => {
			const res =
				await sql`SELECT COALESCE(meta->>'browser', 'Unknown') as browser, COUNT(*) as count FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY browser ORDER BY count DESC LIMIT 10`;
			const total = res.reduce((sum: number, r: any) => sum + Number(r.count), 0);
			return res.map((r) => ({
				browser: r.browser,
				count: Number(r.count),
				percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
			}));
		})(),
		(async () => {
			const res =
				await sql`SELECT COALESCE(meta->>'os', 'Unknown') as os, COUNT(*) as count FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY os ORDER BY count DESC LIMIT 10`;
			const total = res.reduce((sum: number, r: any) => sum + Number(r.count), 0);
			return res.map((r) => ({
				os: r.os,
				count: Number(r.count),
				percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
			}));
		})(),
		(async () => {
			const res =
				await sql`SELECT COALESCE(lang, 'Unknown') as language, COUNT(*) as count FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY lang ORDER BY count DESC LIMIT 10`;
			const total = res.reduce((sum: number, r: any) => sum + Number(r.count), 0);
			return res.map((r) => ({
				language: r.language,
				count: Number(r.count),
				percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
			}));
		})(),
		(async () => {
			const res =
				await sql`SELECT COALESCE(meta->>'screenSize', 'Unknown') as screen_size, COUNT(*) as count FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY screen_size ORDER BY count DESC LIMIT 10`;
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
			localhostTraffic: localhostRateKPI.value,
			eventTypeMix: [],
		},
		realtime: { recentEvents, liveSessions: [], liveSessionCount: 0, recentBotDetections: [] },
		lastUpdated: new Date(),
		dataRange: { from, to },
	};
}

export async function getProjects() {
	const results =
		await sql`SELECT DISTINCT project_id, COUNT(*) as event_count FROM events GROUP BY project_id ORDER BY event_count DESC`;
	return results.map((r) => ({ id: r.project_id || "default", eventCount: Number(r.event_count) }));
}

export async function getOverviewExtended(from: Date, to: Date, projectId: string | null) {
	const [stats] =
		await sql`SELECT COUNT(*) as total_events, COUNT(*) FILTER (WHERE type = 'pageview') as pageviews, COUNT(DISTINCT visitor_id) as unique_visitors, COUNT(DISTINCT session_id) as sessions, COUNT(DISTINCT country) as countries, COUNT(*) FILTER (WHERE type = 'error') as errors, COUNT(*) FILTER (WHERE meta->>'botDetected' = 'true') as bot_hits, AVG(CAST(meta->>'timeOnPageMs' as float)) FILTER (WHERE meta->>'eventName' = 'time-on-page') as avg_time_on_page FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
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

export async function getGeoCities(
	from: Date,
	to: Date,
	country: string | null,
	projectId: string | null,
) {
	const results =
		await sql`SELECT city, region, country, COUNT(*) as count, COUNT(DISTINCT visitor_id) as visitors FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} AND city IS NOT NULL AND city != '' ${country ? sql`AND country = ${country}` : sql``} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY city, region, country ORDER BY count DESC LIMIT 100`;
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

export async function getReferrerDetail(
	from: Date,
	to: Date,
	domain: string,
	projectId: string | null,
) {
	const [stats] =
		await sql`SELECT COUNT(*) as total_visits, COUNT(DISTINCT visitor_id) as unique_visitors, COUNT(DISTINCT session_id) as sessions FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} AND referrer LIKE ${"%" + domain + "%"} ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const s = stats || { total_visits: 0, unique_visitors: 0, sessions: 0 };
	const landingPages =
		await sql`SELECT path, COUNT(*) as visits FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} AND referrer LIKE ${"%" + domain + "%"} AND path IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY path ORDER BY visits DESC LIMIT 10`;
	return {
		domain,
		totalVisits: Number(s.total_visits || 0),
		uniqueVisitors: Number(s.unique_visitors || 0),
		sessions: Number(s.sessions || 0),
		topLandingPages: landingPages.map((p) => ({ path: p.path, visits: Number(p.visits) })),
	};
}

export async function getWebVitals(from: Date, to: Date, projectId: string | null) {
	const results =
		await sql`SELECT AVG(CAST(meta->>'ttfb' as float)) as ttfb, AVG(CAST(meta->>'fcp' as float)) as fcp, AVG(CAST(meta->>'lcp' as float)) as lcp, AVG(CAST(meta->>'cls' as float)) as cls, AVG(CAST(meta->>'inp' as float)) as inp, COUNT(*) as sample_count FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} AND meta->>'eventName' = 'web-vitals' ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const r = results[0] || {};
	return {
		ttfb: { avg: Math.round(Number(r.ttfb) || 0), unit: "ms" },
		fcp: { avg: Math.round(Number(r.fcp) || 0), unit: "ms" },
		lcp: { avg: Math.round(Number(r.lcp) || 0), unit: "ms" },
		cls: { avg: Math.round((Number(r.cls) || 0) * 1000) / 1000, unit: "" },
		inp: { avg: Math.round(Number(r.inp) || 0), unit: "ms" },
		sampleCount: Number(r.sample_count) || 0,
	};
}

export async function getSessionStats(from: Date, to: Date, projectId: string | null) {
	const sessionData =
		await sql`WITH session_stats AS (SELECT session_id, COUNT(*) FILTER (WHERE type = 'pageview') as pageviews, MAX(ts) - MIN(ts) as duration, COUNT(DISTINCT path) as unique_pages FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} AND session_id IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY session_id) SELECT AVG(pageviews) as avg_pageviews, AVG(EXTRACT(EPOCH FROM duration)) as avg_duration_seconds, AVG(unique_pages) as avg_unique_pages, COUNT(*) as total_sessions, COUNT(*) FILTER (WHERE pageviews = 1) as single_page_sessions FROM session_stats`;
	const s = sessionData[0] || {};
	return {
		avgPageviews: Math.round((Number(s.avg_pageviews) || 0) * 10) / 10,
		avgDuration: Math.round(Number(s.avg_duration_seconds) || 0),
		avgUniquePages: Math.round((Number(s.avg_unique_pages) || 0) * 10) / 10,
		totalSessions: Number(s.total_sessions) || 0,
		bounceRate:
			s.total_sessions > 0
				? Math.round((Number(s.single_page_sessions) / Number(s.total_sessions)) * 1000) / 10
				: 0,
	};
}

export async function getUTMCampaigns(from: Date, to: Date, projectId: string | null) {
	const results =
		await sql`SELECT meta->>'utmSource' as utm_source, meta->>'utmMedium' as utm_medium, meta->>'utmCampaign' as utm_campaign, COUNT(*) as visits, COUNT(DISTINCT visitor_id) as visitors FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} AND meta->>'utmSource' IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY utm_source, utm_medium, utm_campaign ORDER BY visits DESC LIMIT 20`;
	const total = results.reduce((sum, r) => sum + Number(r.visits), 0);
	return results.map((r) => ({
		source: r.utm_source || "direct",
		medium: r.utm_medium || "none",
		campaign: r.utm_campaign || "none",
		visits: Number(r.visits),
		visitors: Number(r.visitors),
		percentage: total > 0 ? Math.round((Number(r.visits) / total) * 1000) / 10 : 0,
	}));
}

export async function getEngagementMetrics(from: Date, to: Date, projectId: string | null) {
	const topEngaged =
		await sql`SELECT path, AVG(CAST(meta->>'timeOnPageMs' as float)) as avg_time, COUNT(*) as samples FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} AND path IS NOT NULL AND meta->>'eventName' = 'time-on-page' ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY path HAVING COUNT(*) >= 3 ORDER BY avg_time DESC LIMIT 10`;
	return {
		topEngagedPages: topEngaged.map((r) => ({
			path: r.path,
			avgTimeMs: Math.round(Number(r.avg_time) || 0),
			samples: Number(r.samples),
		})),
	};
}

export async function getHourlyHeatmap(from: Date, to: Date, projectId: string | null) {
	const results =
		await sql`SELECT EXTRACT(DOW FROM ts) as day_of_week, EXTRACT(HOUR FROM ts) as hour, COUNT(*) as count FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} AND type = 'pageview' ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY day_of_week, hour ORDER BY day_of_week, hour`;
	const heatmap = Array(7)
		.fill(null)
		.map(() => Array(24).fill(0));
	let maxCount = 0;
	results.forEach((r) => {
		const val = Number(r.count);
		heatmap[Number(r.day_of_week)][Number(r.hour)] = val;
		if (val > maxCount) maxCount = val;
	});
	return {
		data: heatmap,
		maxCount,
		days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
	};
}

export async function getBrowsersDetailed(from: Date, to: Date, projectId: string | null) {
	const results =
		await sql`SELECT COALESCE(meta->>'browser', 'Unknown') as browser, COUNT(*) as count FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} AND meta->>'browser' IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY browser ORDER BY count DESC LIMIT 10`;
	const total = results.reduce((sum, r) => sum + Number(r.count), 0);
	return results.map((r) => ({
		name: r.browser,
		count: Number(r.count),
		percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
	}));
}

export async function getOSDetailed(from: Date, to: Date, projectId: string | null) {
	const results =
		await sql`SELECT COALESCE(meta->>'os', 'Unknown') as os, COUNT(*) as count FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} AND meta->>'os' IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY os ORDER BY count DESC LIMIT 10`;
	const total = results.reduce((sum, r) => sum + Number(r.count), 0);
	return results.map((r) => ({
		name: r.os,
		count: Number(r.count),
		percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
	}));
}

export async function getLanguages(from: Date, to: Date, projectId: string | null) {
	const results =
		await sql`SELECT COALESCE(lang, 'Unknown') as lang, COUNT(*) as count FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY lang ORDER BY count DESC LIMIT 10`;
	const total = results.reduce((sum, r) => sum + Number(r.count), 0);
	return results.map((r) => ({
		name: r.lang,
		count: Number(r.count),
		percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
	}));
}

export async function getScreenSizes(from: Date, to: Date, projectId: string | null) {
	const results =
		await sql`SELECT COALESCE(meta->>'screenSize', 'Unknown') as screen_size, COUNT(*) as count FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY screen_size ORDER BY count DESC LIMIT 10`;
	const total = results.reduce((sum, r) => sum + Number(r.count), 0);
	return results.map((r) => ({
		name: r.screen_size,
		count: Number(r.count),
		percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
	}));
}

export async function getConnectionTypes(from: Date, to: Date, projectId: string | null) {
	const results =
		await sql`SELECT COALESCE(meta->>'connectionType', 'Unknown') as connection_type, COUNT(*) as count FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY connection_type ORDER BY count DESC`;
	return results.map((r) => ({ type: r.connection_type, count: Number(r.count) }));
}

export async function getEntryExitPages(from: Date, to: Date, projectId: string | null) {
	const entryPages =
		await sql`WITH first_pages AS (SELECT DISTINCT ON (session_id) session_id, path FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} AND type = 'pageview' AND session_id IS NOT NULL AND path IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} ORDER BY session_id, ts ASC) SELECT path, COUNT(*) as count FROM first_pages GROUP BY path ORDER BY count DESC LIMIT 10`;
	const exitPages =
		await sql`WITH last_pages AS (SELECT DISTINCT ON (session_id) session_id, path FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} AND type = 'pageview' AND session_id IS NOT NULL AND path IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} ORDER BY session_id, ts DESC) SELECT path, COUNT(*) as count FROM last_pages GROUP BY path ORDER BY count DESC LIMIT 10`;
	return {
		entryPages: entryPages.map((r) => ({ path: r.path, count: Number(r.count) })),
		exitPages: exitPages.map((r) => ({ path: r.path, count: Number(r.count) })),
	};
}

export async function getLiveNow(projectId: string | null) {
	const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
	const [liveStats] =
		await sql`SELECT COUNT(DISTINCT visitor_id) as active_visitors, COUNT(DISTINCT session_id) as active_sessions, COUNT(*) as events_count FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${fiveMinutesAgo} ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const s = liveStats || { active_visitors: 0, active_sessions: 0, events_count: 0 };
	const activePages =
		await sql`SELECT path, COUNT(DISTINCT visitor_id) as visitors FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${fiveMinutesAgo} AND path IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY path ORDER BY visitors DESC LIMIT 10`;
	const recentActivity =
		await sql`SELECT type, path, ts FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${fiveMinutesAgo} ${projectId ? sql`AND project_id = ${projectId}` : sql``} ORDER BY ts DESC LIMIT 20`;
	const liveGeo =
		await sql`SELECT country, COUNT(DISTINCT visitor_id) as visitors FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${fiveMinutesAgo} AND country IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY country ORDER BY visitors DESC LIMIT 20`;
	return {
		activeVisitors: Number(s.active_visitors || 0),
		activeSessions: Number(s.active_sessions || 0),
		eventsPerMinute: Math.round((Number(s.events_count || 0) || 0) / 5),
		activePages: activePages.map((r) => ({ path: r.path, visitors: Number(r.visitors) })),
		recentActivity: recentActivity.map((r) => ({ type: r.type, path: r.path, timestamp: r.ts })),
		liveGeo: liveGeo.map((r) => ({
			country: COUNTRY_NAME_TO_ISO[r.country] || r.country,
			visitors: Number(r.visitors),
		})),
	};
}

export async function getRetention(projectId: string | null) {
	const fiveWeeksAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
	const retention =
		await sql`WITH visitor_cohorts AS (SELECT visitor_id, DATE_TRUNC('week', MIN(ts)) as cohort_week FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND TRUE ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY visitor_id), weekly_activity AS (SELECT e.visitor_id, vc.cohort_week, DATE_TRUNC('week', e.ts) as activity_week, EXTRACT(WEEK FROM e.ts) - EXTRACT(WEEK FROM vc.cohort_week) as weeks_since_cohort FROM events e JOIN visitor_cohorts vc ON e.visitor_id = vc.visitor_id WHERE e.ts >= ${fiveWeeksAgo} ${projectId ? sql`AND e.project_id = ${projectId}` : sql``}) SELECT cohort_week, weeks_since_cohort::int as week_number, COUNT(DISTINCT visitor_id) as visitors FROM weekly_activity WHERE weeks_since_cohort >= 0 AND weeks_since_cohort <= 4 GROUP BY cohort_week, weeks_since_cohort ORDER BY cohort_week, week_number`;
	const cohortMap = new Map();
	const cohortSizes = new Map();
	retention.forEach((r) => {
		const cohort = new Date(r.cohort_week).toISOString().split("T")[0];
		if (!cohortMap.has(cohort)) cohortMap.set(cohort, new Map());
		const weekNum = Number(r.week_number);
		cohortMap.get(cohort).set(weekNum, Number(r.visitors));
		if (weekNum === 0) cohortSizes.set(cohort, Number(r.visitors));
	});
	const cohorts = Array.from(cohortMap.entries())
		.map(([cohort, weeks]) => {
			const size = cohortSizes.get(cohort) || 1;
			return {
				cohort,
				size,
				retention: [0, 1, 2, 3, 4].map((w) => ({
					week: w,
					visitors: weeks.get(w) || 0,
					rate: weeks.has(w) ? Math.round((weeks.get(w) / size) * 100) : 0,
				})),
			};
		})
		.slice(-5);
	return { cohorts };
}

export async function getTopPaths(from: Date, to: Date, projectId: string | null) {
	const paths =
		await sql`WITH session_paths AS (SELECT session_id, ARRAY_AGG(path ORDER BY ts) as path_sequence FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} AND type = 'pageview' AND session_id IS NOT NULL AND path IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY session_id HAVING COUNT(*) > 1), path_strings AS (SELECT array_to_string(path_sequence[1:5], ' → ') as path, COUNT(*) as count FROM session_paths GROUP BY path) SELECT * FROM path_strings ORDER BY count DESC LIMIT 15`;
	const total = paths.reduce((s, r) => s + Number(r.count), 0);
	return paths.map((r) => ({
		path: r.path,
		count: Number(r.count),
		percentage: total > 0 ? Math.round((Number(r.count) / total) * 1000) / 10 : 0,
	}));
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
		await sql`SELECT COUNT(*) as events, COUNT(*) FILTER (WHERE type = 'pageview') as pageviews, COUNT(DISTINCT visitor_id) as visitors, COUNT(DISTINCT session_id) as sessions, COALESCE(SUM(CAST(meta->>'revenue' AS numeric)), 0) as revenue, COUNT(*) FILTER (WHERE path = '/signup') as signups, AVG(CAST(meta->>'timeOnPageMs' AS float)) FILTER (WHERE meta->>'eventName' = 'time-on-page') as avg_time FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``} ${segmentFilter}`;
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
		await sql`SELECT COALESCE(meta->'userProperties'->>'plan', 'unknown') as plan, COUNT(DISTINCT visitor_id) as visitors FROM events WHERE (is_localhost = false OR is_localhost IS NULL) AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY plan`;
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

export async function getRecentVisitors(projectId: string | null, limit: number = 50) {
	const results = await sql`
    SELECT
      id,
      fingerprint,
      first_seen,
      last_seen,
      visit_count,
      is_internal,
      COALESCE(device_type, 'Unknown') as device_type,
      COALESCE(browser, 'Unknown') as browser,
      COALESCE(os, 'Unknown') as os,
      COALESCE(browser_version, 'Unknown') as browser_version,
      COALESCE(os_version, 'Unknown') as os_version,
      COALESCE(screen_resolution, 'Unknown') as screen_resolution,
      COALESCE(language, 'Unknown') as language,
      country,
      region,
      city
    FROM visitors
    WHERE is_internal = false
    ORDER BY last_seen DESC
    LIMIT ${limit}
  `;
	return results.map((r) => ({
		id: String(r.id),
		fingerprint: r.fingerprint,
		firstSeen: r.first_seen,
		lastSeen: r.last_seen,
		visitCount: Number(r.visit_count),
		isInternal: r.is_internal,
		deviceType: r.device_type,
		browser: r.browser,
		os: r.os,
		browserVersion: r.browser_version,
		osVersion: r.os_version,
		screenResolution: r.screen_resolution,
		language: r.language,
		country: COUNTRY_NAME_TO_ISO[r.country] || r.country,
		region: r.region,
		city: r.city,
	}));
}
