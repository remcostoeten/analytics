import { describe, expect, test } from "bun:test";

import { expiresAtOf, formatDay, projectIdsOf } from "../src/modules/admin/token-form";

describe("projectIdsOf", () => {
  test("lists ids or means every project", () => {
    expect(projectIdsOf("docs\n skriuw \n")).toEqual(["docs", "skriuw"]);
    expect(projectIdsOf("  ")).toBeNull();
  });
});

describe("expiresAtOf", () => {
  test("ends the day in UTC or never expires", () => {
    expect(expiresAtOf("2026-12-31")).toBe("2026-12-31T23:59:59.000Z");
    expect(expiresAtOf("")).toBeNull();
    expect(expiresAtOf("not a date")).toBeNull();
  });
});

describe("formatDay", () => {
  test("shows the day or a dash", () => {
    expect(formatDay("2026-10-08T12:00:00.000Z")).toBe("2026-10-08");
    expect(formatDay(null)).toBe("–");
  });
});
