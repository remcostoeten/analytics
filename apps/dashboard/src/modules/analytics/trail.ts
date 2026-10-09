import type { SessionEvent } from "@spoar/contract";

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
