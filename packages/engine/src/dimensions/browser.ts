import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name browserDimension
 * @description The browser name from the user agent.
 *
 * @example
 * findDimension("browser");
 */
export const browserDimension = defineDimension({
  name: "browser",
  label: "Browser",
  join: null,
  expression: () => sql.raw(`e.meta->>'browser'`),
});
