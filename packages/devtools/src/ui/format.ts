import type { Milliseconds, Nullable, Timestamp } from "@spoar/shared/semantic";

export type Tone = "ok" | "warn" | "bad" | "info" | "none";

export type Vital = "lcp" | "inp" | "cls" | "ttfb";

const thresholds: { [Key in Vital]: [good: number, poor: number] } = {
  lcp: [2500, 4000],
  inp: [200, 500],
  cls: [0.1, 0.25],
  ttfb: [800, 1800],
};

function pad(value: number, size = 2) {
  return String(value).padStart(size, "0");
}

/**
 * @name clock
 * @description Formats a timestamp as local `HH:MM:SS`, with milliseconds when `precise`.
 *
 * @example
 * clock("2026-10-03T12:02:11.204Z", true); // "14:02:11.204" in Amsterdam
 */
export function clock(at: Timestamp, precise = false): string {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return "--:--:--";
  const base = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return precise ? `${base}.${pad(date.getMilliseconds(), 3)}` : base;
}

/**
 * @name duration
 * @description Formats a duration as `4m 02s`, or `42s` under a minute.
 *
 * @example
 * duration(242_000); // "4m 02s"
 */
export function duration(ms: Milliseconds): string {
  const seconds = Math.round(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return minutes > 0 ? `${minutes}m ${rest}s` : `${seconds}s`;
}

/**
 * @name vitalText
 * @description Formats a web vital: seconds for LCP and TTFB above a second, milliseconds for
 * INP and short times, two decimals for CLS, and `n/a` when there is no value.
 *
 * @example
 * vitalText("lcp", 1380); // "1.4s"
 */
export function vitalText(vital: Vital, value: Nullable<number>): string {
  if (value === null) return "n/a";
  if (vital === "cls") return value.toFixed(2);
  if (vital !== "inp" && value >= 1000) return `${(value / 1000).toFixed(1)}s`;
  return `${Math.round(value)}ms`;
}

/**
 * @name vitalTone
 * @description Rates a web vital against the Core Web Vitals thresholds.
 *
 * @example
 * vitalTone("inp", 260); // "warn"
 */
export function vitalTone(vital: Vital, value: Nullable<number>): Tone {
  if (value === null) return "none";
  const [good, poor] = thresholds[vital];
  if (value <= good) return "ok";
  return value <= poor ? "warn" : "bad";
}

/**
 * @name vitalShare
 * @description The width of a vital's bar: its value as a share of the poor threshold,
 * capped at 1.
 *
 * @example
 * vitalShare("lcp", 2000); // 0.5
 */
export function vitalShare(vital: Vital, value: Nullable<number>): number {
  if (value === null) return 0;
  return Math.min(1, value / thresholds[vital][1]);
}

/**
 * @name botTone
 * @description Colors a bot score: under 0.3 is fine, under 0.5 suspect, above that a bot.
 *
 * @example
 * botTone(0.41); // "warn"
 */
export function botTone(score: number): Tone {
  if (score < 0.3) return "ok";
  return score < 0.5 ? "warn" : "bad";
}

/**
 * @name shortId
 * @description Shortens a long id for a narrow column, keeping both ends.
 *
 * @example
 * shortId("v_8f2a1c3e9c1e"); // "v_8f2a1c…9c1e"
 */
export function shortId(id: string): string {
  return id.length > 14 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

/**
 * @name percent
 * @description Formats a ratio as a percentage with up to one decimal.
 *
 * @example
 * percent(0.996); // "99.6%"
 */
export function percent(ratio: number): string {
  const value = Math.round(ratio * 1000) / 10;
  return `${value}%`;
}

/**
 * @name count
 * @description Formats a count with thousands separators.
 *
 * @example
 * count(1284); // "1,284"
 */
export function count(value: number): string {
  return value.toLocaleString("en-US");
}
