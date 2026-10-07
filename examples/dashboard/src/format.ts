const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat("en");

/**
 * @name formatCount
 * @description Formats a count: whole numbers under ten thousand, compact above (12.3K, 1.2M).
 *
 * @example
 * formatCount(12345); // "12.3K"
 */
export function formatCount(value: number) {
  return value < 10_000 ? whole.format(value) : compact.format(value);
}

/**
 * @name formatPercent
 * @description Formats a share from 0 to 1 as a whole percentage.
 *
 * @example
 * formatPercent(0.412); // "41%"
 */
export function formatPercent(share: number) {
  return `${Math.round(share * 100)}%`;
}

/**
 * @name formatDuration
 * @description Formats milliseconds as seconds under a minute, otherwise minutes and seconds.
 *
 * @example
 * formatDuration(95_000); // "1m 35s"
 */
export function formatDuration(ms: number) {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

/**
 * @name formatChange
 * @description Formats a change ratio as a signed percentage, or "new" when there is no previous
 * value to compare with.
 *
 * @example
 * formatChange(0.191); // "+19%"
 */
export function formatChange(change: number | null) {
  if (change === null) return "new";
  const percent = Math.round(change * 100);
  if (percent === 0) return "0%";
  return `${percent > 0 ? "+" : ""}${percent}%`;
}

/**
 * @name formatBucket
 * @description Formats a bucket start as an hour for hourly series and a short date otherwise.
 *
 * @example
 * formatBucket("2026-10-07T13:00:00.000Z", "hour"); // "13:00"
 */
export function formatBucket(iso: string, interval: string) {
  const date = new Date(iso);
  if (interval === "hour") {
    return date.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
}

/**
 * @name formatTime
 * @description Formats a timestamp as a time of day for the live stream.
 *
 * @example
 * formatTime("2026-10-07T13:04:09.000Z"); // "13:04:09"
 */
export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en", { hour12: false });
}

/**
 * @name countryName
 * @description Turns an ISO 3166-1 alpha-2 code into the English country name, or returns the
 * code when the browser does not know it.
 *
 * @example
 * countryName("NL"); // "Netherlands"
 */
export function countryName(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
