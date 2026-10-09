import type { ClientError } from "@spoar/client";
import type {
  ActiveVisitors,
  LiveEvent,
  LiveEvents,
  LiveSessions,
  RealtimeResponse,
} from "@spoar/contract";
import type { Result } from "@spoar/shared/result";

export type RealtimeSnapshot = {
  at: string;
  summary: Result<RealtimeResponse, ClientError>;
  events: Result<LiveEvents, ClientError>;
  visitors: Result<ActiveVisitors, ClientError>;
  sessions: Result<LiveSessions, ClientError>;
};

export const realtimeIntervalMs = 5_000;

export const feedLimit = 50;

export const feedKeep = 100;

/**
 * @name mergeEvents
 * @description Adds newly polled live events to the feed, newest first, skipping ids already
 * shown and keeping at most `keep` rows, so a poll never repeats or spins the list.
 *
 * @example
 * mergeEvents(shown, polled.data, 100);
 */
export function mergeEvents(shown: LiveEvent[], polled: LiveEvent[], keep: number): LiveEvent[] {
  const seen = new Set(shown.map((event) => event.id));
  const fresh = polled.filter((event) => !seen.has(event.id));
  if (fresh.length === 0) return shown;
  return [...fresh, ...shown]
    .sort((left, right) => Date.parse(right.ts) - Date.parse(left.ts))
    .slice(0, keep);
}

/**
 * @name needsSignIn
 * @description Whether a failed detail read failed for lack of access rather than another
 * error, so the panel can show a sign-in note instead of an error.
 *
 * @example
 * needsSignIn(snapshot.visitors);
 */
export function needsSignIn(result: Result<unknown, ClientError>) {
  return !result.ok && (result.error.code === "UNAUTHORIZED" || result.error.code === "FORBIDDEN");
}
