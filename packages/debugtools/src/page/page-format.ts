import type { VitalRating } from "@spoar/contract";
import type { Milliseconds, Nullable } from "@spoar/shared/semantic";

import type { VitalName } from "./page-reads";

const empty = "–";

/**
 * @name formatCount
 * @description A count with thousands separators, as the page tab shows visitors and clicks.
 *
 * @example
 * formatCount(12840); // "12,840"
 */
export function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

/**
 * @name formatShare
 * @description A share from 0 to 1 as a whole percentage, or a dash when there is none.
 *
 * @example
 * formatShare(0.412); // "41%"
 */
export function formatShare(value: Nullable<number>): string {
  return value === null ? empty : `${Math.round(value * 100)}%`;
}

/**
 * @name formatDuration
 * @description A duration as seconds under a minute and minutes with seconds above, or a dash.
 *
 * @example
 * formatDuration(72_000); // "1m 12s"
 */
export function formatDuration(value: Nullable<Milliseconds>): string {
  if (value === null) return empty;
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

/**
 * @name formatVital
 * @description A Web Vital value in its unit: CLS unitless to two decimals, the others in
 * milliseconds below a second and seconds above. A dash under the API's sample minimum.
 *
 * @example
 * formatVital("lcp", 2710); // "2.71 s"
 */
export function formatVital(name: VitalName, value: Nullable<number>): string {
  if (value === null) return empty;
  if (name === "cls") return value.toFixed(2);
  return value < 1000 ? `${Math.round(value)} ms` : `${(value / 1000).toFixed(2)} s`;
}

/**
 * @name ratingClass
 * @description The text colour for a Web Vitals rating in the console palette.
 *
 * @example
 * ratingClass("poor"); // "text-console-accent"
 */
export function ratingClass(rating: Nullable<VitalRating>): string {
  if (rating === "poor") return "text-console-accent";
  if (rating === "needs-improvement") return "text-console-number";
  if (rating === "good") return "text-console-fg";
  return "text-console-faint";
}
