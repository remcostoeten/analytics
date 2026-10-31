import { describe, expect, test } from "bun:test";

import { homeHref, readHomeState, toggleHomeFilter } from "../src/modules/home/home-state";

describe("readHomeState", () => {
  test("falls back to visitors, every project and the total chart", () => {
    const state = readHomeState({});
    expect(state.metric.slug).toBe("visitors");
    expect(state.project).toBeNull();
    expect(state.byProject).toBe(false);
    expect(state.view.period).toBe("30d");
  });

  test("reads the metric, project and split", () => {
    const state = readHomeState({ metric: "bounce-rate", project: "skriuw", by: "project" });
    expect(state.metric.series).toBe("bounce_rate");
    expect(state.project).toBe("skriuw");
    expect(state.byProject).toBe(true);
  });
});

describe("homeHref", () => {
  test("leaves defaults out", () => {
    expect(homeHref(readHomeState({}))).toBe("/");
  });

  test("round-trips through readHomeState", () => {
    const state = readHomeState({
      period: "90d",
      country: "NL",
      metric: "pageviews",
      project: "skriuw",
      by: "project",
    });
    const query = Object.fromEntries(new URL(homeHref(state), "http://x").searchParams);
    expect(readHomeState(query)).toEqual(state);
  });
});

describe("toggleHomeFilter", () => {
  test("sets a filter and clears it on the second click", () => {
    const once = toggleHomeFilter(readHomeState({}), "country", "NL");
    expect(once.view.filters).toEqual({ country: "NL" });
    expect(toggleHomeFilter(once, "country", "NL").view.filters).toEqual({});
  });
});
