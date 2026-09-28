import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name osVersionDimension
 * @description The operating system version.
 *
 * @example
 * findDimension("os_version");
 */
export const osVersionDimension = defineDimension({
  name: "os_version",
  label: "OS version",
  join: null,
  expression: () => sql.raw(`e.meta->>'osVersion'`),
});
