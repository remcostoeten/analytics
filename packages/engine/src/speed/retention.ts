const dayMs = 86_400_000;

const rawVitalDays = 30;

/**
 * @name rawVitalsFrom
 * @description The first UTC midnight of the raw read window: the day after the one 30 days ago.
 * Speed reads use raw `web_vitals` rows from here on and the daily rollup before it. This only
 * picks the read source; raw rows are deleted only for a project with retention on.
 *
 * @example
 * rawVitalsFrom(new Date("2026-09-27T16:40:00Z")); // 2026-08-29T00:00:00.000Z
 */
export function rawVitalsFrom(now: Date): Date {
  const cut = new Date(now.getTime() - rawVitalDays * dayMs);
  return new Date(Date.UTC(cut.getUTCFullYear(), cut.getUTCMonth(), cut.getUTCDate()) + dayMs);
}
