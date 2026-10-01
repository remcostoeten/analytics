const dayMs = 86_400_000;

/**
 * @name rawVitalDays
 * @description How many days raw `web_vitals` rows are kept. The rollup job drops older rows, and
 * speed reads take days before the raw window from `rollup_vitals`.
 *
 * @example
 * const keepAfter = new Date(now.getTime() - rawVitalDays * 86_400_000);
 */
export const rawVitalDays = 30;

/**
 * @name rawVitalsFrom
 * @description The first UTC midnight from which every raw `web_vitals` row is still stored: the
 * day after the one `rawVitalDays` ago. Speed reads use raw rows from here on and the daily rollup
 * before it.
 *
 * @example
 * rawVitalsFrom(new Date("2026-09-27T16:40:00Z")); // 2026-08-29T00:00:00.000Z
 */
export function rawVitalsFrom(now: Date): Date {
  const cut = new Date(now.getTime() - rawVitalDays * dayMs);
  return new Date(Date.UTC(cut.getUTCFullYear(), cut.getUTCMonth(), cut.getUTCDate()) + dayMs);
}
