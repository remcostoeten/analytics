import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name releaseDimension
 * @description The release the SDK was configured with.
 *
 * @example
 * findDimension("release");
 */
export const releaseDimension = defineDimension({
  name: "release",
  label: "Release",
  join: null,
  expression: () => sql.raw(`e.meta->>'release'`),
});
