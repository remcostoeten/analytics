import { describe, expect, test } from "bun:test";

import {
  countryName,
  formatChange,
  formatCount,
  formatDuration,
  formatPercent,
} from "../src/format";

describe("format", () => {
  test("counts stay whole under ten thousand and compact above", () => {
    expect(formatCount(9_999)).toBe("9,999");
    expect(formatCount(12_345)).toBe("12.3K");
    expect(formatCount(1_200_000)).toBe("1.2M");
  });

  test("percent rounds a share", () => {
    expect(formatPercent(0.412)).toBe("41%");
    expect(formatPercent(0)).toBe("0%");
  });

  test("duration switches to minutes at sixty seconds", () => {
    expect(formatDuration(42_000)).toBe("42s");
    expect(formatDuration(95_000)).toBe("1m 35s");
  });

  test("change is signed and null is new", () => {
    expect(formatChange(0.191)).toBe("+19%");
    expect(formatChange(-0.05)).toBe("-5%");
    expect(formatChange(0)).toBe("0%");
    expect(formatChange(null)).toBe("new");
  });

  test("country names fall back to the code", () => {
    expect(countryName("NL")).toBe("Netherlands");
    expect(countryName("1")).toBe("1");
  });
});
