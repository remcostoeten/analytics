import { describe, expect, test } from "bun:test";
import type { VisitorRow } from "@spoar/contract";

import {
  activityBucket,
  countryFlag,
  groupVisitors,
  visitorHue,
} from "../src/modules/analytics/visitor-presentation";

const now = Date.parse("2026-10-25T09:30:00Z");

function row(id: string, lastSeen: string): VisitorRow {
  return {
    id,
    firstSeen: lastSeen,
    lastSeen,
    sessions: 1,
    pageviews: 1,
    country: "NL",
    device: "desktop",
    browser: "Chrome",
    isInternal: false,
    identified: false,
  };
}

describe("countryFlag", () => {
  test("builds the flag from regional indicators", () => {
    expect(countryFlag("NL")).toBe("🇳🇱");
    expect(countryFlag("US")).toBe("🇺🇸");
  });

  test("is empty for missing or malformed codes", () => {
    expect(countryFlag(null)).toBe("");
    expect(countryFlag("nl")).toBe("");
    expect(countryFlag("NLD")).toBe("");
  });
});

describe("visitorHue", () => {
  test("is stable and within the colour wheel", () => {
    expect(visitorHue("01a16fb6")).toBe(visitorHue("01a16fb6"));
    expect(visitorHue("01a16fb6")).not.toBe(visitorHue("01a16756"));
    expect(visitorHue("anything")).toBeLessThan(360);
  });
});

describe("activityBucket", () => {
  test("buckets by recency against now", () => {
    expect(activityBucket("2026-10-25T09:00:00Z", now)).toBe("now");
    expect(activityBucket("2026-10-25T01:00:00Z", now)).toBe("today");
    expect(activityBucket("2026-10-24T23:00:00Z", now)).toBe("yesterday");
    expect(activityBucket("2026-10-20T09:00:00Z", now)).toBe("week");
    expect(activityBucket("2026-10-10T09:00:00Z", now)).toBe("earlier");
  });
});

describe("groupVisitors", () => {
  test("keeps row order and merges consecutive rows of one bucket", () => {
    const groups = groupVisitors(
      [
        row("a", "2026-10-25T09:10:00Z"),
        row("b", "2026-10-25T02:00:00Z"),
        row("c", "2026-10-25T01:00:00Z"),
        row("d", "2026-10-19T01:00:00Z"),
      ],
      now,
    );
    expect(groups.map((group) => [group.label, group.rows.map((entry) => entry.id)])).toEqual([
      ["Active in the last hour", ["a"]],
      ["Today", ["b", "c"]],
      ["Earlier this week", ["d"]],
    ]);
  });

  test("is empty for no rows", () => {
    expect(groupVisitors([], now)).toEqual([]);
  });
});
