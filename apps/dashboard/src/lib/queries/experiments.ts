import { sql } from "../db";
import { publicTraffic } from "./filters";

const CONVERSION_EVENT_NAMES = ["transaction", "purchase", "conversion"];

export type ExperimentVariant = {
	variant: string;
	visitors: number;
	sessions: number;
	pageviews: number;
	conversions: number;
	convertedVisitors: number;
	conversionRate: number;
};

export type Experiment = {
	experimentId: string;
	visitors: number;
	firstSeen: string;
	lastSeen: string;
	variants: ExperimentVariant[];
};

/**
 * Splits traffic by experiment variant. Assignments ride along in `meta.experiments`
 * on every event fired after `setExperiment`, so this reads them straight off the
 * event rows rather than the visitor record — that keeps the counts inside the
 * selected time range instead of reflecting the visitor's current assignment.
 */
export async function getExperiments(
	from: Date,
	to: Date,
	projectId: string | null,
	excludeVisitorId?: string | null,
	origin?: string | null,
): Promise<Experiment[]> {
	const rows = await sql`
		SELECT
			assignment.key as experiment_id,
			assignment.value as variant,
			COUNT(DISTINCT visitor_id) as visitors,
			COUNT(DISTINCT session_id) as sessions,
			COUNT(*) FILTER (WHERE type = 'pageview') as pageviews,
			COUNT(*) FILTER (WHERE meta->>'eventName' = ANY(${CONVERSION_EVENT_NAMES})) as conversions,
			COUNT(DISTINCT visitor_id) FILTER (
				WHERE meta->>'eventName' = ANY(${CONVERSION_EVENT_NAMES})
			) as converted_visitors,
			MIN(ts) as first_seen,
			MAX(ts) as last_seen
		FROM events,
		LATERAL jsonb_each_text(
			CASE WHEN jsonb_typeof(meta->'experiments') = 'object'
				THEN meta->'experiments'
				ELSE '{}'::jsonb
			END
		) as assignment
		WHERE ${publicTraffic(excludeVisitorId, origin)}
			AND (bot_detected = false OR bot_detected IS NULL)
			AND ts >= ${from} AND ts <= ${to}
			${projectId ? sql`AND project_id = ${projectId}` : sql``}
		GROUP BY 1, 2
		ORDER BY 1, visitors DESC
	`;

	const byExperiment = new Map<string, Experiment>();

	for (const row of rows) {
		const experimentId = row.experiment_id as string;
		const visitors = Number(row.visitors);
		const convertedVisitors = Number(row.converted_visitors);
		const firstSeen = new Date(row.first_seen as string).toISOString();
		const lastSeen = new Date(row.last_seen as string).toISOString();

		const existing = byExperiment.get(experimentId);
		const experiment = existing ?? {
			experimentId,
			visitors: 0,
			firstSeen,
			lastSeen,
			variants: [],
		};

		experiment.visitors += visitors;
		if (firstSeen < experiment.firstSeen) experiment.firstSeen = firstSeen;
		if (lastSeen > experiment.lastSeen) experiment.lastSeen = lastSeen;
		experiment.variants.push({
			variant: row.variant as string,
			visitors,
			sessions: Number(row.sessions),
			pageviews: Number(row.pageviews),
			conversions: Number(row.conversions),
			convertedVisitors,
			conversionRate: visitors > 0 ? (convertedVisitors / visitors) * 100 : 0,
		});

		if (!existing) byExperiment.set(experimentId, experiment);
	}

	return [...byExperiment.values()].sort(function (a, b) {
		return b.visitors - a.visitors;
	});
}
