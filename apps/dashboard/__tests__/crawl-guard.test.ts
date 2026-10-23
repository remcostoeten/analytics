import { describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";

import config from "../next.config";
import robots from "../src/app/robots";
import proxy, { config as proxyConfig } from "../src/proxy";

describe("crawl guard", () => {
  test("robots.txt disallows every path", () => {
    expect(robots().rules).toEqual({ userAgent: "*", disallow: "/" });
  });

  test("every response asks crawlers not to index, follow or archive", async () => {
    expect(await config.headers?.()).toEqual([
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ]);
  });

  test("the host's root robots.txt redirects into the base path", async () => {
    expect(await config.redirects?.()).toEqual([
      {
        source: "/robots.txt",
        destination: "/dashboard/robots.txt",
        basePath: false,
        permanent: false,
      },
    ]);
  });
});

describe("proxy", () => {
  function request(userAgent: string) {
    return new NextRequest("https://dashboard.test/dashboard/projects/example.com", {
      headers: { "user-agent": userAgent },
    });
  }

  test("refuses AI crawlers on every path", () => {
    expect(proxy(request("GPTBot/1.2")).status).toBe(403);
    expect(proxyConfig.matcher).toBe("/:path*");
  });

  test("passes browsers through", () => {
    expect(proxy(request("Mozilla/5.0 Chrome/152.0.0.0")).status).toBe(200);
  });
});
