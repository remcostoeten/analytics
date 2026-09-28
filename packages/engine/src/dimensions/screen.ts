import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name screenDimension
 * @description The screen size, such as `1440x900`.
 *
 * @example
 * findDimension("screen");
 */
export const screenDimension = defineDimension({
  name: "screen",
  label: "Screen",
  join: null,
  expression: () => sql.raw(`e.meta->>'screenSize'`),
});
