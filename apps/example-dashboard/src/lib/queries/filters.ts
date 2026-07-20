import { sql } from "../db";
import { countryFilterValues, regionName } from "../geo-names";
export { formatNumber } from "../format";
export { COUNTRY_NAME_TO_ISO } from "../geo-names";

const PREVIEW_PATTERN =
	"(-git-|-[a-z0-9]{8,}-)[^.]*[.]vercel[.]app|(^|[.-])preview[.-]|[.-]preview([.-]|$)|(^|[.-])staging[.-]";

export type Range = { from: Date; to: Date };

export type GeoScope = { country: string; region?: string | null };

/**
 * SQL fragment scoping events to a country/region/city. Matches both ISO codes
 * and legacy full names because events.country stores a mix of the two.
 */
export function geoScopeFilter(
	country: string | null | undefined,
	region?: string | null,
	city?: string | null,
) {
	if (!country) return sql``;
	const values = countryFilterValues(country);
	const countryFrag = sql`AND country = ANY(${values})`;
	if (!region) return countryFrag;
	const regionValues = [region.toUpperCase(), regionName(country, region)];
	const regionFrag = sql`${countryFrag} AND upper(region) = ANY(${regionValues.map((r) => r.toUpperCase())})`;
	if (!city) return regionFrag;
	return sql`${regionFrag} AND upper(city) = ${city.toUpperCase()}`;
}

export function publicTraffic(excludeVisitorId?: string | null, origin?: string | null) {
	return sql`(is_localhost = false OR is_localhost IS NULL)
		AND (is_preview = false OR is_preview IS NULL)
		AND (is_internal = false OR is_internal IS NULL)
		${excludeVisitorId ? sql`AND visitor_id IS DISTINCT FROM ${excludeVisitorId}` : sql``}
		${origin ? sql`AND host = ${origin}` : sql``}
		AND NOT (
			COALESCE(host, '') ~* ${PREVIEW_PATTERN}
			OR COALESCE(origin, '') ~* ${PREVIEW_PATTERN}
			OR COALESCE(referrer, '') ~* ${PREVIEW_PATTERN}
			OR COALESCE(meta->>'isPreview', 'false') = 'true'
		)`;
}

export function publicTrafficEvents(excludeVisitorId?: string | null, origin?: string | null) {
	return sql`(events.is_localhost = false OR events.is_localhost IS NULL)
		AND (events.is_preview = false OR events.is_preview IS NULL)
		AND (events.is_internal = false OR events.is_internal IS NULL)
		${excludeVisitorId ? sql`AND events.visitor_id IS DISTINCT FROM ${excludeVisitorId}` : sql``}
		${origin ? sql`AND events.host = ${origin}` : sql``}
		AND NOT (
			COALESCE(events.host, '') ~* ${PREVIEW_PATTERN}
			OR COALESCE(events.origin, '') ~* ${PREVIEW_PATTERN}
			OR COALESCE(events.referrer, '') ~* ${PREVIEW_PATTERN}
			OR COALESCE(events.meta->>'isPreview', 'false') = 'true'
		)`;
}

export function getTimeRangeFilter(hours: number = 24): Range {
	const to = new Date();
	const from = new Date(to.getTime() - hours * 60 * 60 * 1000);
	return { from, to };
}

export function getRange(from?: Date, to?: Date): Range {
	if (from && to) return { from, to };
	return getTimeRangeFilter(24);
}

export function getPreviousRange(range: Range): Range {
	const duration = range.to.getTime() - range.from.getTime();
	const from = new Date(range.from.getTime() - duration);
	return { from, to: range.from };
}

export function calculateTrend(
	current: number,
	previous: number,
): { value: number; direction: "up" | "down" | "flat" | "new"; isPositive: boolean } {
	if (previous === 0) {
		return current > 0
			? { value: 0, direction: "new", isPositive: true }
			: { value: 0, direction: "flat", isPositive: true };
	}
	const change = ((current - previous) / previous) * 100;
	return {
		value: Math.abs(change),
		direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
		isPositive: change >= 0,
	};
}
