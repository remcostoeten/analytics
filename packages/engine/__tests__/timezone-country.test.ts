import { describe, expect, test } from "bun:test";

import { countryFromTimezone } from "../src/utilities/timezone-country";

describe("countryFromTimezone", () => {
  test.each([
    ["Europe/Amsterdam", "NL"],
    ["America/Los_Angeles", "US"],
    ["Australia/Perth", "AU"],
    ["Antarctica/Troll", null],
    [null, null],
    [undefined, null],
  ])("%s", (timezone, expected) => {
    expect(countryFromTimezone(timezone)).toBe(expected);
  });
});
