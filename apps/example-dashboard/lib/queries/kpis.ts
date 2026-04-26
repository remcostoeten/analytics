import { sql } from "../db";
import type { KPIMetric } from "../types";
import { publicTraffic, getRange, getPreviousRange, formatNumber, calculateTrend } from "./filters";

export async function getPageviewsKPI(projectId?: string, from?: Date, to?: Date): Promise<KPIMetric> {
	const range = getRange(from, to);
	const prev = getPreviousRange(range);
	const [cur] =
		await sql`SELECT COUNT(*) as count FROM events WHERE ${publicTraffic()} AND type = 'pageview' AND ts >= ${range.from} AND ts <= ${range.to} ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const [pre] =
		await sql`SELECT COUNT(*) as count FROM events WHERE ${publicTraffic()} AND type = 'pageview' AND ts >= ${prev.from} AND ts < ${range.from} ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const current = Number(cur?.count || 0);
	const previous = Number(pre?.count || 0);
	return {
		id: "pageviews",
		label: "Pageviews",
		value: current,
		formattedValue: formatNumber(current),
		trend: calculateTrend(current, previous),
	};
}

export async function getUniqueVisitorsKPI(projectId?: string, from?: Date, to?: Date): Promise<KPIMetric> {
	const range = getRange(from, to);
	const prev = getPreviousRange(range);
	const [cur] =
		await sql`SELECT COUNT(DISTINCT visitor_id) as count FROM events WHERE ${publicTraffic()} AND ts >= ${range.from} AND ts <= ${range.to} AND visitor_id IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const [pre] =
		await sql`SELECT COUNT(DISTINCT visitor_id) as count FROM events WHERE ${publicTraffic()} AND ts >= ${prev.from} AND ts < ${range.from} AND visitor_id IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const current = Number(cur?.count || 0);
	const previous = Number(pre?.count || 0);
	return {
		id: "unique-visitors",
		label: "Unique Visitors",
		value: current,
		formattedValue: formatNumber(current),
		trend: calculateTrend(current, previous),
	};
}

export async function getSessionsKPI(projectId?: string, from?: Date, to?: Date): Promise<KPIMetric> {
	const range = getRange(from, to);
	const [result] =
		await sql`SELECT COUNT(DISTINCT session_id) as count FROM events WHERE ${publicTraffic()} AND ts >= ${range.from} AND ts <= ${range.to} AND session_id IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const val = Number(result?.count || 0);
	return { id: "sessions", label: "Sessions", value: val, formattedValue: formatNumber(val) };
}

export async function getEventsKPI(projectId?: string, from?: Date, to?: Date): Promise<KPIMetric> {
	const range = getRange(from, to);
	const [result] =
		await sql`SELECT COUNT(*) as count FROM events WHERE ${publicTraffic()} AND ts >= ${range.from} AND ts <= ${range.to} ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const val = Number(result?.count || 0);
	return { id: "events", label: "Total Events", value: val, formattedValue: formatNumber(val) };
}

export async function getBotRateKPI(projectId?: string, from?: Date, to?: Date): Promise<KPIMetric> {
	const range = getRange(from, to);
	const [result] =
		await sql`SELECT COUNT(*) FILTER (WHERE bot_detected = true OR meta->>'botDetected' = 'true') as bots, COUNT(*) as total FROM events WHERE ${publicTraffic()} AND ts >= ${range.from} AND ts <= ${range.to} ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
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

export async function getErrorCountKPI(projectId?: string, from?: Date, to?: Date): Promise<KPIMetric> {
	const range = getRange(from, to);
	const [result] =
		await sql`SELECT COUNT(*) as count FROM events WHERE ${publicTraffic()} AND type = 'error' AND ts >= ${range.from} AND ts <= ${range.to} ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const val = Number(result?.count || 0);
	return { id: "errors", label: "Errors", value: val, formattedValue: formatNumber(val) };
}

export async function getLocalhostRateKPI(projectId?: string, from?: Date, to?: Date): Promise<KPIMetric> {
	const range = getRange(from, to);
	const [result] =
		await sql`SELECT COUNT(*) FILTER (WHERE is_localhost = true) as localhost, COUNT(*) as total FROM events WHERE ts >= ${range.from} AND ts <= ${range.to} ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
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
