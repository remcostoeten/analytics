const whole = new Intl.NumberFormat("en");
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

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
 * @name countryName
 * @description Turns an ISO 3166-1 alpha-2 code into the English country name, or returns the
 * code when the runtime does not know it.
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

/**
 * @name formatVital
 * @description Formats a Web Vital the way the dashboard shows it: CLS to two decimals, times
 * under a second in whole milliseconds and longer ones in seconds to one decimal.
 *
 * @example
 * formatVital("lcp", 1934); // "1.9 s"
 */
export function formatVital(metric: string, value: number) {
  if (metric === "cls") return value.toFixed(2);
  return value < 1000 ? `${Math.round(value)} ms` : `${(value / 1000).toFixed(1)} s`;
}
