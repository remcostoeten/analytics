import { afterEach, describe, expect, test } from "bun:test";

import { IngestEnvelope } from "@spoar/contract";
import { Value } from "@sinclair/typebox/value";

import { eventsUrl, visitorDetails } from "../src/server/forwarding";
import { createServerAnalytics, serverVisitor } from "../src/server/index";
import type { ServerConfig } from "../src/server/index";
import { bodyText, withNativeRuntime } from "./native";

type Call = { url: string; headers: Headers; body: IngestEnvelope };
type Events = { checkout: { revenue: number }; newsletter_subscribed: Record<never, never> };

function api(status = 200, answer?: unknown) {
  const calls: Call[] = [];
  async function fetcher(url: string, init: RequestInit) {
    const body = JSON.parse(bodyText(init)) as IngestEnvelope;
    if (!Value.Check(IngestEnvelope, body)) throw new Error("envelope does not match the contract");
    calls.push({ url, headers: new Headers(init.headers), body });
    return Response.json(answer ?? { accepted: body.events.length, duplicates: 0, rejected: [] }, {
      status,
    });
  }
  return { calls, fetcher };
}

function server(fetcher: ServerConfig["fetch"], options: ServerConfig = {}) {
  return createServerAnalytics<Events>({
    project: "remcostoeten.nl",
    secret: "sk_test",
    endpoint: "https://api.example.test/",
    fetch: fetcher,
    ...options,
  });
}

function visitorRequest() {
  return new Request("https://remcostoeten.nl/api/checkout?x=1", {
    headers: {
      "user-agent": "Mozilla/5.0 Firefox/130.0",
      "x-forwarded-for": "203.0.113.7, 10.0.0.1",
    },
  });
}

withNativeRuntime();

afterEach(() => {
  delete process.env.RA_CONFIG;
});

