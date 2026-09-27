import { sql } from "../db";
import { publicTraffic } from "./filters";

export type ElementClick = {
	name: string;
	count: number;
	visitors: number;
	topPath: string | null;
	lastSeen: string;
};

export type OutboundLink = {
	domain: string;
	count: number;
	visitors: number;
	topUrl: string | null;
};

export type FormSubmission = {
	name: string;
	method: string | null;
	count: number;
	visitors: number;
};

export type InteractionStats = {
	totalClicks: number;
	clickVisitors: number;
	elements: ElementClick[];
	outbound: OutboundLink[];
	forms: FormSubmission[];
};

export async function getInteractionStats(
	from: Date,
	to: Date,
	projectId: string | null,
	excludeVisitorId?: string | null,
	origin?: string | null,
): Promise<InteractionStats> {
	const base = sql`${publicTraffic(excludeVisitorId, origin)}
		AND (bot_detected = false OR bot_detected IS NULL)
		AND ts >= ${from} AND ts <= ${to}
		${projectId ? sql`AND project_id = ${projectId}` : sql``}`;

	const [totalRows, elementRows, outboundRows, formRows] = await Promise.all([
		sql`SELECT COUNT(*) as total, COUNT(DISTINCT visitor_id) as visitors
			FROM events WHERE type = 'click' AND ${base}`,
		sql`SELECT
				COALESCE(NULLIF(meta->>'elementName', ''), 'unnamed') as name,
				COUNT(*) as count,
				COUNT(DISTINCT visitor_id) as visitors,
				mode() WITHIN GROUP (ORDER BY path) as top_path,
				MAX(ts) as last_seen
			FROM events WHERE type = 'click' AND ${base}
			GROUP BY 1
			ORDER BY count DESC
			LIMIT 12`,
		sql`SELECT
				COALESCE(NULLIF(meta->>'domain', ''), 'unknown') as domain,
				COUNT(*) as count,
				COUNT(DISTINCT visitor_id) as visitors,
				mode() WITHIN GROUP (ORDER BY meta->>'url') as top_url
			FROM events
			WHERE type = 'event' AND meta->>'eventName' = 'outbound_click' AND ${base}
			GROUP BY 1
			ORDER BY count DESC
			LIMIT 10`,
		sql`SELECT
				COALESCE(
					NULLIF(meta->>'formId', ''),
					NULLIF(meta->>'formName', ''),
					NULLIF(meta->>'formAction', ''),
					'unnamed'
				) as name,
				mode() WITHIN GROUP (ORDER BY meta->>'formMethod') as method,
				COUNT(*) as count,
				COUNT(DISTINCT visitor_id) as visitors
			FROM events
			WHERE type = 'event' AND meta->>'eventName' = 'form_submit' AND ${base}
			GROUP BY 1
			ORDER BY count DESC
			LIMIT 10`,
	]);

	const totals = totalRows[0];

	return {
		totalClicks: Number(totals?.total ?? 0),
		clickVisitors: Number(totals?.visitors ?? 0),
		elements: elementRows.map(function (row) {
			return {
				name: row.name as string,
				count: Number(row.count),
				visitors: Number(row.visitors),
				topPath: (row.top_path as string) || null,
				lastSeen: new Date(row.last_seen as string).toISOString(),
			};
		}),
		outbound: outboundRows.map(function (row) {
			return {
				domain: row.domain as string,
				count: Number(row.count),
				visitors: Number(row.visitors),
				topUrl: (row.top_url as string) || null,
			};
		}),
		forms: formRows.map(function (row) {
			return {
				name: row.name as string,
				method: (row.method as string) || null,
				count: Number(row.count),
				visitors: Number(row.visitors),
			};
		}),
	};
}
