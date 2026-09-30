import type { Nullable } from "./semantic";

type Record = { readonly [key: string]: unknown };

/**
 * @name hasKeys
 * @description Tells whether an object has at least one own enumerable key.
 *
 * @example
 * if (hasKeys(input.context)) event.context = input.context;
 */
export function hasKeys(value: Record): boolean {
  return Object.keys(value).length > 0;
}

/**
 * @name orNull
 * @description Returns the object when it has at least one key, and `null` when it is empty, for
 * fields where an empty object means nothing was set.
 *
 * @example
 * const row = { identity: orNull(identity), meta: orNull(patch) };
 */
export function orNull<Value extends Record>(value: Value): Nullable<Value> {
  return hasKeys(value) ? value : null;
}
