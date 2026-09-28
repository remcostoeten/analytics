import type { WireContext, WireEvent } from "@remcostoeten/analytics-contract";

import type { Props } from "./types";

export type Limited = {
  props: Props;
  problems: string[];
};

export type PageFacts = {
  path: string;
  route: string | null;
  title: string | null;
  referrer: string | null;
};

export type EventInput = {
  id: string;
  name: string;
  ts: string;
  visitor: string;
  session: string;
  page: PageFacts;
  props: Props;
  context: WireContext;
};

const maxProps = 25;
const maxLength = 255;
const longKeys = new Set(["stack", "breadcrumbs"]);
const longLength = 2048;

function isPrimitive(value: unknown): value is Props[string] {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

/**
 * @name limitProps
 * @description Keeps event props inside the limits: at most 25, names and keys up to 255
 * characters, flat primitive values, strings cut at 255 characters. Anything outside is left out
 * or shortened, and its key is listed in `problems` so development mode can warn about it. On
 * error events `stack` and `breadcrumbs` may be up to 2048 characters.
 *
 * @example
 * limitProps({ plan: "pro", nested: { a: 1 } }).problems; // ["nested"]
 */
export function limitProps(props: { [key: string]: unknown }, error = false): Limited {
  const kept: Props = {};
  const problems: string[] = [];
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) continue;
    if (Object.keys(kept).length === maxProps || key.length > maxLength || !isPrimitive(value)) {
      problems.push(key.slice(0, 32));
      continue;
    }
    const limit = error && longKeys.has(key) ? longLength : maxLength;
    if (typeof value === "string" && value.length > limit) problems.push(key);
    kept[key] = typeof value === "string" ? value.slice(0, limit) : value;
  }
  return { props: kept, problems };
}

/**
 * @name buildEvent
 * @description Assembles one wire event in the contract's shape: id, name, time, visitor,
 * session, page, props and context, leaving out empty optional fields.
 *
 * @example
 * buildEvent({ id, name: "pageview", ts, visitor, session, page, props: {}, context: {} });
 */
export function buildEvent(input: EventInput): WireEvent {
  const page: WireEvent["page"] = { path: input.page.path };
  if (input.page.route) page.route = input.page.route;
  if (input.page.title) page.title = input.page.title.slice(0, 2048);
  if (input.page.referrer !== null) page.referrer = input.page.referrer;
  const event: WireEvent = {
    id: input.id,
    name: input.name.slice(0, 64),
    ts: input.ts,
    visitor: input.visitor,
    session: input.session,
    page,
    props: input.props,
  };
  if (Object.keys(input.context).length > 0) event.context = input.context;
  return event;
}
