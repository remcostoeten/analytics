import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name languageDimension
 * @description The browser language, such as `nl-NL`.
 *
 * @example
 * findDimension("language");
 */
export const languageDimension = defineDimension({
  name: "language",
  label: "Language",
  join: null,
  expression: () => sql.raw(`e.lang`),
});
