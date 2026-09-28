import { WireEvent } from "@remcostoeten/analytics-contract";
import type { WireEvent as Event } from "@remcostoeten/analytics-contract";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";
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

/**
 * @name parseEvent
 * @description The parse stage: checks one raw event of a batch against the contract's
 * `WireEvent`, so a bad event is rejected by index while the rest of the batch is stored.
 *
 * @example
 * parseEvent({ name: "" }, 1); // err VALIDATION_FAILED "events[1].id: Expected required property"
 */
export function parseEvent(raw: unknown, index: number): Result<Event, EngineError> {
  if (Value.Check(WireEvent, raw)) return ok(raw);
  const [first] = Value.Errors(WireEvent, raw);
  const message = first
    ? `events[${index}]${location(first.path)}: ${first.message}`
    : `events[${index}] is not a valid event`;
  return err({ ...engineError("VALIDATION_FAILED", message), details: { index } });
}
