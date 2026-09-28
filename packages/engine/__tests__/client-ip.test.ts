import { describe, expect, test } from "bun:test";

import { clientIp } from "../src/utilities/client-ip";

describe("clientIp", () => {
  test.each([
    ["cf-connecting-ip wins", { "cf-connecting-ip": "1.1.1.1", "x-real-ip": "2.2.2.2" }, "1.1.1.1"],
    [
      "x-real-ip before x-forwarded-for",
      { "x-real-ip": "2.2.2.2", "x-forwarded-for": "3.3.3.3" },
      "2.2.2.2",
    ],
    ["first x-forwarded-for entry", { "x-forwarded-for": " 3.3.3.3 , 10.0.0.1" }, "3.3.3.3"],
    ["empty x-forwarded-for", { "x-forwarded-for": "" }, null],
    ["no headers", {}, null],
  ])("%s", (_, headers, expected) => {
    expect(clientIp(new Headers(headers))).toBe(expected);
  });
});
