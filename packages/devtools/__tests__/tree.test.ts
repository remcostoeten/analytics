import { describe, expect, test } from "bun:test";

import { buildLines, linkFor, toggleNode } from "../src/json/tree";

const resolve = linkFor(new Set(["v_1"]), new Set(["s_1"]));

const value = {
  code: "RA_INGEST_REJECTED",
  visitor: "v_1",
  signals: { headless: true, asn: null },
  list: [1, "s_1"],
  empty: {},
};

describe("buildLines", () => {
  test("flattens a value into lines with depth, tone and commas", () => {
    const lines = buildLines(value, new Set(), resolve);
    expect(lines.map((line) => [line.depth, line.key, line.text, line.tone, line.comma])).toEqual([
      [0, null, "{", "punct", false],
      [1, "code", '"RA_INGEST_REJECTED"', "string", true],
      [1, "visitor", '"v_1"', "string", true],
      [1, "signals", "{", "punct", false],
      [2, "headless", "true", "boolean", true],
      [2, "asn", "null", "null", false],
      [1, null, "}", "punct", true],
      [1, "list", "[", "punct", false],
      [2, null, "1", "number", true],
      [2, null, '"s_1"', "string", false],
      [1, null, "]", "punct", true],
      [1, "empty", "{}", "punct", false],
      [0, null, "}", "punct", false],
    ]);
  });

  test("links known ids and RA_ codes", () => {
    const links = buildLines(value, new Set(), resolve)
      .map((line) => line.link)
      .filter((link) => link !== null);
    expect(links).toEqual([
      { type: "code", target: "RA_INGEST_REJECTED" },
      { type: "visitor", target: "v_1" },
      { type: "session", target: "s_1" },
    ]);
  });

  test("a collapsed node becomes one line with its size", () => {
    const lines = buildLines(value, new Set(["$.signals"]), resolve);
    const signals = lines.find((line) => line.key === "signals");
    expect(signals?.text).toBe("{ 2 }");
    expect(signals?.toggle).toEqual({ collapsed: true, size: 2 });
    expect(signals?.comma).toBe(true);
    expect(lines.some((line) => line.key === "headless")).toBe(false);
  });

  test("scalars render alone", () => {
    expect(buildLines("plain", new Set(), resolve).map((line) => line.text)).toEqual(['"plain"']);
  });
});

describe("toggleNode", () => {
  test("adds and removes a path without changing the input", () => {
    const start = new Set<string>();
    const collapsed = toggleNode(start, "$.a");
    expect([...collapsed]).toEqual(["$.a"]);
    expect([...toggleNode(collapsed, "$.a")]).toEqual([]);
    expect(start.size).toBe(0);
  });
});
