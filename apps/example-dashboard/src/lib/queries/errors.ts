import { sql } from "../db";
import { publicTraffic } from "./filters";

export type ErrorGroup = {
	message: string;
	count: number;
	visitors: number;
	sessions: number;
	lastSeen: string;
	topPath: string | null;
	topBrowser: string | null;
};

export type ErrorStats = {
	total: number;
	affectedVisitors: number;
	affectedSessions: number;
	groups: ErrorGroup[];
};

export async function getErrorStats(
	from: Date,
	to: Date,
	projectId: string | null,
	excludeVisitorId?: string | null,
	origin?: string | null,
): Promise<ErrorStats> {
	const base = sql`type = 'error'
		AND ${publicTraffic(excludeVisitorId, origin)}
		AND (bot_detected = false OR bot_detected IS NULL)
		AND ts >= ${from} AND ts <= ${to}
		${projectId ? sql`AND project_id = ${projectId}` : sql``}`;

	const [totalsRows, groupRows] = await Promise.all([
		sql`SELECT
				COUNT(*) as total,
				COUNT(DISTINCT visitor_id) as visitors,
				COUNT(DISTINCT session_id) as sessions
			FROM events WHERE ${base}`,
		sql`SELECT
				COALESCE(NULLIF(meta->>'message', ''), 'Unknown error') as message,
				COUNT(*) as count,
				COUNT(DISTINCT visitor_id) as visitors,
				COUNT(DISTINCT session_id) as sessions,
				MAX(ts) as last_seen,
				mode() WITHIN GROUP (ORDER BY path) as top_path,
				mode() WITHIN GROUP (ORDER BY meta->>'browser') as top_browser
			FROM events WHERE ${base}
			GROUP BY 1
			ORDER BY count DESC
			LIMIT 20`,
	]);

	const totals = totalsRows[0];

	return {
		total: Number(totals?.total ?? 0),
		affectedVisitors: Number(totals?.visitors ?? 0),
		affectedSessions: Number(totals?.sessions ?? 0),
		groups: groupRows.map(function (row) {
			return {
				message: row.message as string,
				count: Number(row.count),
				visitors: Number(row.visitors),
				sessions: Number(row.sessions),
				lastSeen: new Date(row.last_seen as string).toISOString(),
				topPath: (row.top_path as string) || null,
				topBrowser: (row.top_browser as string) || null,
			};
		}),
	};
}
