import { describe, expect, test } from "bun:test";

import { noop } from "../src/noop";

describe("noop", () => {
  test("returns undefined", () => {
    expect(noop()).toBeUndefined();
  });
});
