import { describe, expect, test } from "bun:test";

import { formatPostDate, isoWeek } from "./changelog-date";

describe("isoWeek", () => {
  test("numbers weeks from the week holding the first Thursday", () => {
    expect(isoWeek("2026-09-23")).toEqual({ week: 39, year: 2026 });
    expect(isoWeek("2026-10-03")).toEqual({ week: 40, year: 2026 });
    expect(isoWeek("2026-10-05")).toEqual({ week: 41, year: 2026 });
  });

  test("gives early January days to the previous year when that week started there", () => {
    expect(isoWeek("2027-01-01")).toEqual({ week: 53, year: 2026 });
    expect(isoWeek("2025-12-29")).toEqual({ week: 1, year: 2026 });
  });
});

describe("formatPostDate", () => {
  test("formats the date in UTC with its week", () => {
    expect(formatPostDate("2026-10-03")).toEqual({
      date: "October 3, 2026",
      week: "week 40 · 2026",
    });
  });
});
