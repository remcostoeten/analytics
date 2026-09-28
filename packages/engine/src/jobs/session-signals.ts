import { and, gte, lt, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import type { Database } from "../adapters/drizzle";
import { events, sessions } from "../db/schema";
import type { Signal } from "../define";
import { ipFanout, sessionVelocity } from "../signals";

export type Range = {
  from: Date;
  to: Date;
};

export type SessionReport = {
  velocity: number;
  fanout: number;
};

const botThreshold = 50;
const pageviewsPerMinute = 30;
const minimumPageviews = 10;
const steadyPageviews = 6;
const steadyJitterMs = 100;
const visitorsPerIpDay = 20;

function inRange(range: Range) {
  return and(gte(events.ts, range.from), lt(events.ts, range.to));
}

function fastSessions(range: Range): SQL {
  return sql`(${events.projectId}, ${events.sessionId}) IN (
    SELECT project_id, session_id FROM (
      SELECT project_id, session_id, ts,
        EXTRACT(EPOCH FROM ts - LAG(ts) OVER (PARTITION BY project_id, session_id ORDER BY ts)) * 1000 AS gap
      FROM events
      WHERE name = 'pageview' AND session_id IS NOT NULL AND ${inRange(range)}
    ) AS pageviews
    GROUP BY project_id, session_id
    HAVING (
      COUNT(*) >= ${minimumPageviews}
      AND COUNT(*) * 60000 > ${pageviewsPerMinute} * GREATEST(EXTRACT(EPOCH FROM MAX(ts) - MIN(ts)) * 1000, 1)
    ) OR (
      COUNT(*) >= ${steadyPageviews} AND STDDEV_POP(gap) < ${steadyJitterMs}
    )
  )`;
}

function crowdedAddresses(range: Range): SQL {
  return sql`(${events.projectId}, ${events.ipHash}, (${events.ts} AT TIME ZONE 'UTC')::date) IN (
    SELECT project_id, ip_hash, (ts AT TIME ZONE 'UTC')::date
    FROM events
    WHERE ip_hash IS NOT NULL AND ${inRange(range)}
    GROUP BY 1, 2, 3
    HAVING COUNT(DISTINCT visitor_id) > ${visitorsPerIpDay}
  )`;
}

async function apply(db: Database, signal: Signal, target: SQL, dryRun: boolean) {
  const missing = sql`NOT (${signal.name} = ANY(${events.botReasons}))`;
  const where = and(target, missing);
  if (dryRun) {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(events)
      .where(where);
    return row?.count ?? 0;
  }
  const raised = sql`LEAST(100, ${events.botScore} + ${signal.weight})`;
  const rows = await db
    .update(events)
    .set({
      botScore: raised,
      botReasons: sql`array_append(${events.botReasons}, ${signal.name})`,
      botDetected: sql`${raised} >= ${botThreshold}`,
      deviceType: sql`CASE WHEN ${raised} >= ${botThreshold} THEN 'bot' ELSE ${events.deviceType} END`,
    })
    .where(where)
    .returning({ projectId: events.projectId, sessionId: events.sessionId });
  return rows.length;
}

/**
 * @name syncSessionScores
 * @description Raises each session's `bot_score` to the highest score of its events in the range.
 *
 * @example
 * await syncSessionScores(db, { from, to });
 */
export async function syncSessionScores(db: Database, range: Range): Promise<void> {
  await db
    .update(sessions)
    .set({
      botScore: sql`GREATEST(${sessions.botScore}, (
        SELECT MAX(bot_score) FROM events
        WHERE events.project_id = ${sessions.projectId} AND events.session_id = ${sessions.sessionId}
      ))`,
    })
    .where(
      sql`(${sessions.projectId}, ${sessions.sessionId}) IN (
        SELECT project_id, session_id FROM events WHERE session_id IS NOT NULL AND ${inRange(range)}
      )`,
    );
}

/**
 * @name scoreSessions
 * @description The session layer of bot detection, run by the daily job over a time range. It adds
 * `session_velocity` to every event of a session with more than 30 pageviews a minute or
 * near-identical gaps between pageviews, adds `ip_fanout` to events from an IP hash that showed
 * more than 20 visitor ids in a UTC day, and raises the sessions' `bot_score`. A reason is added
 * once, so rerunning over the same range changes nothing.
 *
 * @example
 * await scoreSessions(db, { from: new Date("2026-09-20"), to: new Date("2026-09-28") }, false);
 */
export async function scoreSessions(
  db: Database,
  range: Range,
  dryRun: boolean,
): Promise<SessionReport> {
  const velocity = await apply(db, sessionVelocity, fastSessions(range), dryRun);
  const fanout = await apply(db, ipFanout, crowdedAddresses(range), dryRun);
  if (!dryRun) await syncSessionScores(db, range);
  return { velocity, fanout };
}
