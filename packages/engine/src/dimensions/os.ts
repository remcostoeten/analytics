import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name osDimension
 * @description The operating system name.
 *
 * @example
 * findDimension("os");
 */
export const osDimension = defineDimension({
  name: "os",
  label: "Operating system",
  join: null,
  expression: () => sql.raw(`e.meta->>'os'`),
});
