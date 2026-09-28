import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name connectionDimension
 * @description The effective connection type, such as `4g`.
 *
 * @example
 * findDimension("connection");
 */
export const connectionDimension = defineDimension({
  name: "connection",
  label: "Connection",
  join: null,
  expression: () => sql.raw(`e.meta->>'connectionType'`),
});
