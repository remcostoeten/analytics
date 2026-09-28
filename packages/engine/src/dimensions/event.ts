import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name eventDimension
 * @description The event name; v1 rows fall back to their legacy event name and type.
 *
 * @example
 * findDimension("event");
 */
export const eventDimension = defineDimension({
  name: "event",
  label: "Event",
  join: null,
  expression: () => sql.raw(`COALESCE(e.name, e.meta->>'eventName', e.type)`),
});
