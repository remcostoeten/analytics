import { expect, test } from "bun:test";

import { formatDuration, formatShare } from "./format";

test("formatShare rounds a share to a whole percentage", () => {
  expect(formatShare(0)).toBe("0%");
  expect(formatShare(0.426)).toBe("43%");
  expect(formatShare(1)).toBe("100%");
});

test("formatDuration shows seconds under a minute, then minutes and seconds", () => {
  expect(formatDuration(0)).toBe("0s");
  expect(formatDuration(45_400)).toBe("45s");
  expect(formatDuration(120_000)).toBe("2m");
  expect(formatDuration(83_000)).toBe("1m 23s");
});
