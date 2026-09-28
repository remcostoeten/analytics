import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name entryPageDimension
 * @description The first page of the event's session.
 *
 * @example
 * findDimension("entry_page");
 */
export const entryPageDimension = defineDimension({
  name: "entry_page",
  label: "Entry page",
  join: "session",
  expression: () => sql.raw(`s.entry_path`),
});
