import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name channelDimension
 * @description The acquisition channel: direct, search, social, email, paid, referral.
 *
 * @example
 * findDimension("channel");
 */
export const channelDimension = defineDimension({
  name: "channel",
  label: "Channel",
  join: null,
  expression: () => sql.raw(`e.channel`),
});
