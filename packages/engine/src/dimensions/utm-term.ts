import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name utmTermDimension
 * @description The `utm_term` tag.
 *
 * @example
 * findDimension("utm_term");
 */
export const utmTermDimension = defineDimension({
  name: "utm_term",
  label: "UTM term",
  join: null,
  expression: () => sql.raw(`e.meta->>'utmTerm'`),
});
