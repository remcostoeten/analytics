import { describe, expect, test } from "bun:test";

import robots from "../app/robots";

describe("robots.txt", () => {
  test("keeps crawlers out of the dashboard", () => {
    expect(robots().rules).toEqual({ userAgent: "*", allow: "/", disallow: ["/dashboard"] });
  });
});
