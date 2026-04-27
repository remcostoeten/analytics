import { sql } from "../db";
import type { ContentMetric, ReferrerMetric, GeoDistribution } from "../types";
import { publicTraffic, getRange, getTimeRangeFilter, COUNTRY_NAME_TO_ISO } from "./filters";

export async function getTopPages(
	projectId?: string,
	limit: number = 10,
	from?: Date,
	to?: Date,
): Promise<ContentMetric[]> {
	const range = getRange(from, to);
	const results =
		await sql`SELECT host, path, COUNT(*) as views, COUNT(DISTINCT visitor_id) as unique_visitors FROM events WHERE ${publicTraffic()} AND type = 'pageview' AND ts >= ${range.from} AND ts <= ${range.to} AND path IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY host, path ORDER BY views DESC LIMIT ${limit}`;
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
): Promise<ReferrerMetric[]> {
	const range = getRange(from, to);
	const results =
		await sql`SELECT referrer, COUNT(*) as visits FROM events WHERE ${publicTraffic()} AND ts >= ${range.from} AND ts <= ${range.to} AND referrer IS NOT NULL AND referrer != '' ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY referrer ORDER BY visits DESC LIMIT ${limit}`;
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

export async function getReferrerDetail(from: Date, to: Date, domain: string, projectId: string | null) {
	const [stats] =
		await sql`SELECT COUNT(*) as total_visits, COUNT(DISTINCT visitor_id) as unique_visitors, COUNT(DISTINCT session_id) as sessions FROM events WHERE ${publicTraffic()} AND ts >= ${from} AND ts <= ${to} AND referrer LIKE ${"%" + domain + "%"} ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const s = stats || { total_visits: 0, unique_visitors: 0, sessions: 0 };
	const landingPages =
		await sql`SELECT path, COUNT(*) as visits FROM events WHERE ${publicTraffic()} AND ts >= ${from} AND ts <= ${to} AND referrer LIKE ${"%" + domain + "%"} AND path IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY path ORDER BY visits DESC LIMIT 10`;
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
): Promise<GeoDistribution[]> {
	const range = from && to ? { from, to } : getTimeRangeFilter(24);
	const results =
		await sql`SELECT country, COUNT(*) as count FROM events WHERE ${publicTraffic()} AND ts >= ${range.from} AND ts <= ${range.to} AND country IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY country ORDER BY count DESC LIMIT ${limit}`;
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

export async function getGeoCities(from: Date, to: Date, country: string | null, projectId: string | null) {
	const results =
		await sql`SELECT city, region, country, COUNT(*) as count, COUNT(DISTINCT visitor_id) as visitors FROM events WHERE ${publicTraffic()} AND ts >= ${from} AND ts <= ${to} AND city IS NOT NULL AND city != '' ${country ? sql`AND country = ${country}` : sql``} ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY city, region, country ORDER BY count DESC LIMIT 100`;
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

export async function getGeoDetail(from: Date, to: Date, projectId: string | null) {
	const countries =
		await sql`SELECT country, COUNT(*) as count, COUNT(DISTINCT visitor_id) as visitors, COUNT(DISTINCT session_id) as sessions FROM events WHERE ${publicTraffic()} AND ts >= ${from} AND ts <= ${to} AND country IS NOT NULL AND country != '' ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY country ORDER BY count DESC LIMIT 12`;
	const regions =
		await sql`SELECT region, country, COUNT(*) as count, COUNT(DISTINCT visitor_id) as visitors FROM events WHERE ${publicTraffic()} AND ts >= ${from} AND ts <= ${to} AND region IS NOT NULL AND region != '' ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY region, country ORDER BY count DESC LIMIT 12`;
	const cities =
		await sql`SELECT city, region, country, COUNT(*) as count, COUNT(DISTINCT visitor_id) as visitors, COUNT(DISTINCT session_id) as sessions FROM events WHERE ${publicTraffic()} AND ts >= ${from} AND ts <= ${to} AND city IS NOT NULL AND city != '' ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY city, region, country ORDER BY count DESC LIMIT 16`;
	const [quality] =
		await sql`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE country IS NOT NULL AND country != '') as country_known, COUNT(*) FILTER (WHERE region IS NOT NULL AND region != '') as region_known, COUNT(*) FILTER (WHERE city IS NOT NULL AND city != '') as city_known FROM events WHERE ${publicTraffic()} AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const total = Number(quality?.total || 0);
	function percent(value: number) {
		return total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
	}
	return {
		countries: countries.map((r) => ({
			country: COUNTRY_NAME_TO_ISO[r.country] || r.country,
			count: Number(r.count),
			visitors: Number(r.visitors),
			sessions: Number(r.sessions),
		})),
		regions: regions.map((r) => ({
			region: r.region,
			country: COUNTRY_NAME_TO_ISO[r.country] || r.country,
			count: Number(r.count),
			visitors: Number(r.visitors),
		})),
		cities: cities.map((r) => ({
			city: r.city,
			region: r.region,
			country: COUNTRY_NAME_TO_ISO[r.country] || r.country,
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

export async function getEntryExitPages(from: Date, to: Date, projectId: string | null) {
	const entryPages =
		await sql`WITH first_pages AS (SELECT DISTINCT ON (session_id) session_id, path FROM events WHERE ${publicTraffic()} AND ts >= ${from} AND ts <= ${to} AND type = 'pageview' AND session_id IS NOT NULL AND path IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} ORDER BY session_id, ts ASC) SELECT path, COUNT(*) as count FROM first_pages GROUP BY path ORDER BY count DESC LIMIT 10`;
	const exitPages =
		await sql`WITH last_pages AS (SELECT DISTINCT ON (session_id) session_id, path FROM events WHERE ${publicTraffic()} AND ts >= ${from} AND ts <= ${to} AND type = 'pageview' AND session_id IS NOT NULL AND path IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} ORDER BY session_id, ts DESC) SELECT path, COUNT(*) as count FROM last_pages GROUP BY path ORDER BY count DESC LIMIT 10`;
	return {
		entryPages: entryPages.map((r) => ({ path: r.path, count: Number(r.count) })),
		exitPages: exitPages.map((r) => ({ path: r.path, count: Number(r.count) })),
	};
}

export async function getTopPaths(from: Date, to: Date, projectId: string | null) {
	const paths =
		await sql`WITH session_paths AS (SELECT session_id, ARRAY_AGG(path ORDER BY ts) as path_sequence FROM events WHERE ${publicTraffic()} AND ts >= ${from} AND ts <= ${to} AND type = 'pageview' AND session_id IS NOT NULL AND path IS NOT NULL ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY session_id HAVING COUNT(*) > 1), path_strings AS (SELECT array_to_string(path_sequence[1:5], ' → ') as path, COUNT(*) as count FROM session_paths GROUP BY path) SELECT * FROM path_strings ORDER BY count DESC LIMIT 15`;
	const total = paths.reduce((s, r) => s + Number(r.count), 0);
	return paths.map((r) => ({
		path: r.path,
		count: Number(r.count),
		percentage: total > 0 ? Math.round((Number(r.count) / total) * 1000) / 10 : 0,
	}));
}
