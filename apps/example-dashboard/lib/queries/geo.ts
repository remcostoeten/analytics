import { sql } from "../db";
import { publicTraffic } from "./filters";
import {
	toCountryCode,
	countryName,
	countryFilterValues,
	regionName,
	countryFromTimezone,
} from "../geo-names";

export type GeoBreakdownRow = {
	key: string;
	name: string;
	countryCode: string | null;
	count: number;
	visitors: number;
	sessions: number;
	percentage: number;
};

export type GeoPoint = {
	latitude: number;
	longitude: number;
	count: number;
	visitors: number;
	city: string | null;
};

export type GeoTimezoneRow = {
	timezone: string;
	count: number;
	impliedCountry: string | null;
	mismatch: boolean;
};

export type GeoExplorerData = {
	level: "world" | "country" | "region";
	summary: { events: number; visitors: number; sessions: number };
	breakdown: GeoBreakdownRow[];
	points: GeoPoint[];
	timezones: GeoTimezoneRow[];
	mismatchShare: number;
	networks: { org: string; count: number; visitors: number; percentage: number }[];
	topPages: { path: string; count: number }[];
	quality: {
		total: number;
		countryKnown: number;
		regionKnown: number;
		cityKnown: number;
		coordsKnown: number;
		timezoneKnown: number;
	};
};

function scopeFilter(country: string | null, region: string | null, city?: string | null) {
	if (!country) return sql``;
	const values = countryFilterValues(country);
	const countryFrag = sql`AND country = ANY(${values})`;
	if (!region) return countryFrag;
	const regionValues = [region.toUpperCase(), regionName(country, region)];
	const regionFrag = sql`${countryFrag} AND upper(region) = ANY(${regionValues.map((r) => r.toUpperCase())})`;
	if (!city) return regionFrag;
	return sql`${regionFrag} AND upper(city) = ${city.toUpperCase()}`;
}

