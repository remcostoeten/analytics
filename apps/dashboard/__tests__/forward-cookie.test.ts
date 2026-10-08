import { describe, expect, test } from "bun:test";
import type { Fetcher } from "@spoar/shared/http";

import { withCookie } from "../src/shared/api/forward-cookie";

function recorder() {
  const seen: Headers[] = [];
  const base: Fetcher = async (_url, init) => {
    seen.push(new Headers(init.headers));
    return new Response("{}", { headers: { "content-type": "application/json" } });
  };
  return { base, seen };
}

describe("withCookie", () => {
  test("adds the cookie next to the existing headers", async () => {
    const { base, seen } = recorder();
    await withCookie("ra.session_token=abc", base)("https://api.test/v2/auth/session", {
      headers: { accept: "application/json" },
    });
    expect(seen[0]?.get("cookie")).toBe("ra.session_token=abc");
    expect(seen[0]?.get("accept")).toBe("application/json");
  });

  test("sends nothing extra for an empty cookie", async () => {
    const { base, seen } = recorder();
    await withCookie("", base)("https://api.test/v2/health", {});
    expect(seen[0]?.has("cookie")).toBe(false);
  });
});
