import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name browserVersionDimension
 * @description The browser's major version.
 *
 * @example
 * findDimension("browser_version");
 */
export const browserVersionDimension = defineDimension({
  name: "browser_version",
  label: "Browser version",
  join: null,
  expression: () => sql.raw(`e.meta->>'browserVersion'`),
});
