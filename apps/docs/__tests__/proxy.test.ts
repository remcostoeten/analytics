import { describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";

import proxy, { config } from "../proxy";

function request(userAgent: string) {
  return new NextRequest("https://docs.test/dashboard/projects/example.com", {
    headers: { "user-agent": userAgent },
  });
}

function docsRequest(accept: string) {
  return new NextRequest("https://docs.test/docs/sdk/client", { headers: { accept } });
}

describe("dashboard proxy", () => {
  test("refuses AI crawlers under /dashboard", () => {
    expect(proxy(request("meta-externalagent/1.1")).status).toBe(403);
  });

  test("passes browsers through", () => {
    expect(proxy(request("Mozilla/5.0 Chrome/152.0.0.0")).status).toBe(200);
  });

  test("only runs on the dashboard and docs paths", () => {
    expect(config.matcher).toEqual(["/dashboard", "/dashboard/:path*", "/docs", "/docs/:path*"]);
  });
});

describe("docs proxy", () => {
  test("serves Markdown to clients that prefer it", () => {
    const response = proxy(docsRequest("text/markdown"));

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://docs.test/llms.mdx/docs/sdk/client",
    );
  });

  test("leaves browsers on the HTML page", () => {
    const response = proxy(docsRequest("text/html,application/xhtml+xml"));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  test("lets AI crawlers read the docs", () => {
    const request = new NextRequest("https://docs.test/docs", {
      headers: { "user-agent": "GPTBot/1.2" },
    });

    expect(proxy(request).status).toBe(200);
  });
});
