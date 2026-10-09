import type { ClientError } from "@spoar/client";
import type { SessionEvent, SessionEvents } from "@spoar/contract";
import type { Result } from "@spoar/shared/result";

export type TrailStep = {
  id: string;
  kind: "pageview" | "event";
  name: string;
  ts: string;
  offsetMs: number;
  path: string;
  title: string | null;
  dwellMs: number | null;
  props: SessionEvent["props"];
};

const sideEvents = new Set(["web_vital", "scroll_depth", "engagement"]);

/**
 * @name trailSteps
 * @description A session's events as an ordered timeline: each step carries its offset from the
 * first event, and each pageview how long it was on screen until the next pageview (null for the
 * last). Web vitals, scroll depth and engagement pings are left out, since they describe a page
 * rather than something the visitor did.
 *
 * @example
 * trailSteps(sessionEvents.data).map((step) => `${step.offsetMs} ${step.kind} ${step.path}`);
 */
export function trailSteps(events: SessionEvent[]): TrailStep[] {
  const ordered = [...events]
    .filter((event) => !sideEvents.has(event.name))
    .sort((left, right) => Date.parse(left.ts) - Date.parse(right.ts));
  const start = ordered[0] ? Date.parse(ordered[0].ts) : 0;
  const pageviewTimes = ordered
    .filter((event) => event.name === "pageview")
    .map((event) => Date.parse(event.ts));
  return ordered.map((event) => {
    const at = Date.parse(event.ts);
    const next = event.name === "pageview" ? pageviewTimes.find((time) => time > at) : undefined;
    return {
      id: event.id,
      kind: event.name === "pageview" ? "pageview" : "event",
      name: event.name,
      ts: event.ts,
      offsetMs: at - start,
      path: event.page.path,
      title: event.page.title,
      dwellMs: event.name === "pageview" ? (next === undefined ? null : next - at) : null,
      props: event.props,
    };
  });
}

/**
 * @name countSteps
 * @description How many pageviews and other events a trail holds.
 *
 * @example
 * countSteps(steps); // { pageviews: 3, events: 2 }
 */
export function countSteps(steps: TrailStep[]) {
  let pageviews = 0;
  let events = 0;
  for (const step of steps) {
    if (step.kind === "pageview") pageviews += 1;
    else events += 1;
  }
  return { pageviews, events };
}

/**
 * @name formatProps
 * @description Event props as `key: value` pairs for a compact line, skipping empty ones.
 *
 * @example
 * formatProps({ plan: "pro", seats: 3 }); // ["plan: pro", "seats: 3"]
 */
export function formatProps(props: SessionEvent["props"]) {
  return Object.entries(props)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`);
}

export const trailPageSize = 100;

export const trailMaxPages = 10;

/**
 * @name collectTrail
 * @description Reads a session's events page by page until the last page or `maxPages`, since a
 * session with many web vitals spreads its pageviews over several pages. The result keeps the
 * first page's session and a `nextCursor` only when pages were left unread.
 *
 * @example
 * const trail = await collectTrail((cursor) => scope.sessionEvents(id, { limit: 100, cursor }), 10);
 */
export async function collectTrail(
  readPage: (cursor: string | undefined) => Promise<Result<SessionEvents, ClientError>>,
  maxPages: number,
): Promise<Result<SessionEvents, ClientError>> {
  const data: SessionEvent[] = [];
  let first: SessionEvents | null = null;
  let nextCursor: string | null = null;
  for (let page = 0; page < maxPages; page += 1) {
    const read = await readPage(nextCursor ?? undefined);
    if (!read.ok) return read;
    first ??= read.value;
    data.push(...read.value.data);
    nextCursor = read.value.nextCursor;
    if (nextCursor === null) break;
  }
  const session = first?.session ?? {
    id: "",
    visitor: "",
    startedAt: "",
    durationMs: 0,
    bot: { score: 0, reasons: [] },
  };
  return { ok: true, value: { session, data, nextCursor } };
}
