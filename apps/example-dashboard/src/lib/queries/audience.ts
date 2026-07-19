import { sql } from "../db";
import type { DeviceBreakdown } from "../types";
import { publicTraffic, getRange, geoScopeFilter, type GeoScope } from "./filters";

export async function getDeviceBreakdown(
	projectId?: string,
	from?: Date,
	to?: Date,
	excludeVisitorId?: string | null,
	origin?: string | null,
	geo?: GeoScope | null,
): Promise<DeviceBreakdown[]> {
	const range = getRange(from, to);
	const results =
		await sql`SELECT COALESCE(device_type, 'Unknown') as device_type, COUNT(*) as count FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} ${geoScopeFilter(geo?.country, geo?.region)} AND ts >= ${range.from} AND ts <= ${range.to} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY device_type ORDER BY count DESC`;
	const total = results.reduce((sum, r) => sum + Number(r.count), 0);
	return results.map((r) => ({
		type: r.device_type as string,
		count: Number(r.count),
		percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
	}));
}

export async function getBrowsersDetailed(
	from: Date,
	to: Date,
	projectId: string | null,
	excludeVisitorId?: string | null,
	origin?: string | null,
) {
	const results =
		await sql`SELECT COALESCE(meta->>'browser', 'Unknown') as browser, COUNT(*) as count FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} AND meta->>'browser' IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY browser ORDER BY count DESC LIMIT 10`;
	const total = results.reduce((sum, r) => sum + Number(r.count), 0);
	return results.map((r) => ({
		name: r.browser,
		count: Number(r.count),
		percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
	}));
}

export async function getOSDetailed(
	from: Date,
	to: Date,
	projectId: string | null,
	excludeVisitorId?: string | null,
	origin?: string | null,
) {
	const results =
		await sql`SELECT COALESCE(meta->>'os', 'Unknown') as os, COUNT(*) as count FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} AND meta->>'os' IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY os ORDER BY count DESC LIMIT 10`;
	const total = results.reduce((sum, r) => sum + Number(r.count), 0);
	return results.map((r) => ({
		name: r.os,
		count: Number(r.count),
		percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
	}));
}

export async function getLanguages(
	from: Date,
	to: Date,
	projectId: string | null,
	excludeVisitorId?: string | null,
	origin?: string | null,
) {
	const results =
		await sql`SELECT COALESCE(lang, 'Unknown') as lang, COUNT(*) as count FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY lang ORDER BY count DESC LIMIT 10`;
	const total = results.reduce((sum, r) => sum + Number(r.count), 0);
	return results.map((r) => ({
		name: r.lang,
		count: Number(r.count),
		percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
	}));
}

export async function getScreenSizes(
	from: Date,
	to: Date,
	projectId: string | null,
	excludeVisitorId?: string | null,
	origin?: string | null,
) {
	const results =
		await sql`SELECT COALESCE(meta->>'screenSize', 'Unknown') as screen_size, COUNT(*) as count FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY screen_size ORDER BY count DESC LIMIT 10`;
	const total = results.reduce((sum, r) => sum + Number(r.count), 0);
	return results.map((r) => ({
		name: r.screen_size,
		count: Number(r.count),
		percentage: total > 0 ? (Number(r.count) / total) * 100 : 0,
	}));
}

export async function getConnectionTypes(
	from: Date,
	to: Date,
	projectId: string | null,
	excludeVisitorId?: string | null,
	origin?: string | null,
) {
	const results =
		await sql`SELECT COALESCE(meta->>'connectionType', 'Unknown') as connection_type, COUNT(*) as count FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY connection_type ORDER BY count DESC`;
	return results.map((r) => ({ type: r.connection_type, count: Number(r.count) }));
}

export async function getBotBreakdown(
	from: Date,
	to: Date,
	projectId: string | null,
	excludeVisitorId?: string | null,
	origin?: string | null,
) {
	const [summary, topPagesRows] = await Promise.all([
		sql`SELECT COUNT(*) as total_bots, COUNT(DISTINCT visitor_id) as unique_bots FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND (bot_detected = true OR meta->>'botDetected' = 'true') AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``}`,
		sql`SELECT COALESCE(path, '/') as path, COUNT(*) as hits FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND (bot_detected = true OR meta->>'botDetected' = 'true') AND ts >= ${from} AND ts <= ${to} AND path IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY path ORDER BY hits DESC LIMIT 8`,
	]);
	return {
		total: Number(summary[0]?.total_bots || 0),
		uniqueVisitors: Number(summary[0]?.unique_bots || 0),
		topPages: topPagesRows.map((r) => ({ path: r.path as string, hits: Number(r.hits) })),
	};
}
