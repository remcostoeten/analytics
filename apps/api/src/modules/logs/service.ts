import { maxReportBytes } from "@spoar/contract";
import type { LineKind, LineLevel, LineSource, LogList } from "@spoar/contract";
import { engineError } from "@spoar/engine";
import type { EngineError, LogPage, LogQuery, LogStore } from "@spoar/engine";
import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";
import type { Nullable } from "@spoar/shared/semantic";

import type { LiveOptions } from "../reads/live";

type Wait = { ms: number; signal: Nullable<AbortSignal> };

const pageSize = 100;
const levels = new Set<string>(["info", "ok", "warn", "error"]);
const kinds = new Set<string>(["ingest", "transport", "pipeline", "signals", "jobs", "auth"]);
const sources = new Set<string>(["api", "sdk", "engine", "cron"]);
// A log cursor: the id of the last line, a bigint of up to 19 digits.
const cursorPattern = /^\d{1,19}$/;

function invalid<Value>(message: string): Result<Value, EngineError> {
  return err(engineError("VALIDATION_FAILED", message));
}

function choice<Value extends string>(
  params: URLSearchParams,
  name: string,
  allowed: Set<string>,
): Result<Nullable<Value>, EngineError> {
  const value = params.get(name);
  if (value === null) return ok(null);
  // The set holds exactly the members of Value, so a value it contains is one of them.
  return allowed.has(value) ? ok(value as Value) : invalid(`Unknown ${name} ${value}`);
}

/**
 * @name logQuery
 * @description Reads the log filters (`level`, `kind`, `source`, `visitor` and `q`, a substring of
 * the message) and the `after` cursor, or a reconnecting stream's `Last-Event-ID`, into a query
 * for the last 100 lines or the lines after the cursor.
 *
 * @example
 * logQuery(params, "docs", null);
 */
export function logQuery(
  params: URLSearchParams,
  project: string,
  lastEventId: Nullable<string>,
): Result<LogQuery, EngineError> {
  const level = choice<LineLevel>(params, "level", levels);
  if (!level.ok) return level;
  const kind = choice<LineKind>(params, "kind", kinds);
  if (!kind.ok) return kind;
  const source = choice<LineSource>(params, "source", sources);
  if (!source.ok) return source;
  const after = params.get("after") ?? lastEventId;
  if (after !== null && !cursorPattern.test(after)) return invalid("after is not a valid cursor");
  return ok({
    filter: {
      project,
      level: level.value,
      kind: kind.value,
      source: source.value,
      visitor: params.get("visitor"),
      search: params.get("q"),
    },
    after,
    limit: pageSize,
  });
}

function shape(page: LogPage): LogList {
  return {
    data: page.lines.map((line) => ({
      id: line.id,
      ts: line.ts.toISOString(),
      level: line.level,
      kind: line.kind,
      source: line.source,
      message: line.message,
      data: line.data,
      visitor: line.visitor,
      session: line.session,
    })),
    nextCursor: page.cursor,
  };
}

/**
 * @name logLines
 * @description One long-poll of the log: without `after` the last 100 lines at once, with it the
 * lines after the cursor as soon as there are any, or none when the wait ends.
 *
 * @example
 * await logLines(store, query, { ms: 25_000, signal: null });
 */
export async function logLines(
  store: LogStore,
  query: LogQuery,
  wait: Wait,
): Promise<Result<LogList, EngineError>> {
  const page = await store.next(query, wait);
  return page.ok ? ok(shape(page.value)) : page;
}

/**
 * @name logStream
 * @description The log as server-sent events, like the live feed: a `logs` message per batch with
 * the cursor as its id, a comment when a wait ends empty, and an `error` message if a read fails.
 * The stream closes after `streamMs` and the browser reconnects with `Last-Event-ID`.
 *
 * @example
 * return logStream(store, query, { waitMs: 25_000, streamMs: 55_000 }, request.signal);
 */
export function logStream(
  store: LogStore,
  query: LogQuery,
  options: LiveOptions,
  signal: AbortSignal,
): Response {
  const encoder = new TextEncoder();
  const end = Date.now() + options.streamMs;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(text: string) {
        controller.enqueue(encoder.encode(text));
      }
      async function pump(after: Nullable<string>): Promise<void> {
        const left = end - Date.now();
        if (left <= 0 || signal.aborted) return;
        const page = await store.next(
          { ...query, after },
          { ms: Math.min(options.waitMs, left), signal },
        );
        if (!page.ok) {
          send(
            `event: error\ndata: ${JSON.stringify({ code: page.error.code, message: page.error.message })}\n\n`,
          );
          return;
        }
        const body = shape(page.value);
        send(
          page.value.lines.length > 0
            ? `id: ${body.nextCursor}\nevent: logs\ndata: ${JSON.stringify(body)}\n\n`
            : ": waiting\n\n",
        );
        return pump(page.value.cursor);
      }
      send("retry: 2000\n\n");
      await pump(query.after);
      if (!signal.aborted) controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "private, no-store",
      "x-accel-buffering": "no",
    },
  });
}

/**
 * @name readReport
 * @description Reads a raw client report body: over 16 KB is `PAYLOAD_TOO_LARGE`, text that is not
 * JSON is `VALIDATION_FAILED`, and anything else is the parsed value for the schema to check.
 *
 * @example
 * readReport('{"logs":[]}');
 */
export function readReport(text: string): Result<unknown, EngineError> {
  if (new TextEncoder().encode(text).length > maxReportBytes) {
    return err(engineError("PAYLOAD_TOO_LARGE", `The body is over ${maxReportBytes / 1024} KB`));
  }
  try {
    return ok(JSON.parse(text));
  } catch {
    return invalid("The body is not valid JSON");
  }
}
