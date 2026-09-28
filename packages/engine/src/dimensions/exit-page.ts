import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name exitPageDimension
 * @description The last page of the event's session.
 *
 * @example
 * findDimension("exit_page");
 */
export const exitPageDimension = defineDimension({
  name: "exit_page",
  label: "Exit page",
  join: "session",
  expression: () => sql.raw(`s.exit_path`),
});
