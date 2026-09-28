import { describe, expect, test } from "bun:test";

import { measure } from "../size-check";

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
