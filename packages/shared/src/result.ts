export type Ok<Value> = { ok: true; value: Value };
export type Err<Failure> = { ok: false; error: Failure };
export type Result<Value, Failure> = Ok<Value> | Err<Failure>;

/**
 * @name ok
 * @description Wraps a value in a successful `Result`.
 *
 * @example
 * return ok(event);
 */
export function ok<Value>(value: Value): Ok<Value> {
  return { ok: true, value };
}

/**
 * @name err
 * @description Wraps a failure in an unsuccessful `Result`. Engine code returns this instead of
 * throwing; a thrown exception means a bug.
 *
 * @example
 * return err({ code: "VALIDATION_FAILED", message: "events[0].name is empty" });
 */
export function err<Failure>(error: Failure): Err<Failure> {
  return { ok: false, error };
}
