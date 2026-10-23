import { describe, expect, test } from "bun:test";

import config from "../next.config";
import robots from "../src/app/robots";

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
