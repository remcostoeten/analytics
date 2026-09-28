import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import type { IgnoreRule, IssueRecord, IssueStatus, IssueStore } from "../ports";
import type { Database } from "./drizzle";
import { attempt, numeric, selectRows, textual } from "./drizzle-rows";
import type { Row } from "./drizzle-rows";

// An issue id as the API shows it: "iss_" and the row id.
const issueId = /^iss_(\d{1,18})$/;

function nullableText(value: unknown) {
  return value === null || value === undefined ? null : textual(value);
}

function date(value: unknown) {
  return new Date(textual(value));
}

function projects(projectIds: string[]): SQL {
  return projectIds.length > 0
    ? sql`i.project_id IN (${sql.join(
        projectIds.map((id) => sql`${id}`),
        sql`, `,
      )})`
    : sql`false`;
}

function toIssue(row: Row): IssueRecord {
  return {
    id: `iss_${textual(row.id)}`,
    projectId: textual(row.project_id),
    title: textual(row.title),
    culprit: nullableText(row.culprit),
    level: textual(row.level) === "warning" ? "warning" : "error",
    status: textual(row.status) as IssueStatus,
    isRegression: row.is_regression === true,
    count: numeric(row.count),
    visitors: numeric(row.visitors),
    firstSeen: date(row.first_seen),
    lastSeen: date(row.last_seen),
    firstRelease: nullableText(row.first_release),
    lastRelease: nullableText(row.last_release),
    resolvedAt: optionalDate(row.resolved_at),
    mutedUntil: optionalDate(row.muted_until),
    muteRemaining:
      row.mute_remaining === null || row.mute_remaining === undefined
        ? null
        : numeric(row.mute_remaining),
  };
}

function optionalDate(value: unknown) {
  return value === null || value === undefined ? null : date(value);
}

function toRule(row: Row): IgnoreRule {
  return {
    id: textual(row.id),
    projectId: textual(row.project_id),
    field: textual(row.field) === "stack" ? "stack" : "message",
    pattern: textual(row.pattern),
    createdAt: date(row.created_at),
  };
}

function rowId(id: string) {
  return issueId.exec(id)?.[1] ?? null;
}

/**
 * @name drizzleIssues
 * @description The `IssueStore` on `issues` and the error events grouped into them: issues newest
 * first, one issue by its `iss_` id within a set of projects, its events newest first, and status
 * changes, where resolving stamps `resolved_at` and clears the regression mark.
 *
 * @example
 * await drizzleIssues(db).list(["remcostoeten.nl"], "open", { limit: 20, offset: 0 });
 */
