import type {
  LineKind,
  LineLevel,
  LineSource,
  LogData,
  LogValue,
} from "@remcostoeten/analytics-contract";
import { ok } from "@remcostoeten/analytics-shared/result";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";
import { and, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { logs } from "../db/schema";
import type { LogFilter, LogPage, LogQuery, LogRecord, LogStore } from "../ports";
import { batchCode, rateLimitedCode } from "../logs/lines";
import type { Database } from "./drizzle";
import { attempt, numeric, selectRows, textual } from "./drizzle-rows";
import type { Row } from "./drizzle-rows";

const levels = new Set<string>(["info", "ok", "warn", "error"]);
const kinds = new Set<string>(["ingest", "transport", "pipeline", "signals", "jobs", "auth"]);
const sources = new Set<string>(["api", "sdk", "engine", "cron"]);

function nullableText(value: unknown): Nullable<string> {
  return value === null || value === undefined ? null : textual(value);
}

function logValue(value: unknown): LogValue {
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (Array.isArray(value)) return value.map((item) => textual(item));
  return textual(value);
}

function logData(value: unknown): LogData {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, logValue(item)]));
}

function record(row: Row): LogRecord {
  const level = textual(row.level);
  const kind = textual(row.kind);
  const source = textual(row.source);
  return {
    id: textual(row.id),
    project: textual(row.project),
    ts: new Date(textual(row.ts)),
    level: levels.has(level) ? (level as LineLevel) : "info",
    kind: kinds.has(kind) ? (kind as LineKind) : "pipeline",
    source: sources.has(source) ? (source as LineSource) : "engine",
    message: textual(row.message),
    data: logData(row.data),
    visitor: nullableText(row.visitor),
    session: nullableText(row.session),
  };
}

function filtered(filter: LogFilter): SQL {
  const conditions: SQL[] = [sql`l.project = ${filter.project}`];
  if (filter.level) conditions.push(sql`l.level = ${filter.level}`);
  if (filter.kind) conditions.push(sql`l.kind = ${filter.kind}`);
  if (filter.source) conditions.push(sql`l.source = ${filter.source}`);
  if (filter.visitor) conditions.push(sql`l.visitor = ${filter.visitor}`);
  if (filter.search) {
    conditions.push(sql`strpos(lower(l.message), lower(${filter.search})) > 0`);
  }
  return and(...conditions) ?? sql`true`;
}

function pause(ms: number, signal: Nullable<AbortSignal>) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/**
 * @name drizzleLogs
 * @description The `LogStore` on the `logs` table: batched writes; reads that mirror the live
 * feed, the newest lines at once without a cursor and long-polling every `pollMs` for lines after
 * one; and ingest totals since a moment, summed from the batch and rate limit lines.
 *
 * @example
 * const store = drizzleLogs(db, { pollMs: 2000 });
 * await store.next({ filter, after: null, limit: 100 }, { ms: 25_000, signal: null });
 */
export function drizzleLogs(db: Database, options: { pollMs: number }): LogStore {
  async function read(query: LogQuery): Promise<LogPage> {
    const where = filtered(query.filter);
    const columns = sql`l.id::text AS id, l.project, l.ts, l.level, l.kind, l.source, l.message, l.data, l.visitor, l.session`;
    const rows = query.after
      ? await selectRows(
          db,
          sql`SELECT ${columns} FROM logs l WHERE ${where} AND l.id > ${query.after}::bigint
            ORDER BY l.id ASC LIMIT ${query.limit}`,
        )
      : await selectRows(
          db,
          sql`SELECT * FROM (
              SELECT ${columns} FROM logs l WHERE ${where} ORDER BY l.id DESC LIMIT ${query.limit}
            ) latest ORDER BY latest.id::bigint ASC`,
        );
    const lines = rows.map(record);
    const last = lines.at(-1);
    if (last) return { lines, cursor: last.id };
    if (query.after) return { lines, cursor: query.after };
    const [top] = await selectRows(db, sql`SELECT COALESCE(max(id), 0)::text AS id FROM logs`);
    return { lines, cursor: textual(top?.id ?? "0") };
  }

  return {
    write: async (lines) => {
      if (lines.length === 0) return ok(null);
      return attempt("Could not write the log lines", async () => {
        await db.insert(logs).values(lines);
        return null;
      });
    },
    next: (query, wait) =>
      attempt("Could not read the log lines", async () => {
        const deadline = Date.now() + wait.ms;
        async function poll(): Promise<LogPage> {
          const page = await read(query);
          const left = deadline - Date.now();
          if (page.lines.length > 0 || !query.after || left <= 0 || wait.signal?.aborted) {
            return page;
          }
          await pause(Math.min(options.pollMs, left), wait.signal);
          return poll();
        }
        return poll();
      }),
    ingestTotals: (project, since) =>
      attempt("Could not read the ingest totals", async () => {
        const [row] = await selectRows(
          db,
          sql`SELECT
              COALESCE(sum((data->>'accepted')::int) FILTER (WHERE data->>'code' = ${batchCode}), 0) AS accepted,
              COALESCE(sum((data->>'duplicates')::int) FILTER (WHERE data->>'code' = ${batchCode}), 0) AS duplicates,
              COALESCE(sum((data->>'rejected')::int) FILTER (WHERE data->>'code' = ${batchCode}), 0) AS rejected,
              count(*) FILTER (WHERE data->>'code' = ${rateLimitedCode}) AS rate_limited
            FROM logs
            WHERE project = ${project} AND kind = 'ingest' AND ts >= ${since.toISOString()}::timestamptz`,
        );
        return {
          accepted: numeric(row?.accepted),
          duplicates: numeric(row?.duplicates),
          rejected: numeric(row?.rejected),
          rateLimited: numeric(row?.rate_limited),
        };
      }),
  };
}
