import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name referrerDimension
 * @description The full referrer URL of the first pageview.
 *
 * @example
 * findDimension("referrer");
 */
export const referrerDimension = defineDimension({
  name: "referrer",
  label: "Referrer",
  join: null,
  expression: () => sql.raw(`e.referrer`),
});
