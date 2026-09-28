import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name utmMediumDimension
 * @description The `utm_medium` tag.
 *
 * @example
 * findDimension("utm_medium");
 */
export const utmMediumDimension = defineDimension({
  name: "utm_medium",
  label: "UTM medium",
  join: null,
  expression: () => sql.raw(`e.meta->>'utmMedium'`),
});
