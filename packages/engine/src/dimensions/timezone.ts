import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name timezoneDimension
 * @description The IANA timezone from geo lookup.
 *
 * @example
 * findDimension("timezone");
 */
export const timezoneDimension = defineDimension({
  name: "timezone",
  label: "Timezone",
  join: null,
  expression: () => sql.raw(`e.timezone`),
});
