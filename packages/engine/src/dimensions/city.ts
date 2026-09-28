import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name cityDimension
 * @description The city from geo lookup.
 *
 * @example
 * findDimension("city");
 */
export const cityDimension = defineDimension({
  name: "city",
  label: "City",
  join: null,
  expression: () => sql.raw(`e.city`),
});
