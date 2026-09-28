import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name viewportDimension
 * @description The viewport size, such as `1280x720`.
 *
 * @example
 * findDimension("viewport");
 */
export const viewportDimension = defineDimension({
  name: "viewport",
  label: "Viewport",
  join: null,
  expression: () => sql.raw(`e.meta->>'viewport'`),
});
