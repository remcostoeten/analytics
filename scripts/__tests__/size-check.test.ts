import { describe, expect, test } from "bun:test";

import { measure, pluginBudgets, withChunks } from "../size-check";

describe("measure", () => {
  test("flags an entry whose gzip size is over its budget", () => {
    const small = new TextEncoder().encode("a".repeat(1000));
    const random = crypto.getRandomValues(new Uint8Array(4000));
    const results = measure(
      [
        { file: "small.mjs", limitBytes: 100 },
        { file: "random.mjs", limitBytes: 100 },
      ],
      (file) => (file === "small.mjs" ? small : random),
    );
    expect(results.map((result) => [result.file, result.over])).toEqual([
      ["small.mjs", false],
      ["random.mjs", true],
    ]);
  });
});

describe("pluginBudgets", () => {
  test("gives each plugin file 0.6 KB unless it has an exception", () => {
    expect(
      pluginBudgets(["index.ts", "speed-insights.ts", "clicks.ts", "errors.ts", "notes.md"]),
    ).toEqual([
      { file: "clicks.ts", limitBytes: 614.4 },
      { file: "errors.ts", limitBytes: 716.8 },
      { file: "speed-insights.ts", limitBytes: 2560 },
    ]);
  });
});

describe("withChunks", () => {
  test("follows local chunk imports once each", () => {
    const files: { [file: string]: string } = {
      "index.mjs": 'import{a}from"./shared-1.mjs";import{b}from"./other-2.mjs";index',
      "shared-1.mjs": 'import{b}from"./other-2.mjs";shared',
      "other-2.mjs": 'import{x}from"web-vitals";other',
    };
    const code = withChunks("index.mjs", (file) => files[file] ?? "");
    expect(code).toBe(`${files["index.mjs"]}${files["other-2.mjs"]}${files["shared-1.mjs"]}`);
  });
});