export function drizzleIssues(db: Database): IssueStore {
  return {
    list: (projectIds, status, page) =>
      attempt("Could not list issues", async () => {
        const where = status
          ? sql`${projects(projectIds)} AND i.status = ${status}`
          : projects(projectIds);
        const [counts] = await selectRows(
          db,
          sql`SELECT count(*) AS total FROM issues i WHERE ${where}`,
        );
        const rows = await selectRows(
          db,
          sql`SELECT * FROM issues i WHERE ${where} ORDER BY i.last_seen DESC, i.id DESC
            LIMIT ${page.limit} OFFSET ${page.offset}`,
        );
        return { rows: rows.map(toIssue), total: numeric(counts?.total) };
      }),
    get: (projectIds, id) =>
      attempt("Could not read the issue", async () => {
        const key = rowId(id);
        if (!key) return null;
        const [row] = await selectRows(
          db,
          sql`SELECT * FROM issues i WHERE ${projects(projectIds)} AND i.id = ${key}::bigint`,
        );
        return row ? toIssue(row) : null;
      }),
    events: (issue, page) =>
      attempt("Could not read the issue's events", async () => {
        const key = rowId(issue.id);
        const [counts] = await selectRows(
          db,
          sql`SELECT count(*) AS total FROM events e WHERE e.issue_id = ${key}::bigint`,
        );
        const rows = await selectRows(
          db,
          sql`SELECT e.fingerprint, e.ts, e.visitor_id, e.path, e.meta, e.device_type, e.lang
            FROM events e WHERE e.issue_id = ${key}::bigint AND e.project_id = ${issue.projectId}
            ORDER BY e.ts DESC, e.id DESC LIMIT ${page.limit} OFFSET ${page.offset}`,
        );
        return {
          rows: rows.map((row) => {
            const meta =
              typeof row.meta === "object" && row.meta !== null
                ? (row.meta as { [key: string]: unknown })
                : {};
            function field(key: string) {
              return typeof meta[key] === "string" ? (meta[key] as string) : null;
            }
            return {
              id: textual(row.fingerprint),
              ts: date(row.ts),
              visitorId: nullableText(row.visitor_id),
              path: nullableText(row.path) ?? "/",
              props: meta,
              release: field("release"),
              device: {
                type: nullableText(row.device_type),
                browser: field("browser"),
                browserVersion: field("browserVersion"),
                os: field("os"),
                osVersion: field("osVersion"),
                screen: field("screenSize"),
                viewport: field("viewport"),
                language: nullableText(row.lang),
                connection: field("connectionType"),
              },
            };
          }),
          total: numeric(counts?.total),
        };
      }),
    setStatus: (issue, status) =>
      attempt("Could not update the issue", async () => {
        const [row] = await selectRows(
          db,
          sql`UPDATE issues i SET status = ${status},
              resolved_at = CASE WHEN ${status} = 'resolved' THEN now() ELSE NULL END,
              is_regression = CASE WHEN ${status} = 'resolved' THEN false ELSE i.is_regression END,
              muted_until = NULL,
              mute_remaining = NULL,
              updated_at = now()
            WHERE i.id = ${rowId(issue.id)}::bigint RETURNING *`,
        );
        if (!row) throw new Error("The issue was not updated");
        return toIssue(row);
      }),
    ignores: (projectId) =>
      attempt("Could not read the ignore rules", async () => {
        const rows = await selectRows(
          db,
          sql`SELECT * FROM error_rules WHERE project_id = ${projectId} ORDER BY created_at, id`,
        );
        return rows.map(toRule);
      }),
    muted: (projectId) =>
      attempt("Could not read the muted issues", async () => {
        const rows = await selectRows(
          db,
          sql`SELECT * FROM issues i WHERE i.project_id = ${projectId} AND i.status = 'ignored'
            AND (i.muted_until IS NOT NULL OR i.mute_remaining IS NOT NULL) ORDER BY i.id`,
        );
        return rows.map(toIssue);
      }),
    addIgnore: (projectId, field, pattern) =>
      attempt("Could not add the ignore rule", async () => {
        const [row] = await selectRows(
          db,
          sql`INSERT INTO error_rules (id, project_id, field, pattern)
            VALUES (${`rule_${crypto.randomUUID()}`}, ${projectId}, ${field}, ${pattern}) RETURNING *`,
        );
        if (!row) throw new Error("The rule was not stored");
        return toRule(row);
      }),
    removeIgnore: (projectId, id) =>
      attempt("Could not remove the ignore rule", async () => {
        const rows = await selectRows(
          db,
          sql`DELETE FROM error_rules WHERE project_id = ${projectId} AND id = ${id} RETURNING id`,
        );
        return rows.length > 0;
      }),
    mute: (issue, until, count) =>
      attempt("Could not mute the issue", async () => {
        const [row] = await selectRows(
          db,
          sql`UPDATE issues i SET status = 'ignored', muted_until = ${until ? until.toISOString() : null}::timestamptz,
              mute_remaining = ${count}::integer, updated_at = now()
            WHERE i.id = ${rowId(issue.id)}::bigint RETURNING *`,
        );
        if (!row) throw new Error("The issue was not muted");
        return toIssue(row);
      }),
    pendingAlerts: (limit) =>
      attempt("Could not read pending alerts", async () => {
        const rows = await selectRows(
          db,
          sql`SELECT * FROM issues i WHERE i.status = 'open'
              AND (i.alerted_at IS NULL OR (i.regressed_at IS NOT NULL AND i.regressed_at > i.alerted_at))
            ORDER BY i.last_seen LIMIT ${limit}`,
        );
        return rows.map((row) => ({
          issue: toIssue(row),
          kind:
            row.alerted_at === null || row.alerted_at === undefined
              ? ("new" as const)
              : ("regression" as const),
        }));
      }),
    markAlerted: (issues) =>
      attempt("Could not mark the alerts sent", async () => {
        const ids = issues.map((issue) => rowId(issue.id)).filter((id) => id !== null);
        if (ids.length === 0) return null;
        await db.execute(
          sql`UPDATE issues SET alerted_at = now() WHERE id IN (${sql.join(
            ids.map((id) => sql`${id}::bigint`),
            sql`, `,
          )})`,
        );
        return null;
      }),
  };
}
