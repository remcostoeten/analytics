import { describe, expect, test } from "bun:test";

import type { Fields } from "../src/filter/parse";
import { applyFilter, parseAmount, parseFilter, toggleToken } from "../src/filter/parse";

type Row = { level: string; bot: number; path: string; message: string };

const fields: Fields<Row> = {
  level: (row) => row.level,
  bot: (row) => row.bot,
  path: (row) => row.path,
};

const rows: Row[] = [
  { level: "error", bot: 0.92, path: "/cars/kia", message: "Rejected batch" },
  { level: "info", bot: 0.04, path: "/blog", message: "Batch accepted" },
  { level: "warn", bot: 0.41, path: "/cars", message: "Retry after 429" },
];

function text(row: Row) {
  return row.message;
}

describe("parseFilter", () => {
  test("splits tokens, comparisons, negation, the path and free words", () => {
    expect(parseFilter("level:error -kind:ingest bot:>0.5 lcp:<=2.5s /cars Timeout")).toEqual({
      tokens: [
        { key: "level", operator: "=", value: "error", negate: false },
        { key: "kind", operator: "=", value: "ingest", negate: true },
        { key: "bot", operator: ">", value: "0.5", negate: false },
        { key: "lcp", operator: "<=", value: "2.5s", negate: false },
      ],
      words: ["timeout"],
      path: "/cars",
    });
  });

  test("an empty prompt has nothing", () => {
    expect(parseFilter("   ")).toEqual({ tokens: [], words: [], path: null });
  });

  test("an RA_ code without a colon stays free text", () => {
    expect(parseFilter("RA_").words).toEqual(["ra_"]);
  });
});

describe("parseAmount", () => {
  test("reads units", () => {
    expect(parseAmount("2.5s")).toBe(2500);
    expect(parseAmount("180ms")).toBe(180);
    expect(parseAmount("41%")).toBe(0.41);
    expect(parseAmount("0.5")).toBe(0.5);
    expect(parseAmount("fast")).toBeNull();
  });
});

describe("applyFilter", () => {
  test("matches tokens case-insensitively", () => {
    expect(applyFilter(rows, "level:ERROR", fields, text)).toEqual([rows[0]]);
  });

  test("compares numbers", () => {
    expect(applyFilter(rows, "bot:>0.4", fields, text).map((row) => row.level)).toEqual([
      "error",
      "warn",
    ]);
  });

  test("negates", () => {
    expect(applyFilter(rows, "-level:info", fields, text)).toHaveLength(2);
  });

  test("filters on the path and free words", () => {
    expect(applyFilter(rows, "/cars batch", fields, text)).toEqual([rows[0]]);
  });

  test("an unknown key matches nothing", () => {
    expect(applyFilter(rows, "geo:NL", fields, text)).toEqual([]);
  });

  test("an empty prompt keeps every row", () => {
    expect(applyFilter(rows, "", fields, text)).toBe(rows);
  });
});

describe("toggleToken", () => {
  test("adds and removes a token", () => {
    expect(toggleToken("level:error", "kind", "ingest")).toBe("level:error kind:ingest");
    expect(toggleToken("level:error kind:ingest", "kind", "ingest")).toBe("level:error");
  });
});
