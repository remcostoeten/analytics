import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name hostDimension
 * @description The host the event was sent from, such as `docs.remcostoeten.nl`.
 *
 * @example
 * findDimension("host");
 */
export const hostDimension = defineDimension({
  name: "host",
  label: "Host",
  join: null,
  expression: () => sql.raw(`e.host`),
});
