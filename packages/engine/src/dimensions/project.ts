import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name projectDimension
 * @description The project, for routes that cover several projects.
 *
 * @example
 * findDimension("project");
 */
export const projectDimension = defineDimension({
  name: "project",
  label: "Project",
  join: null,
  expression: () => sql.raw(`e.project_id`),
});
