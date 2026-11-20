import { expect, test } from "bun:test";

import { pageFocused } from "../src/shared/query/focus";

test("polls only while the page is visible and the window has focus", () => {
  expect(pageFocused("visible", true)).toBe(true);
  expect(pageFocused("visible", false)).toBe(false);
  expect(pageFocused("hidden", true)).toBe(false);
  expect(pageFocused("hidden", false)).toBe(false);
});
