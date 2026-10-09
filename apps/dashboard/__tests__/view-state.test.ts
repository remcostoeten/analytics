import { describe, expect, test } from "bun:test";

import { formatChange, formatDimensionValue, formatMetric } from "../src/modules/analytics/format";
import { metricView } from "../src/modules/analytics/metrics";
import { readViewState, viewQuery, withFilter } from "../src/modules/analytics/view-state";
import type { ViewState } from "../src/modules/analytics/view-state";

const defaults: ViewState = {
  period: "7d",
  bots: false,
  split: null,
  filters: {},
  percentile: 75,
  status: "open",
};

describe("readViewState", () => {
  test("falls back to the defaults", () => {
    expect(readViewState({})).toEqual(defaults);
  });

  test("reads period, bots, split and filters", () => {
    expect(
      readViewState({
        period: "30d",
        bots: "include",
        split: "country",
        country: "!NL",
        page: "/",
      }),
    ).toEqual({
      ...defaults,
      period: "30d",
      bots: true,
      split: "country",
      filters: { country: "!NL", page: "/" },
    });
  });

  test("reads the speed and issue parameters", () => {
    expect(readViewState({ percentile: "95", status: "resolved", route: "/blog" })).toEqual({
      ...defaults,
      percentile: 95,
      status: "resolved",
      filters: { route: "/blog" },
    });
  });

  test("ignores unknown values and bare negations", () => {
    expect(
      readViewState({
        period: "5y",
        split: "visitor",
        country: "!",
        event: "signup",
        percentile: "80",
        status: "muted",
      }),
    ).toEqual(defaults);
  });

  test("takes the first of repeated parameters", () => {
    expect(readViewState({ period: ["24h", "30d"] }).period).toBe("24h");
  });
});

describe("viewQuery", () => {
  test("leaves defaults out", () => {
    expect(viewQuery(readViewState({}))).toBe("");
  });

  test("round-trips through readViewState", () => {
    const state = readViewState({
      period: "90d",
      bots: "include",
      host: "a.nl",
      page: "/x y",
      percentile: "50",
      status: "ignored",
    });
    const query = Object.fromEntries(new URLSearchParams(viewQuery(state)));
    expect(readViewState(query)).toEqual(state);
  });
});

describe("withFilter", () => {
  test("sets and clears one dimension", () => {
    const state = readViewState({ country: "NL" });
    expect(withFilter(state, "page", "/").filters).toEqual({ country: "NL", page: "/" });
    expect(withFilter(state, "country", null).filters).toEqual({});
  });
});

describe("format", () => {
  test("formats each metric kind", () => {
    expect(formatMetric(1234, "count")).toBe("1,234");
    expect(formatMetric(12_345, "count", true)).toBe("12.3K");
    expect(formatMetric(0.462, "percent")).toBe("46.2%");
    expect(formatMetric(71_000, "duration")).toBe("1m 11s");
    expect(formatMetric(4_000, "duration")).toBe("4s");
    expect(formatMetric(320, "millis")).toBe("320 ms");
    expect(formatMetric(2_410, "millis")).toBe("2.41 s");
    expect(formatMetric(12_400, "millis")).toBe("12.4 s");
    expect(formatMetric(0.1234, "shift")).toBe("0.12");
  });

  test("formats changes", () => {
    expect(formatChange(1.5)).toBe("150%");
    expect(formatChange(-0.061)).toBe("6.1%");
    expect(formatChange(null)).toBeNull();
  });

  test("names countries and empty values", () => {
    expect(formatDimensionValue("country", "NL")).toBe("Netherlands");
    expect(formatDimensionValue("referrer_domain", "")).toBe("None (direct)");
    expect(formatDimensionValue("browser", "")).toBe("Unknown");
  });

  test("resolves metric slugs", () => {
    expect(metricView("bounce-rate").series).toBe("bounce_rate");
    expect(metricView("nope").slug).toBe("visitors");
  });
});
