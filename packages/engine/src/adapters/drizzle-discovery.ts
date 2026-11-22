import { botThreshold } from "@spoar/contract";
import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { groupsKey } from "../groups";
import type { DiscoveryPage, DiscoveryScope, ReadStore } from "../ports";
import type { Database } from "./drizzle";
import { attempt, numeric, selectRows, textual } from "./drizzle-rows";
import type { Row } from "./drizzle-rows";

const nameScanLimit = 100_000;
const keyScanLimit = 20_000;
const eventKeyScanLimit = 5_000;
// The characters `propDimension` accepts, so every listed key can be used in `prop:<key>`.
const propKeyPattern = "^[\\w.-]{1,64}$";
const systemKeys = [
  "eventName",
  "screenSize",
  "viewport",
  "timezone",
  "connectionType",
  "release",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmTerm",
  "utmContent",
  "browser",
  "browserVersion",
  "os",
  "osVersion",
  groupsKey,
];

function newestEvents(scope: DiscoveryScope, condition: SQL, scanLimit: number) {
  // The literal threshold and flags let Postgres prove the events_human_idx partial predicate.
  const human = sql.raw(
    `e.bot_score < ${botThreshold} AND e.is_internal = false AND e.is_localhost = false AND e.is_preview = false`,
  );
  return sql`SELECT e.name, e.type, e.meta FROM events e
    WHERE e.project_id = ${scope.projectId}
      AND e.ts >= ${scope.from.toISOString()}::timestamptz
      AND e.ts < ${scope.to.toISOString()}::timestamptz
      AND ${human} AND ${condition}
    ORDER BY e.ts DESC LIMIT ${sql.raw(String(scanLimit))}`;
}

function ranked(scanned: SQL, limit: number) {
  return sql`SELECT ${scanned} AS scanned, (SELECT count(*) FROM counted) AS total, top.value, top.n
    FROM (SELECT 1) one
    LEFT JOIN LATERAL (
      SELECT value, n FROM counted ORDER BY n DESC, value ASC LIMIT ${limit}
    ) top ON true`;
}

function toPage(rows: Row[], scanLimit: number): DiscoveryPage {
  const [first] = rows;
  return {
    rows: rows
      .filter((row) => row.value !== null && row.value !== undefined)
      .map((row) => ({ value: textual(row.value), count: numeric(row.n) })),
    total: numeric(first?.total),
    sampled: numeric(first?.scanned) >= scanLimit,
  };
}

function keptEvents(scope: DiscoveryScope, event: string | null) {
  if (event === null) {
    return {
      sources: sql`recent AS MATERIALIZED (${newestEvents(scope, sql`true`, keyScanLimit)}),
        kept AS (SELECT meta FROM recent)`,
      scanned: sql`(SELECT count(*) FROM recent)`,
      scanLimit: keyScanLimit,
    };
  }
  return {
    sources: sql`named AS MATERIALIZED (${newestEvents(scope, sql`e.name = ${event}`, eventKeyScanLimit)}),
      legacy AS MATERIALIZED (${newestEvents(scope, sql`e.name IS NULL`, eventKeyScanLimit)}),
      kept AS (
        SELECT meta FROM named
        UNION ALL
        SELECT meta FROM legacy WHERE COALESCE(meta->>'eventName', type) = ${event}
      )`,
    scanned: sql`GREATEST((SELECT count(*) FROM named), (SELECT count(*) FROM legacy))`,
    scanLimit: eventKeyScanLimit,
  };
}

/**
 * @name discoveryReads
 * @description The autocomplete reads of the `ReadStore`: distinct event names and prop keys with
 * counts. Names read at most the newest 100,000 human production events of the window, keys the
 * newest 20,000, and keys of one event the newest 5,000 with that name plus 5,000 legacy rows
 * without one, through `events_human_idx` or `events_project_name_ts_idx`. `sampled` reports that
 * a cap was reached, so the cost stays bounded however many events a project has.
 *
 * @example
 * const reads = { ...discoveryReads(db) };
 */
export function discoveryReads(db: Database): Pick<ReadStore, "eventNames" | "propKeys"> {
  return {
    eventNames: (scope) =>
      attempt("Could not read the event names", async () => {
        const rows = await selectRows(
          db,
          sql`WITH recent AS MATERIALIZED (${newestEvents(scope, sql`true`, nameScanLimit)}),
            counted AS (
              SELECT COALESCE(name, meta->>'eventName', type) AS value, count(*) AS n
              FROM recent GROUP BY 1
            )
            ${ranked(sql`(SELECT count(*) FROM recent)`, scope.limit)}`,
        );
        return toPage(rows, nameScanLimit);
      }),
    propKeys: (scope, event) =>
      attempt("Could not read the prop keys", async () => {
        const { sources, scanned, scanLimit } = keptEvents(scope, event);
        const hidden = sql.join(
          systemKeys.map((key) => sql`${key}`),
          sql`, `,
        );
        const rows = await selectRows(
          db,
          sql`WITH ${sources},
            keys AS (
              SELECT key, count(*) AS n
              FROM (
                SELECT jsonb_object_keys(
                  CASE WHEN jsonb_typeof(meta) = 'object' THEN meta END
                ) AS key
                FROM kept
              ) expanded
              GROUP BY 1
            ),
            counted AS (
              SELECT key AS value, n FROM keys
              WHERE key NOT IN (${hidden}) AND key ~ ${propKeyPattern}
            )
            ${ranked(scanned, scope.limit)}`,
        );
        return toPage(rows, scanLimit);
      }),
  };
}
