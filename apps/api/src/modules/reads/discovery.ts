import type { EventNamesResponse, PropKeysResponse } from "@spoar/contract";
import { engineError } from "@spoar/engine";
import type { DiscoveryScope, EngineError, ReadStore } from "@spoar/engine";
import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";

const windowMs = 30 * 86_400_000;
const defaultLimit = 100;
const maxLimit = 500;

function discoveryScope(
  projectId: string,
  params: URLSearchParams,
  now: Date,
): Result<DiscoveryScope, EngineError> {
  const limit = Number(params.get("limit") ?? defaultLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    return err(
      engineError("VALIDATION_FAILED", `limit must be a whole number from 1 to ${maxLimit}`),
    );
  }
  return ok({ projectId, from: new Date(now.getTime() - windowMs), to: now, limit });
}

function range(scope: DiscoveryScope) {
  return { from: scope.from.toISOString(), to: scope.to.toISOString() };
}

/**
 * @name eventNames
 * @description Distinct event names of the last 30 days with their counts, most used first, from
 * human production traffic. `sampled` is true when the project had more events than one read
 * scans, and the counts then cover the newest events only.
 *
 * @example
 * await eventNames(store, "skriuw", params, new Date());
 */
export async function eventNames(
  store: ReadStore,
  projectId: string,
  params: URLSearchParams,
  now: Date,
): Promise<Result<EventNamesResponse, EngineError>> {
  const scope = discoveryScope(projectId, params, now);
  if (!scope.ok) return scope;
  const found = await store.eventNames(scope.value);
  if (!found.ok) return found;
  return ok({
    data: found.value.rows.map((row) => ({ name: row.value, count: row.count })),
    total: found.value.total,
    sampled: found.value.sampled,
    range: range(scope.value),
  });
}

/**
 * @name propKeys
 * @description Distinct event prop keys of the last 30 days with how many events carry each, most
 * used first, optionally for one `event` name. Fields the SDK stores next to props, such as
 * `browser` or `utmSource`, are left out. `sampled` works as on `eventNames`.
 *
 * @example
 * await propKeys(store, "skriuw", params, new Date());
 */
export async function propKeys(
  store: ReadStore,
  projectId: string,
  params: URLSearchParams,
  now: Date,
): Promise<Result<PropKeysResponse, EngineError>> {
  const scope = discoveryScope(projectId, params, now);
  if (!scope.ok) return scope;
  const event = params.get("event");
  const found = await store.propKeys(scope.value, event);
  if (!found.ok) return found;
  return ok({
    data: found.value.rows.map((row) => ({ key: row.value, count: row.count })),
    event,
    total: found.value.total,
    sampled: found.value.sampled,
    range: range(scope.value),
  });
}
