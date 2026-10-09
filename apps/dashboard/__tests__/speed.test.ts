import { describe, expect, test } from "bun:test";

import {
  rateScore,
  rateVital,
  speedDevice,
  speedFilters,
  speedInterval,
  unsupportedSpeedFilters,
  vitalView,
} from "../src/modules/analytics/speed";
import { readViewState } from "../src/modules/analytics/view-state";

describe("vitalView", () => {
  test("resolves slugs and falls back to LCP", () => {
    expect(vitalView("inp").good).toBe(200);
    expect(vitalView("cls").format).toBe("shift");
    expect(vitalView(undefined).slug).toBe("lcp");
    expect(vitalView("nope").slug).toBe("lcp");
  });
});

describe("rateVital", () => {
  test("applies the Core Web Vitals thresholds", () => {
    const lcp = vitalView("lcp");
    expect(rateVital(lcp, 2500)).toBe("good");
    expect(rateVital(lcp, 2710)).toBe("needs-improvement");
    expect(rateVital(lcp, 4001)).toBe("poor");
    expect(rateVital(vitalView("cls"), 0.1)).toBe("good");
    expect(rateVital(vitalView("cls"), 0.3)).toBe("poor");
  });

  test("bands the experience score", () => {
    expect(rateScore(90)).toBe("good");
    expect(rateScore(72)).toBe("needs-improvement");
    expect(rateScore(49)).toBe("poor");
  });
});

describe("speedFilters", () => {
  test("keeps route, path and country only", () => {
    const state = readViewState({ route: "/blog/[slug]", browser: "Firefox", country: "NL" });
    expect(speedFilters(state.filters)).toEqual({ route: "/blog/[slug]", country: "NL" });
    expect(unsupportedSpeedFilters(state)).toEqual(["browser"]);
  });

  test("maps the device filter to the speed device", () => {
    expect(speedDevice({})).toBe("all");
    expect(speedDevice({ device: "desktop" })).toBe("desktop");
    expect(speedDevice({ device: "tablet" })).toBe("mobile");
    expect(speedDevice({ device: "!mobile" })).toBe("all");
    expect(speedFilters({ device: "mobile", route: "/" })).toEqual({ route: "/" });
  });

  test("buckets the last day by hour", () => {
    expect(speedInterval("24h")).toBe("hour");
    expect(speedInterval("30d")).toBe("day");
  });
});
