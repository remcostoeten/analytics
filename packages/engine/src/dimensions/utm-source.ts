import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name utmSourceDimension
 * @description The `utm_source` tag.
 *
 * @example
 * findDimension("utm_source");
 */
export const utmSourceDimension = defineDimension({
  name: "utm_source",
  label: "UTM source",
  join: null,
  expression: () => sql.raw(`e.meta->>'utmSource'`),
});
