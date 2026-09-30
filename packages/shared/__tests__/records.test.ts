import { describe, expect, test } from "bun:test";

import { hasKeys, orNull } from "../src/records";

describe("hasKeys", () => {
  test("is false for an empty object", () => {
    expect(hasKeys({})).toBe(false);
  });

  test("is true when a key is set, even to undefined", () => {
    expect(hasKeys({ plan: "pro" })).toBe(true);
    expect(hasKeys({ plan: undefined })).toBe(true);
  });

  test("ignores inherited keys", () => {
    const child = Object.create({ inherited: true }) as { readonly [key: string]: unknown };
    expect(hasKeys(child)).toBe(false);
  });
});

describe("orNull", () => {
  test("returns null for an empty object", () => {
    expect(orNull({})).toBeNull();
  });

  test("returns the same object when it has keys", () => {
    const traits = { plan: "pro" };
    expect(orNull(traits)).toBe(traits);
  });
});