function percent(part: number, total: number): number {
	return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

export type GeoVisitorRow = {
	visitorId: string;
	lastSeen: string;
	events: number;
	sessions: number;
	city: string | null;
	asOrg: string | null;
};

export async function getGeoVisitors(
	from: Date,
	to: Date,
	projectId: string | null,
	country: string | null,
	region: string | null,
	city?: string | null,
	limit = 20,
	excludeVisitorId?: string | null,
	origin?: string | null,
): Promise<GeoVisitorRow[]> {
	const base = sql`${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``} ${scopeFilter(country, region, city)}`;
	const rows =
		await sql`SELECT visitor_id, MAX(ts) as last_seen, COUNT(*) as events, COUNT(DISTINCT session_id) as sessions, mode() WITHIN GROUP (ORDER BY city) as city, mode() WITHIN GROUP (ORDER BY as_org) as as_org FROM events WHERE ${base} AND visitor_id IS NOT NULL GROUP BY visitor_id ORDER BY last_seen DESC LIMIT ${limit}`;
	return rows.map((row) => ({
		visitorId: row.visitor_id as string,
		lastSeen: new Date(row.last_seen as string).toISOString(),
		events: Number(row.events),
		sessions: Number(row.sessions),
		city: (row.city as string) || null,
		asOrg: (row.as_org as string) || null,
	}));
}

export async function getGeoExplorer(
	from: Date,
	to: Date,
	projectId: string | null,
	country: string | null,
	region: string | null,
	excludeVisitorId?: string | null,
	origin?: string | null,
): Promise<GeoExplorerData> {
	const level = country ? (region ? "region" : "country") : "world";
	const base = sql`${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``} ${scopeFilter(country, region)}`;

	const groupExpr =
		level === "world" ? sql`country` : level === "country" ? sql`region` : sql`city`;

	const [summaryRows, breakdownRows, pointRows, timezoneRows, networkRows, pageRows, qualityRows] =
		await Promise.all([
			sql`SELECT COUNT(*) as events, COUNT(DISTINCT visitor_id) as visitors, COUNT(DISTINCT session_id) as sessions FROM events WHERE ${base}`,
			sql`SELECT ${groupExpr} as key, COUNT(*) as count, COUNT(DISTINCT visitor_id) as visitors, COUNT(DISTINCT session_id) as sessions FROM events WHERE ${base} AND ${groupExpr} IS NOT NULL AND ${groupExpr} != '' GROUP BY ${groupExpr} ORDER BY count DESC LIMIT 60`,
			sql`SELECT round(latitude::numeric, 1) as lat, round(longitude::numeric, 1) as lon, COUNT(*) as count, COUNT(DISTINCT visitor_id) as visitors, mode() WITHIN GROUP (ORDER BY city) as city FROM events WHERE ${base} AND latitude IS NOT NULL AND longitude IS NOT NULL GROUP BY lat, lon ORDER BY count DESC LIMIT 400`,
			sql`SELECT timezone, country, COUNT(*) as count FROM events WHERE ${base} AND timezone IS NOT NULL AND timezone != '' GROUP BY timezone, country ORDER BY count DESC LIMIT 40`,
			sql`SELECT as_org, COUNT(*) as count, COUNT(DISTINCT visitor_id) as visitors FROM events WHERE ${base} AND as_org IS NOT NULL AND as_org != '' GROUP BY as_org ORDER BY count DESC LIMIT 12`,
			sql`SELECT path, COUNT(*) as count FROM events WHERE ${base} AND type = 'pageview' AND path IS NOT NULL GROUP BY path ORDER BY count DESC LIMIT 8`,
			sql`SELECT COUNT(*) as total,
				COUNT(*) FILTER (WHERE country IS NOT NULL AND country != '') as country_known,
				COUNT(*) FILTER (WHERE region IS NOT NULL AND region != '') as region_known,
				COUNT(*) FILTER (WHERE city IS NOT NULL AND city != '') as city_known,
				COUNT(*) FILTER (WHERE latitude IS NOT NULL) as coords_known,
				COUNT(*) FILTER (WHERE timezone IS NOT NULL AND timezone != '') as timezone_known
				FROM events WHERE ${base}`,
		]);

	const summary = summaryRows[0] ?? { events: 0, visitors: 0, sessions: 0 };
	const quality = qualityRows[0] ?? {};
	const qualityTotal = Number(quality.total || 0);

	let breakdown: GeoBreakdownRow[];
	if (level === "world") {
		const merged = new Map<string, GeoBreakdownRow>();
		for (const row of breakdownRows) {
			const raw = row.key as string;
			const code = toCountryCode(raw);
			const key = code ?? raw;
			const existing = merged.get(key);
			if (existing) {
				existing.count += Number(row.count);
				existing.visitors += Number(row.visitors);
				existing.sessions += Number(row.sessions);
			} else {
				merged.set(key, {
					key,
					name: countryName(raw),
					countryCode: code,
					count: Number(row.count),
					visitors: Number(row.visitors),
					sessions: Number(row.sessions),
					percentage: 0,
				});
			}
		}
		breakdown = [...merged.values()].sort((a, b) => b.count - a.count);
	} else {
		const parentCode = toCountryCode(country);
		breakdown = breakdownRows.map((row) => {
			const raw = row.key as string;
			return {
				key: raw,
				name: level === "country" ? regionName(parentCode, raw) : raw,
				countryCode: parentCode,
				count: Number(row.count),
				visitors: Number(row.visitors),
				sessions: Number(row.sessions),
				percentage: 0,
			};
		});
	}
	const breakdownTotal = breakdown.reduce((sum, row) => sum + row.count, 0);
	for (const row of breakdown) row.percentage = percent(row.count, breakdownTotal);

	const timezoneMap = new Map<string, GeoTimezoneRow>();
	let mismatchCount = 0;
	let timezoneTotal = 0;
	for (const row of timezoneRows) {
		const timezone = row.timezone as string;
		const rowCount = Number(row.count);
		const implied = countryFromTimezone(timezone);
		const eventCountry = toCountryCode(row.country as string | null);
		const mismatch = implied !== null && eventCountry !== null && implied !== eventCountry;
		timezoneTotal += rowCount;
		if (mismatch) mismatchCount += rowCount;

		const existing = timezoneMap.get(timezone);
		if (existing) {
			existing.count += rowCount;
			existing.mismatch = existing.mismatch || mismatch;
		} else {
			timezoneMap.set(timezone, { timezone, count: rowCount, impliedCountry: implied, mismatch });
		}
	}

	const networkTotal = networkRows.reduce((sum, row) => sum + Number(row.count), 0);

	return {
		level,
		summary: {
			events: Number(summary.events || 0),
			visitors: Number(summary.visitors || 0),
			sessions: Number(summary.sessions || 0),
		},
		breakdown,
		points: pointRows.map((row) => ({
			latitude: Number(row.lat),
			longitude: Number(row.lon),
			count: Number(row.count),
			visitors: Number(row.visitors),
			city: (row.city as string) || null,
		})),
		timezones: [...timezoneMap.values()].sort((a, b) => b.count - a.count).slice(0, 12),
		mismatchShare: percent(mismatchCount, timezoneTotal),
		networks: networkRows.map((row) => ({
			org: row.as_org as string,
			count: Number(row.count),
			visitors: Number(row.visitors),
			percentage: percent(Number(row.count), networkTotal),
		})),
		topPages: pageRows.map((row) => ({ path: row.path as string, count: Number(row.count) })),
		quality: {
			total: qualityTotal,
			countryKnown: percent(Number(quality.country_known || 0), qualityTotal),
			regionKnown: percent(Number(quality.region_known || 0), qualityTotal),
			cityKnown: percent(Number(quality.city_known || 0), qualityTotal),
			coordsKnown: percent(Number(quality.coords_known || 0), qualityTotal),
			timezoneKnown: percent(Number(quality.timezone_known || 0), qualityTotal),
		},
	};
}
