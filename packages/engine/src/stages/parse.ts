import { propValueLimit, WireEvent } from "@spoar/contract";
import type { WireEvent as Event } from "@spoar/contract";
import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";
import { Value } from "@sinclair/typebox/value";

import { engineError } from "../errors";
import type { EngineError } from "../errors";

function location(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => (/^\d+$/.test(segment) ? `[${segment}]` : `.${segment}`))
    .join("");
}

function longProp(event: Event) {
  return Object.entries(event.props).find(
    ([key, value]) => typeof value === "string" && value.length > propValueLimit(event.name, key),
  );
}

/**
 * @name parseEvent
 * @description The parse stage: checks one raw event of a batch against the contract's
 * `WireEvent`, including the prop limits the SDK applies (count, key length and each string
 * value's length for the event's name), so a bad event is rejected by index while the rest of the
 * batch is stored.
 *
 * @example
 * parseEvent({ name: "" }, 1); // err VALIDATION_FAILED "events[1].id: Expected required property"
 */
export function parseEvent(raw: unknown, index: number): Result<Event, EngineError> {
  if (Value.Check(WireEvent, raw)) {
    const long = longProp(raw);
    if (!long) return ok(raw);
    const [key] = long;
    const message = `events[${index}].props.${key}: Expected string length less or equal to ${propValueLimit(raw.name, key)}`;
    return err({ ...engineError("VALIDATION_FAILED", message), details: { index } });
  }
  const [first] = Value.Errors(WireEvent, raw);
  const message = first
    ? `events[${index}]${location(first.path)}: ${first.message}`
    : `events[${index}] is not a valid event`;
  return err({ ...engineError("VALIDATION_FAILED", message), details: { index } });
}
