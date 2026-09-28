import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name regionDimension
 * @description The region or province from geo lookup.
 *
 * @example
 * findDimension("region");
 */
export const regionDimension = defineDimension({
  name: "region",
  label: "Region",
  join: null,
  expression: () => sql.raw(`e.region`),
});
