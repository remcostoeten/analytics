import { describe, expect, test } from "bun:test";

import { tokenizeJson } from "../src/shared/json-tokens";

function kinds(json: string) {
  return tokenizeJson(json)
    .filter((token) => token.kind !== "plain")
    .map((token) => `${token.kind}:${token.text}`);
}

describe("tokenizeJson", () => {
  test("tells keys from string values", () => {
    expect(kinds('{"metric": "cls"}')).toEqual([
      "punctuation:{",
      'key:"metric"',
      "punctuation::",
      'string:"cls"',
      "punctuation:}",
    ]);
  });

  test("colours numbers, booleans and null", () => {
    expect(kinds('{"value": 0.0039, "ok": true, "none": null, "n": -1e3}')).toEqual([
      "punctuation:{",
      'key:"value"',
      "punctuation::",
      "number:0.0039",
      "punctuation:,",
      'key:"ok"',
      "punctuation::",
      "boolean:true",
      "punctuation:,",
      'key:"none"',
      "punctuation::",
      "null:null",
      "punctuation:,",
      'key:"n"',
      "punctuation::",
      "number:-1e3",
      "punctuation:}",
    ]);
  });

  test("keeps escaped quotes and colons inside strings", () => {
    expect(kinds('{"a": "x\\"y: z"}')).toEqual([
      "punctuation:{",
      'key:"a"',
      "punctuation::",
      'string:"x\\"y: z"',
      "punctuation:}",
    ]);
  });

  test("treats words that look like literals inside strings as strings", () => {
    expect(kinds('["true", "null"]')).toEqual([
      "punctuation:[",
      'string:"true"',
      "punctuation:,",
      'string:"null"',
      "punctuation:]",
    ]);
  });

  test("round-trips the input text", () => {
    const json = JSON.stringify(
      { id: "v6-1", route: "/", value: 0.0039, nested: [1, null] },
      null,
      2,
    );
    expect(
      tokenizeJson(json)
        .map((token) => token.text)
        .join(""),
    ).toBe(json);
  });
});
