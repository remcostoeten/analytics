import { sql } from "../db";

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

export function publicTraffic() {
	return sql`(is_localhost = false OR is_localhost IS NULL)
		AND (is_preview = false OR is_preview IS NULL)
		AND NOT (
			COALESCE(host, '') ~* ${PREVIEW_PATTERN}
			OR COALESCE(origin, '') ~* ${PREVIEW_PATTERN}
			OR COALESCE(referrer, '') ~* ${PREVIEW_PATTERN}
			OR COALESCE(meta->>'isPreview', 'false') = 'true'
		)`;
}

export function publicTrafficEvents() {
	return sql`(events.is_localhost = false OR events.is_localhost IS NULL)
		AND (events.is_preview = false OR events.is_preview IS NULL)
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

export function formatNumber(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return n.toLocaleString();
}

export function calculateTrend(
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
