import type { Nullable } from "@spoar/shared/semantic";

import { lines } from "./form";

/**
 * @name projectIdsOf
 * @description The project list of a token from a textarea: one id per line, or null for every
 * project when the textarea is empty.
 *
 * @example
 * projectIdsOf("docs\nskriuw"); // ["docs", "skriuw"]
 * projectIdsOf("  "); // null
 */
export function projectIdsOf(value: string): Nullable<string[]> {
  const ids = lines(value);
  return ids.length === 0 ? null : ids;
}

/**
 * @name expiresAtOf
 * @description The expiry of a token from a date input, as the end of that day in UTC, or null
 * for no expiry when the input is empty.
 *
 * @example
 * expiresAtOf("2026-12-31"); // "2026-12-31T23:59:59.000Z"
 */
export function expiresAtOf(value: string): Nullable<string> {
  if (value.trim().length === 0) return null;
  const end = new Date(`${value.trim()}T23:59:59.000Z`);
  return Number.isNaN(end.getTime()) ? null : end.toISOString();
}

/**
 * @name formatDay
 * @description A timestamp as its UTC day, or a dash for null.
 *
 * @example
 * formatDay("2026-10-08T12:00:00.000Z"); // "2026-10-08"
 */
export function formatDay(value: Nullable<string>) {
  return value === null ? "–" : value.slice(0, 10);
}
