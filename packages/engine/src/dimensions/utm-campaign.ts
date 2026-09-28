import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name utmCampaignDimension
 * @description The `utm_campaign` tag.
 *
 * @example
 * findDimension("utm_campaign");
 */
export const utmCampaignDimension = defineDimension({
  name: "utm_campaign",
  label: "UTM campaign",
  join: null,
  expression: () => sql.raw(`e.meta->>'utmCampaign'`),
});
