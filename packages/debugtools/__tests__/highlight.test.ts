import { describe, expect, test } from "bun:test";

import { highlightLine, parseEmphasis } from "../src/highlight";

const keywords = new Set(["where", "by"]);

describe("highlightLine", () => {
  test("colours keywords, strings and operators", () => {
    expect(highlightLine("| where ['type'] == \"error\"", keywords)).toEqual([
      { kind: "operator", text: "|" },
      { kind: "plain", text: " " },
      { kind: "keyword", text: "where" },
      { kind: "plain", text: " [" },
      { kind: "string", text: "'type'" },
      { kind: "plain", text: "] " },
      { kind: "operator", text: "==" },
      { kind: "plain", text: " " },
      { kind: "string", text: '"error"' },
    ]);
  });

  test("treats a string without its closing quote as a string", () => {
    expect(highlightLine("['eve", keywords)).toEqual([
      { kind: "plain", text: "[" },
      { kind: "string", text: "'eve" },
    ]);
  });

  test("keeps numbers with units together", () => {
    expect(highlightLine("bin(_time, 5m)", keywords)).toContainEqual({
      kind: "number",
      text: "5m",
    });
  });

  test("matches keywords case-insensitively", () => {
    expect(highlightLine("WHERE", keywords)).toEqual([{ kind: "keyword", text: "WHERE" }]);
  });
});

describe("parseEmphasis", () => {
  test("splits strong runs", () => {
    expect(parseEmphasis("from **0.4%** to **6.1%**")).toEqual([
      { text: "from ", strong: false },
      { text: "0.4%", strong: true },
      { text: " to ", strong: false },
      { text: "6.1%", strong: true },
    ]);
  });
});
