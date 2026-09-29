import { sql } from "drizzle-orm";

import { defineDimension } from "../define";
import type { Dimension } from "../define";
import { groupsKey } from "../groups";

// A prop or trait key: letters, digits, underscores, dots and dashes.
const keyPattern = /^[\w.-]{1,64}$/;
// A group type: a lowercase letter, then up to 31 lowercase letters, digits or underscores.
const groupTypePattern = /^[a-z][a-z0-9_]{0,31}$/;

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

/**
 * @name groupDimension
 * @description `group:<type>`: the id of the group of that type an event was sent in, such as the
 * company or workspace from the `groups` plugin. Returns null for a type outside
 * `[a-z][a-z0-9_]{0,31}`.
 *
 * @example
 * groupDimension("company");
 */
export function groupDimension(type: string): Dimension | null {
  if (!groupTypePattern.test(type)) return null;
  return defineDimension({
    name: `group:${type}`,
    label: `Group ${type}`,
    join: null,
    expression: () => sql`e.meta->${groupsKey}->>${type}`,
  });
}
