import type { DeviceType, LiveEvents } from "@remcostoeten/analytics-contract";
import { engineError } from "@remcostoeten/analytics-engine";
import type {
  EngineError,
  FeedCursor,
  FeedPage,
  FeedQuery,
  RealtimeFeed,
} from "@remcostoeten/analytics-engine";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";
import { t } from "elysia";

import { readFilters, readTraffic } from "./params";

export type LiveOptions = { waitMs: number; streamMs: number };

type Wait = { ms: number; signal: AbortSignal | null };

export const eventStream = t.Unsafe<Response>(t.Any({ description: "text/event-stream" }));

const defaultLimit = 50;
const maxLimit = 100;
const devices = new Set<string>(["desktop", "mobile", "tablet", "bot", "unknown"]);

function invalid<Value>(message: string): Result<Value, EngineError> {
  return err(engineError("VALIDATION_FAILED", message));
}

function readCursor(value: string | null): Result<FeedCursor | null, EngineError> {
  if (!value) return ok(null);
  try {
    const decoded: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (
      typeof decoded === "object" &&
      decoded !== null &&
      "r" in decoded &&
      "i" in decoded &&
      typeof decoded.r === "string" &&
      typeof decoded.i === "string" &&
      !Number.isNaN(Date.parse(decoded.r)) &&
      // An event id is a bigint of up to 19 digits.
      /^\d{1,19}$/.test(decoded.i)
    ) {
      return ok({ receivedAt: decoded.r, id: decoded.i });
    }
  } catch {
    return invalid("after is not a valid cursor");
  }
  return invalid("after is not a valid cursor");
}

function writeCursor(cursor: FeedCursor) {
  return Buffer.from(JSON.stringify({ r: cursor.receivedAt, i: cursor.id })).toString("base64url");
}

function device(value: string | null): DeviceType {
  return value && devices.has(value) ? (value as DeviceType) : "unknown";
}

/**
 * @name liveQuery
 * @description Reads `traffic`, the filters, `limit` (1 to 100, default 50) and the `after`
 * cursor (or a `Last-Event-ID` header on a reconnecting stream) into a feed query.
 *
 * @example
 * liveQuery(params, ["remcostoeten.nl"], null);
 */
export function liveQuery(
  params: URLSearchParams,
  projectIds: string[],
  lastEventId: string | null,
): Result<FeedQuery, EngineError> {
  const traffic = readTraffic(params);
  if (!traffic.ok) return traffic;
  const filters = readFilters(params);
  if (!filters.ok) return filters;
  const limit = Number(params.get("limit") ?? defaultLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    return invalid(`limit must be a whole number from 1 to ${maxLimit}`);
  }
  const after = readCursor(params.get("after") ?? lastEventId);
  if (!after.ok) return after;
  return ok({
    scope: { projectIds, traffic: traffic.value, filters: filters.value.filters },
    after: after.value,
    limit,
  });
}

function shape(page: FeedPage, detailed: Set<string>): LiveEvents {
  return {
    data: page.events.map((event) => ({
      id: event.id,
      project: event.projectId,
      name: event.name,
      ts: event.ts.toISOString(),
      path: event.path,
      country: event.country,
      device: device(event.device),
      ...(detailed.has(event.projectId) && event.visitorId ? { visitor: event.visitorId } : {}),
      ...(detailed.has(event.projectId) && event.sessionId ? { session: event.sessionId } : {}),
    })),
    nextCursor: writeCursor(page.cursor),
  };
}

/**
 * @name liveEvents
 * @description One long-poll of the live feed: without `after` the last five minutes at once,
 * with it the events after the cursor as soon as there are any, or none when the wait ends.
 * Visitor and session ids appear only for projects in `detailed`.
 *
 * @example
 * await liveEvents(feed, query, new Set(["remcostoeten.nl"]), { ms: 25_000, signal: null });
 */
export async function liveEvents(
  feed: RealtimeFeed,
  query: FeedQuery,
  detailed: Set<string>,
  wait: Wait,
): Promise<Result<LiveEvents, EngineError>> {
  const page = await feed.next(query, wait);
  return page.ok ? ok(shape(page.value, detailed)) : page;
}

/**
 * @name liveStream
 * @description The live feed as server-sent events: an `events` message per batch with the cursor
 * as its id, a comment when a wait ends empty, and an `error` message if a read fails. The stream
 * closes after `streamMs`; the browser reconnects with `Last-Event-ID` and carries on.
 *
 * @example
 * return liveStream(feed, query, detailed, { waitMs: 25_000, streamMs: 55_000 }, request.signal);
 */
export function liveStream(
  feed: RealtimeFeed,
  query: FeedQuery,
  detailed: Set<string>,
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
      async function pump(after: FeedCursor | null): Promise<void> {
        const left = end - Date.now();
        if (left <= 0 || signal.aborted) return;
        const page = await feed.next(
          { ...query, after },
          { ms: Math.min(options.waitMs, left), signal },
        );
        if (!page.ok) {
          send(
            `event: error\ndata: ${JSON.stringify({ code: page.error.code, message: page.error.message })}\n\n`,
          );
          return;
        }
        const body = shape(page.value, detailed);
        send(
          page.value.events.length > 0
            ? `id: ${body.nextCursor}\nevent: events\ndata: ${JSON.stringify(body)}\n\n`
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
