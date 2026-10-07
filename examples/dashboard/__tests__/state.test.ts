import { describe, expect, test } from "bun:test";

import { defaultState, fromHash, toHash, withFilter, withoutFilter } from "../src/state";

describe("hash state", () => {
  test("round-trips period, traffic and filters", () => {
    const state = withFilter(
      { period: "30d", traffic: "all", filters: {} },
      "page",
      "/blog/[slug]",
    );
    expect(fromHash(`#${toHash(state)}`)).toEqual(state);
  });

  test("leaves human traffic out of the hash", () => {
    expect(toHash(defaultState)).toBe("period=7d");
  });

  test("falls back to the defaults for unknown values", () => {
    expect(fromHash("#period=2y&traffic=bots&filter[not a dimension]=x")).toEqual(defaultState);
  });

  test("reads an empty hash as the defaults", () => {
    expect(fromHash("")).toEqual(defaultState);
  });

  test("encodes filter values the API can read back", () => {
    const hash = toHash(withFilter(defaultState, "referrer_domain", "news.ycombinator.com"));
    expect(new URLSearchParams(hash).get("filter[referrer_domain]")).toBe("news.ycombinator.com");
  });
});

describe("filters", () => {
  test("adding replaces the same dimension", () => {
    const once = withFilter(defaultState, "country", "NL");
    const twice = withFilter(once, "country", "DE");
    expect(twice.filters).toEqual({ country: "DE" });
  });

  test("removing leaves the other filters", () => {
    const state = withFilter(withFilter(defaultState, "country", "NL"), "device", "mobile");
    expect(withoutFilter(state, "country").filters).toEqual({ device: "mobile" });
  });
});
