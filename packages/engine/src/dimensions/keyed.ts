import { sql } from "drizzle-orm";

import { defineDimension } from "../define";
import type { Dimension } from "../define";

// A prop or trait key: letters, digits, underscores, dots and dashes.
const keyPattern = /^[\w.-]{1,64}$/;

/**
 * @name propDimension
 * @description `prop:<key>`: the value of one event prop, as text. The key is passed as a query
 * parameter, never spliced into the SQL. Returns null for a key outside `[\w.-]{1,64}`.
 *
 * @example
 * propDimension("plan");
 */
export function propDimension(key: string): Dimension | null {
  if (!keyPattern.test(key)) return null;
  return defineDimension({
    name: `prop:${key}`,
    label: `Prop ${key}`,
    join: null,
    expression: () => sql`e.meta->>${key}`,
  });
}

/**
 * @name traitDimension
 * @description `trait:<key>`: a trait the visitor was identified with, such as `plan`.
 *
 * @example
 * traitDimension("plan");
 */
export function traitDimension(key: string): Dimension | null {
  if (!keyPattern.test(key)) return null;
  return defineDimension({
    name: `trait:${key}`,
    label: `Trait ${key}`,
    join: "visitor",
    expression: () => sql`v.meta->'identity'->>${key}`,
  });
}
