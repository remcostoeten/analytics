import { describe, expect, test } from "bun:test";

import { hasSessionCookie } from "../src/shared/api/session-cookie";

describe("hasSessionCookie", () => {
  test("finds the plain and the __Secure- prefixed session cookie", () => {
    expect(hasSessionCookie("ra.session_token=abc")).toBe(true);
    expect(hasSessionCookie("theme=dark; __Secure-ra.session_token=abc")).toBe(true);
  });

  test("ignores other cookies and an empty jar", () => {
    expect(hasSessionCookie("")).toBe(false);
    expect(hasSessionCookie("theme=dark; ra.session_token_hint=1")).toBe(false);
    expect(hasSessionCookie("xra.session_token=abc")).toBe(false);
  });
});
