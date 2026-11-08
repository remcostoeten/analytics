import { describe, expect, test } from "bun:test";

import { eventOutcome, logPath, logTraffic, sumPoints } from "../src/modules/analytics/logs";

describe("logTraffic", () => {
  test("defaults to human traffic, which leaves out localhost", () => {
    expect(logTraffic(undefined)).toBe("human");
    expect(logTraffic("nonsense")).toBe("human");
  });

  test("reads a known traffic segment", () => {
    expect(logTraffic("bots")).toBe("bots");
    expect(logTraffic("internal")).toBe("internal");
    expect(logTraffic("all")).toBe("all");
  });
});

describe("logPath", () => {
  test("keeps human traffic at the log root", () => {
    expect(logPath("/projects/skriuw", "human")).toBe("/projects/skriuw/logs");
    expect(logPath("/projects/skriuw", "all")).toBe("/projects/skriuw/logs/all");
  });
});

describe("eventOutcome", () => {
  test("puts internal traffic before the bot score", () => {
    expect(eventOutcome({ isInternal: true, bot: { score: 90, reasons: [] } })).toBe("internal");
  });

  test("splits bots from humans at a score of 50", () => {
    expect(eventOutcome({ isInternal: false, bot: { score: 50, reasons: [] } })).toBe("bot");
    expect(eventOutcome({ isInternal: false, bot: { score: 49, reasons: [] } })).toBe("human");
  });
});

describe("sumPoints", () => {
  test("skips empty buckets", () => {
    expect(sumPoints([{ value: 3 }, { value: null }, { value: 4 }])).toBe(7);
  });
});
