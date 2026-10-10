const dateFormat = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * @name isoWeek
 * @description Returns the ISO 8601 week number and week-numbering year of a calendar date.
 *
 * @example
 * isoWeek("2026-10-03"); // { week: 40, year: 2026 }
 */
export function isoWeek(date: string) {
  const day = new Date(`${date}T00:00:00Z`);
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const year = day.getUTCFullYear();
  const firstDay = Date.UTC(year, 0, 1);
  const week = Math.ceil(((day.getTime() - firstDay) / 86_400_000 + 1) / 7);
  return { week, year };
}

/**
 * @name formatPostDate
 * @description Formats a post's calendar date with its ISO week, the way the changelog shows it.
 *
 * @example
 * formatPostDate("2026-10-03"); // { date: "October 3, 2026", week: "week 40 · 2026" }
 */
export function formatPostDate(date: string) {
  const { week, year } = isoWeek(date);
  return {
    date: dateFormat.format(new Date(`${date}T00:00:00Z`)),
    week: `week ${week} · ${year}`,
  };
}
