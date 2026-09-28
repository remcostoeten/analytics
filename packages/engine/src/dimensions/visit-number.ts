import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name visitNumberDimension
 * @description Which visit of the visitor the event's session is: `1`, `2`, `3`, `4-10` or `11+`,
 * counted over the visitor's sessions in this project.
 *
 * @example
 * findDimension("visit_number");
 */
export const visitNumberDimension = defineDimension({
  name: "visit_number",
  label: "Visit number",
  join: "session",
  expression: () =>
    sql.raw(`CASE
      WHEN s.started_at IS NULL THEN NULL
      ELSE (SELECT CASE WHEN n <= 3 THEN n::text WHEN n <= 10 THEN '4-10' ELSE '11+' END FROM (
        SELECT count(*) AS n FROM sessions s2
        WHERE s2.project_id = e.project_id AND s2.visitor_id = e.visitor_id AND s2.started_at <= s.started_at
      ) AS counted)
    END`),
});
