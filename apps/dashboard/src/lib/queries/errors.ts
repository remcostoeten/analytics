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
	kind: "error" | "unhandledrejection";
	source: string | null;
	line: number | null;
	column: number | null;
	stack: string | null;
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
				mode() WITHIN GROUP (ORDER BY meta->>'browser') as top_browser,
				mode() WITHIN GROUP (ORDER BY meta->>'type') as kind,
				mode() WITHIN GROUP (ORDER BY meta->>'source') as source,
				mode() WITHIN GROUP (ORDER BY meta->>'line') as line,
				mode() WITHIN GROUP (ORDER BY meta->>'col') as col,
				(ARRAY_AGG(meta->>'stack' ORDER BY ts DESC) FILTER (WHERE meta->>'stack' IS NOT NULL))[1] as stack
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
				kind: row.kind === "unhandledrejection" ? "unhandledrejection" : "error",
				source: (row.source as string) || null,
				line: row.line !== null && row.line !== undefined ? Number(row.line) : null,
				column: row.col !== null && row.col !== undefined ? Number(row.col) : null,
				stack: (row.stack as string) || null,
			};
		}),
	};
}
