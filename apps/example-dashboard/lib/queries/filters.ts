import { sql } from "../db";
export { formatNumber } from "../format";

export const COUNTRY_NAME_TO_ISO: Record<string, string> = {
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

const PREVIEW_PATTERN =
	"(-git-|-[a-z0-9]{8,}-)[^.]*[.]vercel[.]app|(^|[.-])preview[.-]|[.-]preview([.-]|$)|(^|[.-])staging[.-]";

export type Range = { from: Date; to: Date };

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
