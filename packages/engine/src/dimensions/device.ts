import { sql } from "drizzle-orm";

import { defineDimension } from "../define";

/**
 * @name deviceDimension
 * @description The device class: desktop, mobile, tablet or bot.
 *
 * @example
 * findDimension("device");
 */
export const deviceDimension = defineDimension({
  name: "device",
  label: "Device",
  join: null,
  expression: () => sql.raw(`e.device_type`),
});
