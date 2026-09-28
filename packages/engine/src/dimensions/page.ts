import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name pageDimension
 * @description The page path, without the query string.
 *
 * @example
 * findDimension("page");
 */
export const pageDimension = defineDimension({
  name: "page",
  label: "Page",
  join: null,
  expression: () => sql.raw(`e.path`),
});
