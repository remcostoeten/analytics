import type { DeviceType } from "@remcostoeten/analytics-contract";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";
import { sql } from "drizzle-orm";

import type { WidgetStore } from "../ports";
import { serverVisitor } from "../reads/server-visitor";
import { botScoreFloor } from "../signals/verdict";
import type { Database } from "./drizzle";
import { attempt, numeric, selectRows, textual } from "./drizzle-rows";

const deviceTypes = new Set<string>(["desktop", "mobile", "tablet", "bot", "unknown"]);
const releaseWindowDays = 30;

function nullableText(value: unknown): Nullable<string> {
  return value === null || value === undefined ? null : textual(value);
}

function device(value: unknown): DeviceType {
  const name = nullableText(value);
  return name && deviceTypes.has(name) ? (name as DeviceType) : "unknown";
}

function country(value: unknown): Nullable<string> {
  const code = nullableText(value);
  return code && code.length === 2 ? code : null;
}

/**
 * @name drizzleWidget
 * @description The `WidgetStore` on Postgres: the visitors active in a window, one row each with
 * their latest event, latest pageview, session and highest bot score in the window (served by
 * `events_project_received_idx`);
 * human pageviews per minute for the last minutes; and the newest `release` seen on events with
 * when it first appeared in the last 30 days and how many issues were first seen since.
 *
 * @example
 * await drizzleWidget(db).active("docs", from, to, 50);
 */
export function drizzleWidget(db: Database): WidgetStore {
  return {
    active: (project, from, to, limit) =>
      attempt("Could not read the active visitors", async () => {
        const rows = await selectRows(
          db,
          sql`WITH recent AS (
              SELECT DISTINCT ON (e.visitor_id) e.visitor_id, e.session_id, e.received_at, e.country,
                e.city, e.device_type, max(e.bot_score) OVER (PARTITION BY e.visitor_id) AS bot_score,
                e.meta->>'browser' AS browser, e.meta->>'os' AS os
              FROM events e
              WHERE e.project_id = ${project} AND e.received_at >= ${from.toISOString()}::timestamptz
                AND e.received_at <= ${to.toISOString()}::timestamptz
                AND e.visitor_id IS NOT NULL AND e.visitor_id <> ${serverVisitor}
                AND e.session_id IS NOT NULL
              ORDER BY e.visitor_id, e.received_at DESC, e.id DESC
            )
            SELECT r.*, s.referrer, s.pageviews, s.duration_ms,
              (SELECT p.path FROM events p
                WHERE p.project_id = ${project} AND p.session_id = r.session_id AND p.type = 'pageview'
                ORDER BY p.ts DESC, p.id DESC LIMIT 1) AS path,
              (v.meta->'identity'->>'userId') IS NOT NULL AS identified
            FROM recent r
            LEFT JOIN sessions s ON s.project_id = ${project} AND s.session_id = r.session_id
            LEFT JOIN visitors v ON v.project_id = ${project} AND v.fingerprint = r.visitor_id
            ORDER BY r.received_at DESC, r.visitor_id ASC
            LIMIT ${limit}`,
        );
        return rows.map((row) => ({
          visitor: textual(row.visitor_id),
          session: textual(row.session_id),
          lastSeen: new Date(textual(row.received_at)).toISOString(),
          path: nullableText(row.path),
          referrer: nullableText(row.referrer),
          country: country(row.country),
          city: nullableText(row.city),
          device: device(row.device_type),
          browser: nullableText(row.browser),
          os: nullableText(row.os),
          pages: numeric(row.pageviews),
          duration: Math.round(numeric(row.duration_ms) / 1000),
          botScore: Math.min(100, Math.max(0, numeric(row.bot_score))),
          identified: row.identified === true,
        }));
      }),
    perMinute: (project, to, minutes) =>
      attempt("Could not read the pageviews per minute", async () => {
        const end = to.toISOString();
        const rows = await selectRows(
          db,
          sql`SELECT floor(EXTRACT(EPOCH FROM (${end}::timestamptz - e.ts)) / 60)::int AS ago, count(*) AS views
            FROM events e
            WHERE e.project_id = ${project} AND e.type = 'pageview'
              AND e.ts > ${end}::timestamptz - make_interval(mins => ${minutes})
              AND e.ts <= ${end}::timestamptz
              AND e.bot_score < ${botScoreFloor}
              AND NOT COALESCE(e.is_internal, false) AND NOT COALESCE(e.is_localhost, false)
            GROUP BY 1`,
        );
        const counts = new Map(rows.map((row) => [numeric(row.ago), numeric(row.views)]));
        return Array.from({ length: minutes }, (_, index) => counts.get(minutes - 1 - index) ?? 0);
      }),
    release: (project) =>
      attempt("Could not read the release", async () => {
        const [latest] = await selectRows(
          db,
          sql`SELECT e.meta->>'release' AS release, e.ts FROM events e
            WHERE e.project_id = ${project} AND e.meta->>'release' IS NOT NULL
            ORDER BY e.ts DESC, e.id DESC LIMIT 1`,
        );
        const current = nullableText(latest?.release);
        if (!latest || !current) return null;
        const [first] = await selectRows(
          db,
          sql`SELECT min(e.ts) AS deployed_at FROM events e
            WHERE e.project_id = ${project} AND e.meta->>'release' = ${current}
              AND e.ts >= ${textual(latest.ts)}::timestamptz - make_interval(days => ${releaseWindowDays})`,
        );
        const deployedAt = new Date(textual(first?.deployed_at ?? latest.ts));
        const [issues] = await selectRows(
          db,
          sql`SELECT count(*) AS issues FROM issues
            WHERE project_id = ${project} AND first_seen >= ${deployedAt.toISOString()}::timestamptz`,
        );
        return { current, deployedAt, newIssuesSince: numeric(issues?.issues) };
      }),
  };
}
