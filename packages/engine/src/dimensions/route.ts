import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name routeDimension
 * @description The route template an adapter supplied, such as `/blog/[slug]`.
 *
 * @example
 * findDimension("route");
 */
export const routeDimension = defineDimension({
  name: "route",
  label: "Route",
  join: null,
  expression: () => sql.raw(`e.route`),
});
