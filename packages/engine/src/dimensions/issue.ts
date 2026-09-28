import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

// An issue id as the API shows it: "iss_" and the row id.
const issueId = /^iss_(\d{1,18})$/;

/**
 * @name issueDimension
 * @description The issue an error event was grouped into, as `iss_<id>`, so any breakdown can be
 * narrowed to one issue with `filter[issue]=iss_42`.
 *
 * @example
 * findDimension("issue");
 */
export const issueDimension = defineDimension({
  name: "issue",
  label: "Issue",
  join: null,
  expression: () => sql.raw(`('iss_' || e.issue_id)`),
  matches: (value) => {
    const id = issueId.exec(value)?.[1];
    return id ? sql`e.issue_id = ${id}::bigint` : sql`false`;
  },
});
