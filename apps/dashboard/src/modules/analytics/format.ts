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

/**
 * @name formatDuration
 * @description Milliseconds as seconds, minutes and seconds, or hours and minutes.
 *
 * @example
 * formatDuration(71_000); // "1m 11s"
 */
export function formatDuration(ms: number) {
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

const relative = new Intl.RelativeTimeFormat("en", { numeric: "always", style: "narrow" });

const units = [
  { ms: 31_536_000_000, unit: "year" },
  { ms: 2_592_000_000, unit: "month" },
  { ms: 86_400_000, unit: "day" },
  { ms: 3_600_000, unit: "hour" },
  { ms: 60_000, unit: "minute" },
] as const satisfies readonly { ms: number; unit: Intl.RelativeTimeFormatUnit }[];

/**
 * @name formatRelative
 * @description A timestamp as time since `now`, in the largest unit that fits: "3m ago",
 * "2h ago", "4d ago"; under a minute reads "just now".
 *
 * @example
 * formatRelative("2026-09-27T16:31:44Z", Date.parse("2026-09-27T18:00:00Z")); // "1h ago"
 */
export function formatRelative(timestamp: string, now = Date.now()) {
  const elapsed = now - Date.parse(timestamp);
  if (elapsed < 60_000) return "just now";
  const unit = units.find((entry) => elapsed >= entry.ms) ?? units[units.length - 1];
  return relative.format(-Math.floor(elapsed / unit.ms), unit.unit);
}

/**
 * @name formatDateTime
 * @description A timestamp as a short UTC date and time, such as "27 Sep 2026, 16:31".
 *
 * @example
 * formatDateTime("2026-09-27T16:31:44Z"); // "27 Sep 2026, 16:31"
 */
export function formatDateTime(timestamp: string) {
  const date = new Date(timestamp);
  const day = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  });
  return `${day}, ${time}`;
}

/**
 * @name formatTime
 * @description The time of day of a timestamp in UTC with seconds, such as "16:31:44".
 *
 * @example
 * formatTime("2026-09-27T16:31:44Z"); // "16:31:44"
 */
export function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  });
}
