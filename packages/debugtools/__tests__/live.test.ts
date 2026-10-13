import { describe, expect, test } from "bun:test";

import { datasetsFromSchema, quickQuerySql } from "../src/live/schema";
import { defaultLayout, fitLayout, readLayout, saveLayout } from "../src/panel/layout";

describe("datasetsFromSchema", () => {
  test("reduces Postgres types to the library's field kinds", () => {
    const datasets = datasetsFromSchema({
      data: [
        {
          name: "events",
          description: "One row per event",
          columns: [
            { name: "ts", type: "timestamptz", description: "" },
            { name: "bot_score", type: "smallint", description: "" },
            { name: "latitude", type: "double precision", description: "" },
            { name: "is_human", type: "boolean", description: "" },
            { name: "props", type: "jsonb", description: "" },
          ],
        },
      ],
      params: [],
    });
    expect(datasets).toEqual([
      {
        name: "events",
        fields: [
          { name: "ts", kind: "time" },
          { name: "bot_score", kind: "number" },
          { name: "latitude", kind: "number" },
          { name: "is_human", kind: "boolean" },
          { name: "props", kind: "string" },
        ],
      },
    ]);
  });
});

describe("quickQuerySql", () => {
  const events = { name: "events", fields: [{ name: "ts", kind: "time" as const }] };

  test("filters on the first time column", () => {
    expect(quickQuerySql("Latest rows", events)).toBe(
      "select *\nfrom events\nwhere ts >= :from and ts < :to\norder by ts desc\nlimit 100",
    );
    expect(quickQuerySql("Rows over time", events)).toContain("date_trunc('hour', ts)");
  });

  test("takes the first rows of a dataset without a time column", () => {
    expect(quickQuerySql("Latest rows", { name: "people", fields: [] })).toBe(
      "select *\nfrom people\nlimit 100",
    );
  });
});

describe("panel layout", () => {
  const viewport = { width: 1200, height: 800 };

  test("keeps the docked height and the floating window inside the viewport", () => {
    const fitted = fitLayout(
      {
        mode: "floating",
        dockedHeight: 5000,
        floating: { x: -50, y: 900, width: 3000, height: 100 },
      },
      viewport,
    );
    expect(fitted.dockedHeight).toBe(760);
    expect(fitted.floating).toEqual({ x: 8, y: 532, width: 1184, height: 260 });
  });

  test("remembers the layout and falls back to the default", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    expect(readLayout(storage)).toEqual(defaultLayout);
    const layout = { ...defaultLayout, mode: "maximized" as const, dockedHeight: 420 };
    saveLayout(storage, layout);
    expect(readLayout(storage)).toEqual(layout);
    store.set("spoar-debugtools-panel", "not json");
    expect(readLayout(storage)).toEqual(defaultLayout);
  });

  test("ignores a storage that throws", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
    };
    expect(readLayout(blocked)).toEqual(defaultLayout);
    expect(() => saveLayout(blocked, defaultLayout)).not.toThrow();
  });
});
