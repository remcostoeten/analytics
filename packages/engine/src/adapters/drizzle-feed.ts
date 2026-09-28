import { sql } from "drizzle-orm";

import type { FeedPage, FeedQuery, RealtimeFeed } from "../ports";
import { scopeParts } from "../reads/scope";
import type { Database } from "./drizzle";
import { attempt, selectRows, textual } from "./drizzle-rows";
import type { Row } from "./drizzle-rows";

const openRange = { from: new Date(0), to: new Date(Date.UTC(9999, 0, 1)) };

function nullableText(value: unknown) {
  return value === null || value === undefined ? null : textual(value);
}

function pause(ms: number, signal: AbortSignal | null) {
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
 * @name drizzleFeed
 * @description The `RealtimeFeed` on any Drizzle Postgres database, by long-polling: with a cursor
 * it answers as soon as newer events exist, otherwise checks every `pollMs` until the wait ends;
 * without one it answers at once with the last five minutes. Events are ordered by
 * `(received_at, id)`, which the `events_project_received_idx` index serves.
 *
 * @example
 * const feed = drizzleFeed(db, { pollMs: 2000 });
 * await feed.next({ scope, after: null, limit: 50 }, { ms: 25_000, signal: null });
 */
export function drizzleFeed(db: Database, options: { pollMs: number }): RealtimeFeed {
  async function read(query: FeedQuery): Promise<FeedPage> {
    const { joins, where } = scopeParts({ ...query.scope, ...openRange }, []);
    const columns = sql`e.id::text AS id, e.id AS seq, e.project_id, COALESCE(e.name, e.type) AS name,
      e.ts, e.path, e.country, e.device_type, e.visitor_id, e.session_id,
      e.received_at, e.received_at::text AS received`;
    const rows = query.after
      ? await selectRows(
          db,
          sql`SELECT ${columns} FROM events e ${joins}
            WHERE ${where} AND e.received_at IS NOT NULL
              AND (e.received_at, e.id) > (${query.after.receivedAt}::timestamptz, ${query.after.id}::bigint)
            ORDER BY e.received_at, e.id LIMIT ${query.limit}`,
        )
      : await selectRows(
          db,
          sql`SELECT * FROM (
              SELECT ${columns} FROM events e ${joins}
              WHERE ${where} AND e.received_at >= now() - interval '5 minutes'
              ORDER BY e.received_at DESC, e.id DESC LIMIT ${query.limit}
            ) latest ORDER BY latest.received_at, latest.seq`,
        );
    const last: Row | undefined = rows.at(-1);
    const cursor = last
      ? { receivedAt: textual(last.received), id: textual(last.id) }
      : (query.after ?? (await start()));
    return {
      events: rows.map((row) => ({
        id: textual(row.id),
        projectId: textual(row.project_id),
        name: textual(row.name),
        ts: new Date(textual(row.ts)),
        path: nullableText(row.path),
        country: nullableText(row.country),
        device: nullableText(row.device_type),
        visitorId: nullableText(row.visitor_id),
        sessionId: nullableText(row.session_id),
      })),
      cursor,
    };
  }

  async function start() {
    const [row] = await selectRows(db, sql`SELECT now()::text AS now`);
    return { receivedAt: textual(row?.now), id: "0" };
  }

  return {
    next: (query, wait) =>
      attempt("Could not read the live events", async () => {
        const deadline = Date.now() + wait.ms;
        async function poll(): Promise<FeedPage> {
          const page = await read(query);
          const left = deadline - Date.now();
          if (page.events.length > 0 || !query.after || left <= 0 || wait.signal?.aborted) {
            return page;
          }
          await pause(Math.min(options.pollMs, left), wait.signal);
          return poll();
        }
        return poll();
      }),
  };
}
