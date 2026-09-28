import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name visitorTypeDimension
 * @description `new` for visitors first seen inside the range, `returning` for the rest.
 *
 * @example
 * findDimension("visitor_type");
 */
export const visitorTypeDimension = defineDimension({
  name: "visitor_type",
  label: "Visitor type",
  join: "visitor",
  expression: ({ from }) =>
    sql`CASE WHEN v.first_seen >= ${from.toISOString()}::timestamptz THEN 'new' ELSE 'returning' END`,
});
