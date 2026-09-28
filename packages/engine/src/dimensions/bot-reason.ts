import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name botReasonDimension
 * @description Each reason the bot score gave an event; an event with several reasons counts once
 * under each.
 *
 * @example
 * findDimension("bot_reason");
 */
export const botReasonDimension = defineDimension({
  name: "bot_reason",
  label: "Bot reason",
  join: null,
  expression: () => sql.raw("unnest(e.bot_reasons)"),
  matches: (value) => sql`${value} = ANY(e.bot_reasons)`,
});
