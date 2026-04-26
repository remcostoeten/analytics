import { sql } from "../db";
import type { SignalEvent } from "../types";
import { publicTraffic, publicTrafficEvents, getRange, COUNTRY_NAME_TO_ISO } from "./filters";

export async function getRecentEvents(
	projectId?: string,
	limit: number = 20,
	from?: Date,
	to?: Date,
): Promise<SignalEvent[]> {
	const range = getRange(from, to);
	const results =
		await sql`SELECT id, type, path, ts, country, device_type, bot_detected, meta FROM events WHERE ${publicTraffic()} AND ts >= ${range.from} AND ts <= ${range.to} ${projectId ? sql`AND project_id = ${projectId}` : sql``} ORDER BY ts DESC LIMIT ${limit}`;
	return results.map((r) => {
		const meta = (r.meta as Record<string, unknown>) || {};
		const isBot = (r as any).bot_detected === true || meta.botDetected === true;
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

export async function getLiveNow(projectId: string | null) {
	const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
	const [liveStats] =
		await sql`SELECT COUNT(DISTINCT visitor_id) as active_visitors, COUNT(DISTINCT session_id) as active_sessions, COUNT(*) as events_count FROM events WHERE ${publicTraffic()} AND ts >= ${fiveMinutesAgo} ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const s = liveStats || { active_visitors: 0, active_sessions: 0, events_count: 0 };
	const activePages =
		await sql`SELECT path, COUNT(DISTINCT visitor_id) as visitors FROM events WHERE ${publicTraffic()} AND ts >= ${fiveMinutesAgo} AND path IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY path ORDER BY visitors DESC LIMIT 10`;
	const recentActivity =
		await sql`SELECT type, path, ts FROM events WHERE ${publicTraffic()} AND ts >= ${fiveMinutesAgo} ${projectId ? sql`AND project_id = ${projectId}` : sql``} ORDER BY ts DESC LIMIT 20`;
	const liveGeo =
		await sql`SELECT country, COUNT(DISTINCT visitor_id) as visitors FROM events WHERE ${publicTraffic()} AND ts >= ${fiveMinutesAgo} AND country IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY country ORDER BY visitors DESC LIMIT 20`;
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

export async function getRecentVisitors(
	projectId: string | null,
	limit: number = 50,
	from?: Date,
	to?: Date,
) {
	const range = getRange(from, to);
	const results = await sql`
    SELECT
      id,
      fingerprint,
      first_seen,
      last_seen,
      visit_count,
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
    WHERE EXISTS (SELECT 1 FROM events WHERE events.visitor_id = visitors.fingerprint AND ${publicTrafficEvents()} AND events.ts >= ${range.from} AND events.ts <= ${range.to} ${projectId ? sql`AND events.project_id = ${projectId}` : sql``})
    ORDER BY last_seen DESC
    LIMIT ${limit}
  `;
	return results.map((r) => ({
		id: String(r.id),
		fingerprint: r.fingerprint,
		firstSeen: r.first_seen,
		lastSeen: r.last_seen,
		visitCount: Number(r.visit_count),
		isInternal: false,
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
