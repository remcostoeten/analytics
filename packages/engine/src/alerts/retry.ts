import type { Nullable } from "@spoar/shared/semantic";

import type { DurationUnit, RetryPolicy } from "./types";

const minuteMs = 60_000;
const unitMs: { [Unit in DurationUnit]: number } = {
  s: 1000,
  m: minuteMs,
  h: 60 * minuteMs,
  d: 24 * 60 * minuteMs,
};
const exponentialMinutes = [1, 5, 30, 120, 720];
const fixedMinutes = 10;
// A whole or decimal number followed by one unit letter, such as 30m or 1.5h.
const durationPattern = /^(\d+(?:\.\d+)?)([smhd])$/;

export const defaultRetry: RetryPolicy = { attempts: 5, backoff: "exponential", maxAge: "24h" };

function isUnit(value: string): value is DurationUnit {
  return value in unitMs;
}

/**
 * @name durationMs
 * @description A `Duration` such as `"30m"`, `"6h"` or `"2d"` in milliseconds, or null when the
 * text is not one.
 *
 * @example
 * durationMs("6h"); // 21600000
 */
export function durationMs(duration: string): Nullable<number> {
  const match = durationPattern.exec(duration);
  const unit = match?.[2];
  if (!match?.[1] || !unit || !isUnit(unit)) return null;
  return Number(match[1]) * unitMs[unit];
}

/**
 * @name mergeRetry
 * @description A channel's retry settings over the plugin's, key by key, over the defaults of 5
 * attempts, exponential backoff and 24 hours.
 *
 * @example
 * mergeRetry({ maxAge: "6h" }, { maxAge: "1h" }); // { attempts: 5, backoff: "exponential", maxAge: "1h" }
 */
export function mergeRetry(
  plugin: Partial<RetryPolicy>,
  channel: Partial<RetryPolicy>,
): RetryPolicy {
  return { ...defaultRetry, ...plugin, ...channel };
}

/**
 * @name nextAttempt
 * @description When a delivery that has failed `attempts` times is tried again: after 1, 5, 30,
 * 120 and 720 minutes with exponential backoff, or 10 minutes with fixed. Null when the policy
 * ran out: more failures than `policy.attempts`, or the next try would fall past `maxAge` from
 * `createdAt`.
 *
 * @example
 * nextAttempt(defaultRetry, 1, createdAt, now); // now plus 1 minute
 */
export function nextAttempt(
  policy: RetryPolicy,
  attempts: number,
  createdAt: Date,
  now: Date,
): Nullable<Date> {
  if (attempts > policy.attempts) return null;
  const minutes =
    policy.backoff === "fixed"
      ? fixedMinutes
      : (exponentialMinutes[Math.min(attempts, exponentialMinutes.length) - 1] ?? fixedMinutes);
  const next = new Date(now.getTime() + minutes * minuteMs);
  const maxAge = durationMs(policy.maxAge);
  if (maxAge === null || next.getTime() > createdAt.getTime() + maxAge) return null;
  return next;
}
