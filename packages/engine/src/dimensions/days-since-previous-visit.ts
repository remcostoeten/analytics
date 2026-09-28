import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name daysSincePreviousVisitDimension
 * @description Days between the start of the event's session and the visitor's previous session:
 * `same day`, `1`, `2-7`, `8-30` or `31+`. First visits have no value.
 *
 * @example
 * findDimension("days_since_previous_visit");
 */
export const daysSincePreviousVisitDimension = defineDimension({
  name: "days_since_previous_visit",
  label: "Days since previous visit",
  join: "session",
  expression: () =>
    sql.raw(`(SELECT CASE
        WHEN gap IS NULL THEN NULL
        WHEN gap < interval '1 day' THEN 'same day'
        WHEN gap < interval '2 days' THEN '1'
        WHEN gap < interval '8 days' THEN '2-7'
        WHEN gap < interval '31 days' THEN '8-30'
        ELSE '31+'
      END FROM (
        SELECT s.started_at - max(s2.started_at) AS gap FROM sessions s2
        WHERE s2.project_id = e.project_id AND s2.visitor_id = e.visitor_id AND s2.started_at < s.started_at
      ) AS previous)`),
});
