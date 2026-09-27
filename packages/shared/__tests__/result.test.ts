import { describe, expect, test } from "bun:test";

import { err, ok } from "../src/result";
import type { Result } from "../src/result";

function parseCount(input: string): Result<number, string> {
  const count = Number(input);
  return Number.isInteger(count) ? ok(count) : err(`not an integer: ${input}`);
}

describe("result", () => {
  test("ok carries the value", () => {
    expect(ok(3)).toEqual({ ok: true, value: 3 });
  });

  test("err carries the failure", () => {
    expect(err("boom")).toEqual({ ok: false, error: "boom" });
  });

  test("narrows on ok", () => {
    const result = parseCount("12");
    expect(result.ok ? result.value : null).toBe(12);
    const failed = parseCount("1.5");
    expect(failed.ok ? null : failed.error).toBe("not an integer: 1.5");
  });
});
