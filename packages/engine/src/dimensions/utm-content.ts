import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name utmContentDimension
 * @description The `utm_content` tag.
 *
 * @example
 * findDimension("utm_content");
 */
export const utmContentDimension = defineDimension({
  name: "utm_content",
  label: "UTM content",
  join: null,
  expression: () => sql.raw(`e.meta->>'utmContent'`),
});
