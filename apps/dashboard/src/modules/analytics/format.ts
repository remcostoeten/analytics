import type { MetricFormat } from "./metrics";

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat("en");
const regions = new Intl.DisplayNames(["en"], { type: "region" });

/**
 * @name formatMetric
 * @description Formats a metric value for display: counts with separators (compact from 10,000
 * up when `short`), rates as percentages, durations as minutes and seconds, web vital timings
 * (`millis`) in milliseconds or seconds and layout shifts (`shift`) to two decimals.
 *
 * @example
 * formatMetric(0.462, "percent"); // "46.2%"
 * formatMetric(71000, "duration"); // "1m 11s"
 */
export function formatMetric(value: number, format: MetricFormat, short = false) {
  if (format === "percent") return `${(value * 100).toFixed(1)}%`;
  if (format === "duration") return formatDuration(value);
  if (format === "millis") return formatMillis(value);
  if (format === "shift") return value.toFixed(2);
  return short && value >= 10_000 ? compact.format(value) : whole.format(Math.round(value));
}

function formatMillis(ms: number) {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
}

function formatDuration(ms: number) {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/**
 * @name formatChange
 * @description A change ratio as a signed percentage, or null when there is nothing to compare.
 *
 * @example
 * formatChange(1.5); // "150%"
 * formatChange(-0.061); // "6.1%"
 */
export function formatChange(change: number | null) {
  if (change === null || !Number.isFinite(change)) return null;
  const percent = Math.abs(change * 100);
  return `${percent >= 100 ? Math.round(percent) : percent.toFixed(1)}%`;
}

/**
 * @name formatDimensionValue
 * @description How a breakdown value reads in a list: country codes become names and empty
 * values read as direct or unknown.
 *
 * @example
 * formatDimensionValue("country", "NL"); // "Netherlands"
 * formatDimensionValue("referrer_domain", ""); // "None (direct)"
 */
export function formatDimensionValue(dimension: string, value: string) {
  if (value === "") return dimension === "referrer_domain" ? "None (direct)" : "Unknown";
  if (dimension === "country" && /^[A-Z]{2}$/.test(value)) return regions.of(value) ?? value;
  return value;
}
