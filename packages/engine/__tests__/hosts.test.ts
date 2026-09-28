import { describe, expect, test } from "bun:test";

import { hostOf, isLocalhost, isPreview } from "../src/utilities/hosts";

describe("hostOf", () => {
  test.each([
    ["https://remcostoeten.nl", "remcostoeten.nl"],
    ["http://localhost:3000", "localhost:3000"],
    ["not a url", null],
    [null, null],
  ])("%s", (origin, expected) => {
    expect(hostOf(origin)).toBe(expected);
  });
});

describe("isLocalhost", () => {
  test.each([
    ["localhost", true],
    ["localhost:3000", true],
    ["127.0.0.1:5173", true],
    ["[::1]:8080", true],
    ["site.local", true],
    ["app.localhost", true],
    ["remcostoeten.nl", false],
    [null, false],
  ])("%s", (host, expected) => {
    expect(isLocalhost(host)).toBe(expected);
  });
});

describe("isPreview", () => {
  test.each([
    ["analytics-git-main-remco.vercel.app", true],
    ["analytics-a1b2c3d4e5-remco.vercel.app", true],
    ["site-preview.example.com", true],
    ["app.preview.example.com", true],
    ["preview-42.example.com", true],
    ["staging-app.example.com", true],
    ["analytics.vercel.app", false],
    ["remcostoeten.nl", false],
    [null, false],
  ])("%s", (host, expected) => {
    expect(isPreview(host)).toBe(expected);
  });
});
