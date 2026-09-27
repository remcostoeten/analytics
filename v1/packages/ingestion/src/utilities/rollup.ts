import { sql } from "drizzle-orm";

type DbModule = typeof import("../db/index.js");

let cached: DbModule | null = null;

async function getDb(): Promise<DbModule> {
	if (!cached) {
		cached = await import("../db/index.js");
	}
	return cached;
}

export function __setDbModule(mock: DbModule) {
	cached = mock;
}

export type RollupResult = {
	startDay: string;
	days: number;
	rowsWritten: number;
};

const CLEAN_TRAFFIC = sql`
	COALESCE(bot_detected, false) = false
	AND COALESCE(is_internal, false) = false
	AND COALESCE(is_localhost, false) = false
	AND COALESCE(is_preview, false) = false
`;

/**
 * Recomputes daily aggregates from raw events for the last `days` UTC days
 * (inclusive of today) into rollup_daily. Idempotent: the window is deleted
 * and re-inserted, so late-arriving offline events are folded in on the next
 * run. Default window should exceed the client-timestamp acceptance window
 * so no late event is ever missed.
 */
export async function rollupDays(days: number): Promise<RollupResult> {
	const { db } = await getDb();

	const start = new Date();
	start.setUTCDate(start.getUTCDate() - (days - 1));
	const startDay = start.toISOString().slice(0, 10);

	await db.execute(sql`DELETE FROM rollup_daily WHERE day >= ${startDay}::date`);

	const inserted = await db.execute(sql`
		INSERT INTO rollup_daily (project_id, day, dimension, dim_value, pageviews, events, visitors, sessions)
		SELECT
			project_id,
			(ts AT TIME ZONE 'UTC')::date AS day,
			'total',
			'',
			COUNT(*) FILTER (WHERE type = 'pageview')::int,
			COUNT(*)::int,
			COUNT(DISTINCT visitor_id)::int,
			COUNT(DISTINCT session_id)::int
		FROM events
		WHERE ts >= ${startDay}::date AND ${CLEAN_TRAFFIC}
		GROUP BY project_id, 2
		UNION ALL
		SELECT
			project_id,
			(ts AT TIME ZONE 'UTC')::date,
			'path',
			path,
			COUNT(*) FILTER (WHERE type = 'pageview')::int,
			COUNT(*)::int,
			COUNT(DISTINCT visitor_id)::int,
			COUNT(DISTINCT session_id)::int
		FROM events
		WHERE ts >= ${startDay}::date AND path IS NOT NULL AND ${CLEAN_TRAFFIC}
		GROUP BY project_id, 2, path
		UNION ALL
		SELECT
			project_id,
			(ts AT TIME ZONE 'UTC')::date,
			'country',
			country,
			COUNT(*) FILTER (WHERE type = 'pageview')::int,
			COUNT(*)::int,
			COUNT(DISTINCT visitor_id)::int,
			COUNT(DISTINCT session_id)::int
		FROM events
		WHERE ts >= ${startDay}::date AND country IS NOT NULL AND ${CLEAN_TRAFFIC}
		GROUP BY project_id, 2, country
	`);

	const insertResult = inserted as { rowCount?: number | null; affectedRows?: number | null };
	const rowsWritten = insertResult.rowCount ?? insertResult.affectedRows ?? 0;

	return { startDay, days, rowsWritten };
}
