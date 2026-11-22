import { describe, expect, test } from "bun:test";

import { returnPath } from "../src/modules/session/return-path";

describe("returnPath", () => {
  test("keeps a path inside the dashboard", () => {
    expect(returnPath("/admin/tokens")).toBe("/admin/tokens");
    expect(returnPath("/admin/projects/example.com")).toBe("/admin/projects/example.com");
  });

  test("drops anything that could leave the dashboard", () => {
    expect(returnPath("https://example.com")).toBe("");
    expect(returnPath("//example.com")).toBe("");
    expect(returnPath("/\\example.com")).toBe("");
    expect(returnPath("admin")).toBe("");
    expect(returnPath(undefined)).toBe("");
    expect(returnPath(["/a", "/b"])).toBe("");
  });
});