describe("createServerAnalytics", () => {
  test("sends events from one tick in one request with the secret and the visitor's details", async () => {
    const { calls, fetcher } = api();
    const analytics = server(fetcher, { release: "2026.09.28" });
    const first = analytics.track("checkout", { revenue: 49 }, { request: visitorRequest() });
    const second = analytics.track(
      "newsletter_subscribed",
      {},
      { origin: "https://remcostoeten.nl" },
    );
    expect(await first).toEqual({ ok: true, error: null, accepted: 2, duplicates: 0, failed: 0 });
    expect(await second).toEqual(await first);
    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call?.url).toBe("https://api.example.test/v2/events");
    expect(call?.headers.get("authorization")).toBe("Bearer sk_test");
    expect(call?.headers.get("origin")).toBe("https://remcostoeten.nl");
    const [checkout, newsletter] = call?.body.events ?? [];
    expect(checkout).toMatchObject({
      name: "checkout",
      visitor: "server",
      page: { path: "/api/checkout" },
      props: { revenue: 49 },
      context: { ip: "203.0.113.7", ua: "Mozilla/5.0 Firefox/130.0", release: "2026.09.28" },
    });
    expect(newsletter).toMatchObject({ page: { path: "/" }, context: { release: "2026.09.28" } });
  });

  test("identify, captureError, captureMessage and scopes send typed events", async () => {
    const { calls, fetcher } = api();
    const analytics = server(fetcher).scope({ area: "billing" });
    void analytics.identify(
      "user_1",
      { plan: "pro" },
      { visitor: "visitor_1", session: "session_1" },
    );
    void analytics.captureError(new TypeError("card declined"), { tags: { provider: "stripe" } });
    void analytics.captureMessage("slow provider");
    await analytics.flush();
    const [identify, error, message] = calls[0]?.body.events ?? [];
    expect(identify).toMatchObject({
      name: "identify",
      visitor: "visitor_1",
      session: "session_1",
      props: { area: "billing", plan: "pro", userId: "user_1" },
    });
    expect(error?.props).toMatchObject({
      area: "billing",
      provider: "stripe",
      type: "TypeError",
      message: "card declined",
      level: "error",
    });
    expect(message?.props).toMatchObject({ message: "slow provider", level: "warning" });
  });

  test("group joins a group and groups on the context put any event in them", async () => {
    const { calls, fetcher } = api();
    const analytics = server(fetcher);
    void analytics.group("company", "acme", { plan: "pro" }, { visitor: "visitor_1" });
    void analytics.track("checkout", { revenue: 49 }, { groups: { company: "acme" } });
    await analytics.flush();
    const [group, checkout] = calls[0]?.body.events ?? [];
    expect(group).toMatchObject({
      name: "group",
      visitor: "visitor_1",
      props: { plan: "pro", groupType: "company", groupId: "acme" },
      groups: { company: "acme" },
    });
    expect(checkout?.groups).toEqual({ company: "acme" });
  });

  test("splits more than 50 events into several requests", async () => {
    const { calls, fetcher } = api();
    const analytics = server(fetcher);
    for (let index = 0; index < 120; index += 1)
      void analytics.track("checkout", { revenue: index });
    expect((await analytics.flush()).accepted).toBe(120);
    expect(calls.map((call) => call.body.events.length)).toEqual([50, 50, 20]);
  });

  test("keeps the first batch's error when a later batch succeeds", async () => {
    let calls = 0;
    const analytics = server(async (_, init) => {
      calls += 1;
      if (calls === 1) return new Response(null, { status: 500 });
      const body = JSON.parse(bodyText(init)) as IngestEnvelope;
      return Response.json({ accepted: body.events.length, duplicates: 0, rejected: [] });
    });
    for (let index = 0; index < 60; index += 1)
      void analytics.track("checkout", { revenue: index });
    expect(await analytics.flush()).toMatchObject({
      ok: false,
      error: { code: "RA_INGEST_FAILED", message: "HTTP 500" },
      accepted: 10,
      failed: 50,
    });
  });

  test("reports failures as values and never throws", async () => {
    const missing = await createServerAnalytics({ endpoint: "https://api.example.test" }).track(
      "checkout",
    );
    expect(missing).toMatchObject({ ok: false, error: { code: "RA_NO_SECRET" }, failed: 1 });

    const down = await server(api(503).fetcher).track("checkout", { revenue: 1 });
    expect(down).toMatchObject({
      ok: false,
      error: { code: "RA_INGEST_FAILED", message: "HTTP 503" },
    });

    const offline = await server(async () => {
      throw new TypeError("fetch failed");
    }).track("checkout", { revenue: 1 });
    expect(offline).toMatchObject({ ok: false, error: { code: "RA_INGEST_FAILED" }, failed: 1 });

    const rejected = await server(
      api(200, {
        accepted: 0,
        duplicates: 0,
        rejected: [{ index: 0, code: "VALIDATION_FAILED", message: "props.revenue is too long" }],
      }).fetcher,
    ).track("checkout", { revenue: 1 });
    expect(rejected).toMatchObject({ ok: false, error: { code: "RA_INGEST_REJECTED" }, failed: 1 });
  });

  test("hands the send to waitUntil from the options or the call", async () => {
    const waited: Promise<unknown>[] = [];
    const analytics = server(api().fetcher, { waitUntil: (promise) => waited.push(promise) });
    const sending = analytics.track("checkout", { revenue: 1 });
    expect(waited).toEqual([sending]);
    await sending;
  });

  test("withErrors captures a thrown error, waits for the send and rethrows", async () => {
    const { calls, fetcher } = api();
    const handler = server(fetcher).withErrors(async () => {
      throw new Error("order failed");
    });
    let thrown: unknown = null;
    try {
      await handler(visitorRequest());
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect(calls[0]?.body.events[0]?.props).toMatchObject({ message: "order failed" });
  });

  test("forwards the request's site origin and only the admin session cookie", async () => {
    const { calls, fetcher } = api();
    const request = new Request("http://localhost:3000/api/checkout", {
      headers: {
        "x-forwarded-host": "app-git-main-remco.vercel.app",
        "x-forwarded-proto": "https",
        cookie: "theme=dark; __Secure-ra.session_token=abc.def; other=1",
      },
    });
    await server(fetcher, { origin: "https://remcostoeten.nl" }).track(
      "checkout",
      { revenue: 1 },
      { request },
    );
    expect(calls[0]?.headers.get("origin")).toBe("https://app-git-main-remco.vercel.app");
    expect(calls[0]?.headers.get("cookie")).toBe("__Secure-ra.session_token=abc.def");
  });

  test("sends the origin option without a request, and no cookie or visitor details", async () => {
    const { calls, fetcher } = api();
    await server(fetcher, { origin: "http://localhost:3000" }).track("newsletter_subscribed");
    const [call] = calls;
    expect(call?.headers.get("origin")).toBe("http://localhost:3000");
    expect(call?.headers.get("cookie")).toBeNull();
    expect(call?.headers.get("x-visitor-ip")).toBeNull();
    expect(call?.headers.get("x-visitor-ua")).toBeNull();
    expect(call?.body.events[0]?.context?.ip).toBeUndefined();
    expect(call?.body.events[0]?.context?.ua).toBeUndefined();
  });

  test("keeps events from different sites or admins in separate requests", async () => {
    const { calls, fetcher } = api();
    const analytics = server(fetcher);
    void analytics.track("checkout", { revenue: 1 }, { origin: "https://remcostoeten.nl" });
    void analytics.track("checkout", { revenue: 2 }, { origin: "http://localhost:3000" });
    void analytics.track("checkout", { revenue: 3 }, { origin: "https://remcostoeten.nl" });
    expect((await analytics.flush()).accepted).toBe(3);
    expect(calls.map((call) => [call.headers.get("origin"), call.body.events.length])).toEqual([
      ["https://remcostoeten.nl", 2],
      ["http://localhost:3000", 1],
    ]);
  });

  test("events without a visitor or session use serverVisitor", async () => {
    const { calls, fetcher } = api();
    await server(fetcher).track("newsletter_subscribed");
    expect(serverVisitor).toBe("server");
    expect(calls[0]?.body.events[0]).toMatchObject({
      visitor: serverVisitor,
      session: serverVisitor,
    });
  });

  test("reads RA_CONFIG under explicit options", async () => {
    process.env.RA_CONFIG = JSON.stringify({
      secret: "sk_test",
      endpoint: "https://env.example.test",
    });
    const { calls, fetcher } = api();
    await createServerAnalytics({ fetch: fetcher }).track("checkout");
    expect(calls[0]?.url).toBe("https://env.example.test/v2/events");
  });
});

describe("forwarding", () => {
  test.each([
    ["https://api.example.test", "https://api.example.test/v2/events"],
    ["https://api.example.test//", "https://api.example.test/v2/events"],
    ["https://api.example.test/v2/events", "https://api.example.test/v2/events"],
  ])("eventsUrl(%s)", (endpoint, expected) => {
    expect(eventsUrl(endpoint)).toBe(expected);
  });

  test("visitorDetails prefers cf-connecting-ip, then x-real-ip, then x-forwarded-for", () => {
    expect(visitorDetails(new Headers({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" })).ip).toBe(
      "198.51.100.1",
    );
    expect(
      visitorDetails(
        new Headers({ "x-real-ip": "198.51.100.2", "x-forwarded-for": "198.51.100.1" }),
      ).ip,
    ).toBe("198.51.100.2");
    expect(
      visitorDetails(
        new Headers({ "cf-connecting-ip": "198.51.100.3", "x-real-ip": "198.51.100.2" }),
      ),
    ).toEqual({ ip: "198.51.100.3", userAgent: null });
  });
});
