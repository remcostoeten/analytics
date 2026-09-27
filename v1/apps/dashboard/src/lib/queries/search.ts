import { sql } from "../db";
import { publicTraffic, NUMERIC_PATTERN } from "./filters";

export type SearchQuery = {
	query: string;
	count: number;
	searchers: number;
	averageResults: number | null;
	zeroResultCount: number;
};

export type SearchStats = {
	total: number;
	searchers: number;
	zeroResultSearches: number;
	zeroResultRate: number;
	queries: SearchQuery[];
	zeroResultQueries: SearchQuery[];
};

/**
 * `trackSearch` records a result count alongside the query. Queries that return
 * nothing are the actionable half of site search, so they are surfaced as their
 * own list rather than being ranked purely by volume.
 */
export async function getSearchStats(
	from: Date,
	to: Date,
	projectId: string | null,
	excludeVisitorId?: string | null,
	origin?: string | null,
): Promise<SearchStats> {
	const base = sql`type = 'event'
		AND meta->>'eventName' = 'site_search'
		AND meta->>'query' IS NOT NULL
		AND ${publicTraffic(excludeVisitorId, origin)}
		AND (bot_detected = false OR bot_detected IS NULL)
		AND ts >= ${from} AND ts <= ${to}
		${projectId ? sql`AND project_id = ${projectId}` : sql``}`;

	const zeroResult = sql`meta->>'resultCount' ~ ${NUMERIC_PATTERN}
		AND CAST(meta->>'resultCount' AS numeric) = 0`;

	const grouped = sql`SELECT
			meta->>'query' as query,
			COUNT(*) as count,
			COUNT(DISTINCT visitor_id) as searchers,
			AVG(CAST(meta->>'resultCount' AS numeric))
				FILTER (WHERE meta->>'resultCount' ~ ${NUMERIC_PATTERN}) as avg_results,
			COUNT(*) FILTER (WHERE ${zeroResult}) as zero_results
		FROM events WHERE ${base}
		GROUP BY 1`;

	const [totalRows, topRows, emptyRows] = await Promise.all([
		sql`SELECT
				COUNT(*) as total,
				COUNT(DISTINCT visitor_id) as searchers,
				COUNT(*) FILTER (WHERE ${zeroResult}) as zero_results
			FROM events WHERE ${base}`,
		sql`SELECT * FROM (${grouped}) as g ORDER BY count DESC LIMIT 12`,
		sql`SELECT * FROM (${grouped}) as g WHERE zero_results > 0 ORDER BY zero_results DESC LIMIT 10`,
	]);

	const totals = totalRows[0];
	const total = Number(totals?.total ?? 0);
	const zeroResultSearches = Number(totals?.zero_results ?? 0);

	function toQuery(row: Record<string, unknown>): SearchQuery {
		return {
			query: row.query as string,
			count: Number(row.count),
			searchers: Number(row.searchers),
			averageResults: row.avg_results === null ? null : Number(row.avg_results),
			zeroResultCount: Number(row.zero_results),
		};
	}

	return {
		total,
		searchers: Number(totals?.searchers ?? 0),
		zeroResultSearches,
		zeroResultRate: total > 0 ? (zeroResultSearches / total) * 100 : 0,
		queries: topRows.map(toQuery),
		zeroResultQueries: emptyRows.map(toQuery),
	};
}
