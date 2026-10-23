import { describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";

import proxy, { config } from "../proxy";

function request(userAgent: string) {
  return new NextRequest("https://docs.test/dashboard/projects/example.com", {
    headers: { "user-agent": userAgent },
  });
}

describe("dashboard proxy", () => {
  test("refuses AI crawlers under /dashboard", () => {
    expect(proxy(request("meta-externalagent/1.1")).status).toBe(403);
  });

  test("passes browsers through", () => {
    expect(proxy(request("Mozilla/5.0 Chrome/152.0.0.0")).status).toBe(200);
  });

  test("only runs on the dashboard paths", () => {
    expect(config.matcher).toEqual(["/dashboard", "/dashboard/:path*"]);
  });
});
