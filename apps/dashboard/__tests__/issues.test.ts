import { describe, expect, test } from "bun:test";

import { formatDateTime, formatRelative, formatTime } from "../src/modules/analytics/format";
import { frameLocation, nextStatuses, splitTitle } from "../src/modules/analytics/issues";

describe("issues", () => {
  test("offers the other statuses", () => {
    expect(nextStatuses("open").map((action) => action.label)).toEqual(["Resolve", "Ignore"]);
    expect(nextStatuses("resolved").map((action) => action.status)).toEqual(["ignored", "open"]);
  });

  test("locates stack frames", () => {
    expect(
      frameLocation({ file: "app.js", line: 12, column: 3405, function: "PostCard", inApp: true }),
    ).toBe("app.js:12:3405");
    expect(
      frameLocation({ file: "app.js", line: null, column: 5, function: null, inApp: false }),
    ).toBe("app.js");
  });

  test("splits titles", () => {
    expect(splitTitle("TypeError: x is undefined")).toEqual({
      type: "TypeError",
      message: "x is undefined",
    });
    expect(splitTitle("RangeError")).toEqual({ type: "RangeError", message: "" });
  });
});

describe("time formats", () => {
  const now = Date.parse("2026-09-27T18:00:00Z");

  test("formats relative times", () => {
    expect(formatRelative("2026-09-27T17:59:30Z", now)).toBe("just now");
    expect(formatRelative("2026-09-27T16:31:44Z", now)).toBe("1h ago");
    expect(formatRelative("2026-09-23T16:31:44Z", now)).toBe("4d ago");
    expect(formatRelative("2026-06-23T16:31:44Z", now)).toBe("3mo ago");
  });

  test("formats dates and times in UTC", () => {
    expect(formatDateTime("2026-09-27T16:31:44Z")).toBe("27 Sept 2026, 16:31");
    expect(formatTime("2026-09-27T16:31:44Z")).toBe("16:31:44");
  });
});
