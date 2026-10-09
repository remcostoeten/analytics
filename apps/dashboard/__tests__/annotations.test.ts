import { describe, expect, test } from "bun:test";
import type { Annotation } from "@spoar/contract";

import {
  calendarDay,
  isCalendarDate,
  placeAnnotations,
} from "../src/modules/analytics/annotations";

function annotation(id: string, date: string, endDate: string | null = null): Annotation {
  return {
    id,
    project: "site",
    title: id,
    date,
    endDate,
    kind: "release",
    note: null,
    url: null,
    createdAt: date,
    updatedAt: date,
  };
}

const buckets = ["2026-10-01T00:00:00Z", "2026-10-02T00:00:00Z", "2026-10-03T00:00:00Z"];

describe("placeAnnotations", () => {
  test("places dates between buckets and clips spans", () => {
    const placed = placeAnnotations(
      [
        annotation("b", "2026-10-02T12:00:00Z"),
        annotation("a", "2026-10-01T00:00:00Z"),
        annotation("span", "2026-10-02T00:00:00Z", "2026-10-09T00:00:00Z"),
      ],
      buckets,
    );
    expect(placed.map((entry) => entry.annotation.id)).toEqual(["a", "span", "b"]);
    expect(placed[0]?.index).toBe(0);
    expect(placed[1]).toMatchObject({ index: 1, endIndex: 2 });
    expect(placed[2]?.index).toBe(1.5);
  });

  test("leaves out annotations outside the range", () => {
    const placed = placeAnnotations(
      [annotation("before", "2026-09-20T00:00:00Z"), annotation("after", "2026-10-04T00:00:00Z")],
      buckets,
    );
    expect(placed).toEqual([]);
    expect(placeAnnotations([annotation("x", "2026-10-01T00:00:00Z")], [])).toEqual([]);
  });

  test("reads calendar dates", () => {
    expect(calendarDay("2026-10-09T14:05:00Z")).toBe("2026-10-09");
    expect(isCalendarDate("2026-10-09")).toBe(true);
    expect(isCalendarDate("")).toBe(false);
  });
});
