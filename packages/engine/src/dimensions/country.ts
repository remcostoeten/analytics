import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name countryDimension
 * @description The ISO country code from geo lookup.
 *
 * @example
 * findDimension("country");
 */
export const countryDimension = defineDimension({
  name: "country",
  label: "Country",
  join: null,
  expression: () => sql.raw(`e.country`),
});
