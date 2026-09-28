import { describe, expect, test } from "bun:test";

import { createPageCounter, createProxy, isPageRequest } from "../src/proxy/index";
import { bodyText, withNativeRuntime } from "./native";

withNativeRuntime();

type Forwarded = { url: string; headers: Headers; body: string };

function upstream() {
  const calls: Forwarded[] = [];
  async function fetcher(url: string, init: RequestInit) {
    calls.push({ url, headers: new Headers(init.headers), body: bodyText(init) });
    return Response.json({ accepted: 1, duplicates: 0, rejected: [] }, { status: 202 });
  }
  return { calls, fetcher };
}

const envelope = JSON.stringify({ v: 1, sentAt: "2026-09-28T12:00:00.000Z", events: [] });

function browserPost(body = envelope, origin = "https://remcostoeten.nl") {
  return new Request("https://remcostoeten.nl/_ra?key=pk_test", {
    method: "POST",
    body,
    headers: {
      origin,
      "content-type": "text/plain;charset=UTF-8",
      "user-agent": "Mozilla/5.0 Firefox/130.0",
      "x-real-ip": "203.0.113.7",
    },
  });
}

describe("createProxy", () => {
  test("forwards the body with the secret and the visitor's IP and user agent", async () => {
    const { calls, fetcher } = upstream();
    const proxy = createProxy({
      secret: "sk_test",
      endpoint: "https://api.example.test",
      fetch: fetcher,
    });
    const response = await proxy(browserPost());
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ accepted: 1, duplicates: 0, rejected: [] });
    const [call] = calls;
    expect(call?.url).toBe("https://api.example.test/v2/events");
    expect(call?.body).toBe(envelope);
    expect(call?.headers.get("authorization")).toBe("Bearer sk_test");
    expect(call?.headers.get("x-visitor-ip")).toBe("203.0.113.7");
    expect(call?.headers.get("x-visitor-ua")).toBe("Mozilla/5.0 Firefox/130.0");
  });

  test.each([
    ["no secret", {}, () => browserPost(), 500],
    ["a GET", undefined, () => new Request("https://remcostoeten.nl/_ra"), 405],
    ["a cross-site origin", undefined, () => browserPost(envelope, "https://evil.example"), 403],
    [
      "a cross-site fetch",
      undefined,
      () =>
        new Request("https://remcostoeten.nl/_ra", {
          method: "POST",
          body: envelope,
          headers: { "sec-fetch-site": "cross-site" },
        }),
      403,
    ],
    ["a body over 64 KB", undefined, () => browserPost("x".repeat(70_000)), 413],
  ])("refuses %s", async (_, options, request, status) => {
    const { calls, fetcher } = upstream();
    const proxy = createProxy(
      options ?? { secret: "sk_test", endpoint: "https://api.example.test", fetch: fetcher },
    );
    expect((await proxy(request())).status).toBe(status);
    expect(calls).toHaveLength(0);
  });

  test("accepts an origin that matches the forwarded host behind a reverse proxy", async () => {
    const { calls, fetcher } = upstream();
    const proxy = createProxy({
      secret: "sk_test",
      endpoint: "https://api.example.test",
      fetch: fetcher,
    });
    const internal = new Request("http://localhost:3000/_ra", {
      method: "POST",
      body: envelope,
      headers: { origin: "https://remcostoeten.nl", "x-forwarded-host": "remcostoeten.nl" },
    });
    expect((await proxy(internal)).status).toBe(202);
    expect(calls).toHaveLength(1);
  });

  test("answers 502 when the API cannot be reached", async () => {
    const proxy = createProxy({
      secret: "sk_test",
      endpoint: "https://api.example.test",
      fetch: async () => {
        throw new TypeError("fetch failed");
      },
    });
    const response = await proxy(browserPost());
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ error: { code: "UNAVAILABLE" } });
  });
});

describe("page counter", () => {
  test.each([
    ["a document load", { "sec-fetch-dest": "document" }, "GET", true],
    ["an HTML accept without fetch metadata", { accept: "text/html,*/*" }, "GET", true],
    ["an image", { "sec-fetch-dest": "image" }, "GET", false],
    ["a prefetch", { "sec-fetch-dest": "document", "sec-purpose": "prefetch" }, "GET", false],
    ["a POST", { "sec-fetch-dest": "document" }, "POST", false],
  ])("isPageRequest is right for %s", (_, headers, method, expected) => {
    expect(isPageRequest(new Request("https://remcostoeten.nl/blog", { method, headers }))).toBe(
      expected,
    );
  });

  test("counts page loads as page_request events and skips the rest", async () => {
    const calls: string[] = [];
    const countPage = createPageCounter({
      secret: "sk_test",
      endpoint: "https://api.example.test",
      fetch: async (_, init) => {
        calls.push(bodyText(init));
        return Response.json({ accepted: 1, duplicates: 0, rejected: [] });
      },
    });
    const page = new Request("https://remcostoeten.nl/blog", {
      headers: { "sec-fetch-dest": "document" },
    });
    expect(countPage(new Request("https://remcostoeten.nl/logo.svg"))).toBeNull();
    expect(await countPage(page)).toMatchObject({ ok: true, accepted: 1 });
    expect(JSON.parse(calls[0] ?? "{}").events[0]).toMatchObject({
      name: "page_request",
      page: { path: "/blog" },
    });
  });
});
