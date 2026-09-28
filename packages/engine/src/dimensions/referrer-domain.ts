import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name referrerDomainDimension
 * @description The referrer's domain, with `www.` removed.
 *
 * @example
 * findDimension("referrer_domain");
 */
export const referrerDomainDimension = defineDimension({
  name: "referrer_domain",
  label: "Referrer domain",
  join: null,
  expression: () => sql.raw(`e.referrer_domain`),
});
