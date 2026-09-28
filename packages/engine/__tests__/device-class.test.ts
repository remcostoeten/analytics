import { describe, expect, test } from "bun:test";

import { deviceClass } from "../src/utilities/device-class";

describe("deviceClass", () => {
  test.each([
    ["Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)", "tablet"],
    ["Mozilla/5.0 (Linux; Android 14; SM-X710) Safari/537.36", "tablet"],
    ["Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36", "mobile"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", "mobile"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "desktop"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "desktop"],
    ["Mozilla/5.0 (X11; Linux x86_64)", "desktop"],
    ["curl/8.5.0", "unknown"],
    [null, "unknown"],
  ])("%s", (userAgent, expected) => {
    expect<string>(deviceClass(userAgent)).toBe(expected);
  });
});
