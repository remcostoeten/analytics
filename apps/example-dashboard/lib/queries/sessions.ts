import { sql } from "../db";
import { publicTraffic } from "./filters";

export async function getSessionStats(from: Date, to: Date, projectId: string | null) {
	const sessionData =
		await sql`WITH session_stats AS (SELECT session_id, COUNT(*) FILTER (WHERE type = 'pageview') as pageviews, MAX(ts) - MIN(ts) as duration, COUNT(DISTINCT path) as unique_pages FROM events WHERE ${publicTraffic()} AND ts >= ${from} AND ts <= ${to} AND session_id IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY session_id) SELECT AVG(pageviews) as avg_pageviews, AVG(EXTRACT(EPOCH FROM duration)) as avg_duration_seconds, AVG(unique_pages) as avg_unique_pages, COUNT(*) as total_sessions, COUNT(*) FILTER (WHERE pageviews = 1) as single_page_sessions FROM session_stats`;
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

export async function getEngagementMetrics(from: Date, to: Date, projectId: string | null) {
	const topEngaged =
		await sql`SELECT path, AVG(CAST(meta->>'timeOnPageMs' as float)) as avg_time, COUNT(*) as samples FROM events WHERE ${publicTraffic()} AND ts >= ${from} AND ts <= ${to} AND path IS NOT NULL AND meta->>'eventName' = 'time-on-page' ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY path HAVING COUNT(*) >= 3 ORDER BY avg_time DESC LIMIT 10`;
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
		await sql`SELECT EXTRACT(DOW FROM ts) as day_of_week, EXTRACT(HOUR FROM ts) as hour, COUNT(*) as count FROM events WHERE ${publicTraffic()} AND ts >= ${from} AND ts <= ${to} AND type = 'pageview' ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY day_of_week, hour ORDER BY day_of_week, hour`;
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

export async function getRetention(projectId: string | null) {
	const fiveWeeksAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
	const retention =
		await sql`WITH visitor_cohorts AS (SELECT visitor_id, DATE_TRUNC('week', MIN(ts)) as cohort_week FROM events WHERE ${publicTraffic()} AND TRUE ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY visitor_id), weekly_activity AS (SELECT e.visitor_id, vc.cohort_week, DATE_TRUNC('week', e.ts) as activity_week, EXTRACT(WEEK FROM e.ts) - EXTRACT(WEEK FROM vc.cohort_week) as weeks_since_cohort FROM events e JOIN visitor_cohorts vc ON e.visitor_id = vc.visitor_id WHERE e.ts >= ${fiveWeeksAgo} ${projectId ? sql`AND e.project_id = ${projectId}` : sql``}) SELECT cohort_week, weeks_since_cohort::int as week_number, COUNT(DISTINCT visitor_id) as visitors FROM weekly_activity WHERE weeks_since_cohort >= 0 AND weeks_since_cohort <= 4 GROUP BY cohort_week, weeks_since_cohort ORDER BY cohort_week, week_number`;
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

export async function getWebVitals(from: Date, to: Date, projectId: string | null) {
	const results =
		await sql`SELECT AVG(CAST(meta->>'ttfb' as float)) as ttfb, AVG(CAST(meta->>'fcp' as float)) as fcp, AVG(CAST(meta->>'lcp' as float)) as lcp, AVG(CAST(meta->>'cls' as float)) as cls, AVG(CAST(meta->>'inp' as float)) as inp, COUNT(*) as sample_count FROM events WHERE ${publicTraffic()} AND ts >= ${from} AND ts <= ${to} AND meta->>'eventName' = 'web-vitals' ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
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

export async function getUTMCampaigns(from: Date, to: Date, projectId: string | null) {
	const results =
		await sql`SELECT meta->>'utmSource' as utm_source, meta->>'utmMedium' as utm_medium, meta->>'utmCampaign' as utm_campaign, COUNT(*) as visits, COUNT(DISTINCT visitor_id) as visitors FROM events WHERE ${publicTraffic()} AND ts >= ${from} AND ts <= ${to} AND meta->>'utmSource' IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY utm_source, utm_medium, utm_campaign ORDER BY visits DESC LIMIT 20`;
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
