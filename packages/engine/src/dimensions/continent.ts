import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name continentDimension
 * @description The continent code from geo lookup.
 *
 * @example
 * findDimension("continent");
 */
export const continentDimension = defineDimension({
  name: "continent",
  label: "Continent",
  join: null,
  expression: () => sql.raw(`e.continent`),
});
