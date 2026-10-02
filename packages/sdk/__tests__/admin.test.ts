import { describe, expect, test } from "bun:test";

import type { Annotation } from "@remcostoeten/analytics-contract";

import { createAdmin, discord, mail, webhook } from "../src/admin/index";
import type { AdminOptions } from "../src/admin/index";
import { bodyText, withNativeRuntime } from "./native";

withNativeRuntime();

type Call = { method: string; url: URL; authorization: string | null; body: string };
type Reply = { status: number; body?: object };

const changes = {
  created: ["mail", "ops"],
  updated: [],
  removed: ["old"],
  secrets: { ops: "whsec_1" },
};

function fakeApi(reply: (call: Call) => Reply) {
  const calls: Call[] = [];
  async function fetcher(url: string, init: RequestInit) {
    const call = {
      method: init.method ?? "GET",
      url: new URL(url),
      authorization: new Headers(init.headers).get("authorization"),
      body: bodyText(init),
    };
    calls.push(call);
    const answer = reply(call);
    if (answer.body === undefined) return new Response(null, { status: answer.status });
    return Response.json(answer.body, { status: answer.status });
  }
  return { calls, fetcher };
}

function admin(fetcher: AdminOptions["fetch"], token: string | undefined = "rat_admin") {
  return createAdmin<"remcostoeten.nl" | "skriuw">({
    endpoint: "https://api.example.test/",
    token,
    fetch: fetcher,
  });
}

describe("admin.alerts", () => {
  test("sync puts the whole list and answers the changes", async () => {
    const api = fakeApi(() => ({ status: 200, body: { data: changes } }));
    const synced = await admin(api.fetcher).alerts.sync("remcostoeten.nl", [
      mail({ to: ["remco@gmail.com"] }),
      webhook({ name: "ops", url: "https://ops.example.com/hooks", on: ["issue.new"] }),
      discord({ url: "https://discord.com/api/webhooks/1/abc", enabled: false }),
    ]);
    expect(synced).toEqual({ ok: true, value: changes });
    const [call] = api.calls;
    expect(call?.method).toBe("PUT");
    expect(call?.url.href).toBe(
      "https://api.example.test/v2/projects/remcostoeten.nl/alerts/targets",
    );
    expect(call?.authorization).toBe("Bearer rat_admin");
    expect(JSON.parse(call?.body ?? "")).toEqual({
      targets: [
        { channel: "mail", to: ["remco@gmail.com"] },
        {
          channel: "webhook",
          name: "ops",
          on: ["issue.new"],
          url: "https://ops.example.com/hooks",
        },
        { channel: "discord", enabled: false, url: "https://discord.com/api/webhooks/1/abc" },
      ],
    });
  });

  test("list, set, remove, test, rotate, deliveries and status call their routes", async () => {
    const api = fakeApi((call) => {
      if (call.method === "DELETE") return { status: 204 };
      if (call.url.pathname.endsWith("/test")) {
        return {
          status: 200,
          body: { data: { name: "ops", channel: "webhook", delivered: true, message: "200" } },
        };
      }
      if (call.url.pathname.endsWith("/rotate")) {
        return { status: 200, body: { data: { name: "ops", secret: "whsec_2" } } };
      }
      if (call.url.pathname.endsWith("/deliveries")) {
        return { status: 200, body: { data: [], nextCursor: null } };
      }
      if (call.url.pathname.endsWith("/status")) {
        return {
          status: 200,
          body: { data: { channels: [], transport: null, pending: 0, failing: [] } },
        };
      }
      if (call.method === "PUT") return { status: 200, body: { data: changes } };
      return { status: 200, body: { data: [], nextCursor: null } };
    });
    const alerts = admin(api.fetcher).alerts;

    expect(await alerts.list("skriuw")).toEqual({ ok: true, value: [] });
    expect(
      await alerts.set("skriuw", webhook({ name: "ops", url: "https://ops.example.com" })),
    ).toEqual({
      ok: true,
      value: changes,
    });
    expect(await alerts.set("skriuw", mail({ to: ["remco@gmail.com"] }))).toMatchObject({
      ok: true,
    });
    expect(await alerts.remove("skriuw", "ops")).toEqual({ ok: true, value: null });
    expect(await alerts.test("skriuw", "ops")).toEqual({
      ok: true,
      value: { name: "ops", channel: "webhook", delivered: true, message: "200" },
    });
    expect(await alerts.rotate("skriuw", "ops")).toEqual({
      ok: true,
      value: { name: "ops", secret: "whsec_2" },
    });
    expect(await alerts.deliveries("skriuw", { status: "failed", limit: 10 })).toEqual({
      ok: true,
      value: { data: [], nextCursor: null },
    });
    expect(await alerts.status()).toEqual({
      ok: true,
      value: { channels: [], transport: null, pending: 0, failing: [] },
    });

    expect(
      api.calls.map((call) => `${call.method} ${call.url.pathname}${call.url.search}`),
    ).toEqual([
      "GET /v2/projects/skriuw/alerts/targets",
      "PUT /v2/projects/skriuw/alerts/targets/ops",
      "PUT /v2/projects/skriuw/alerts/targets/mail",
      "DELETE /v2/projects/skriuw/alerts/targets/ops",
      "POST /v2/projects/skriuw/alerts/targets/ops/test",
      "POST /v2/projects/skriuw/alerts/targets/ops/rotate",
      "GET /v2/projects/skriuw/alerts/deliveries?status=failed&limit=10",
      "GET /v2/admin/alerts/status",
    ]);
    expect(JSON.parse(api.calls[2]?.body ?? "")).toEqual({
      channel: "mail",
      to: ["remco@gmail.com"],
    });
  });
});

describe("admin.annotations", () => {
  const stored: Annotation = {
    id: "ann_1",
    project: "skriuw",
    title: "v2.0 released",
    date: "2026-10-01T09:30:00.000Z",
    endDate: null,
    kind: "release",
    note: null,
    url: "https://github.com/remcostoeten/skriuw/releases/tag/v2.0.0",
    createdAt: "2026-10-01T09:31:00.000Z",
    updatedAt: "2026-10-01T09:31:00.000Z",
  };

  test("create, update, list and remove call their routes", async () => {
    const api = fakeApi((call) => {
      if (call.method === "DELETE") return { status: 204 };
      if (call.method === "GET") return { status: 200, body: { data: [stored], nextCursor: null } };
      return { status: call.method === "POST" ? 201 : 200, body: { data: stored } };
    });
    const annotations = admin(api.fetcher).annotations;
    expect(
      await annotations.create("skriuw", {
        title: "v2.0 released",
        date: new Date("2026-10-01T09:30:00.000Z"),
        kind: "release",
        url: "https://github.com/remcostoeten/skriuw/releases/tag/v2.0.0",
      }),
    ).toEqual({ ok: true, value: stored });
    expect(
      await annotations.update("skriuw", "ann_1", { endDate: null, note: "Rolled out" }),
    ).toEqual({ ok: true, value: stored });
    expect(
      await annotations.list("skriuw", {
        from: "2026-09-01T00:00:00Z",
        to: "2026-10-02T00:00:00Z",
      }),
    ).toEqual({
      ok: true,
      value: { data: [stored], nextCursor: null },
    });
    expect(await annotations.remove("skriuw", "ann_1")).toEqual({ ok: true, value: null });
    expect(
      api.calls.map((call) => [
        call.method,
        decodeURIComponent(`${call.url.pathname}${call.url.search}`),
        call.body ? JSON.parse(call.body) : null,
      ]),
    ).toEqual([
      [
        "POST",
        "/v2/projects/skriuw/annotations",
        {
          title: "v2.0 released",
          date: "2026-10-01T09:30:00.000Z",
          kind: "release",
          url: "https://github.com/remcostoeten/skriuw/releases/tag/v2.0.0",
        },
      ],
      ["PATCH", "/v2/projects/skriuw/annotations/ann_1", { endDate: null, note: "Rolled out" }],
      [
        "GET",
        "/v2/projects/skriuw/annotations?from=2026-09-01T00:00:00Z&to=2026-10-02T00:00:00Z",
        null,
      ],
      ["DELETE", "/v2/projects/skriuw/annotations/ann_1", null],
    ]);
  });

  test("a validation error comes back with its field", async () => {
    const api = fakeApi(() => ({
      status: 400,
      body: {
        error: {
          code: "VALIDATION_FAILED",
          message: "endDate must not be before date",
          details: { fields: [{ path: "/endDate", message: "endDate must not be before date" }] },
          requestId: "req_1",
          docs: "https://api.example.test/v2/openapi",
        },
      },
    }));
    const created = await admin(api.fetcher).annotations.create("skriuw", {
      title: "Sale week",
      date: "2026-09-20",
      endDate: "2026-09-14",
    });
    expect(created).toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION_FAILED",
        status: 400,
        details: { fields: [{ path: "/endDate" }] },
        requestId: "req_1",
      },
    });
  });
});

describe("admin reads", () => {
  test("pass range, traffic, filters and paging through the query", async () => {
    const api = fakeApi(() => ({ status: 200, body: { data: [] } }));
    const client = admin(api.fetcher);
    await client.stats("remcostoeten.nl", {
      period: "7d",
      traffic: "all",
      filter: { country: "NL" },
    });
    await client.timeseries("remcostoeten.nl", { metric: "visitors", interval: "day" });
    await client.breakdown("remcostoeten.nl", "prop:plan", { metrics: "visitors", limit: 5 });
    await client.lifecycle("remcostoeten.nl", { interval: "month" });
    await client.issues("remcostoeten.nl", { status: "open", cursor: "10" });
    expect(
      api.calls.map((call) => decodeURIComponent(`${call.url.pathname}${call.url.search}`)),
    ).toEqual([
      "/v2/projects/remcostoeten.nl/stats?period=7d&traffic=all&filter[country]=NL",
      "/v2/projects/remcostoeten.nl/timeseries?metric=visitors&interval=day",
      "/v2/projects/remcostoeten.nl/breakdown/prop:plan?metrics=visitors&limit=5",
      "/v2/projects/remcostoeten.nl/lifecycle?interval=month",
      "/v2/projects/remcostoeten.nl/issues?status=open&cursor=10",
    ]);
    expect(api.calls.every((call) => call.method === "GET")).toBe(true);
  });
});

describe("admin errors", () => {
  test("an API error envelope becomes its code, message and details", async () => {
    const envelope = {
      error: {
        code: "VALIDATION_FAILED",
        message: "mail is not enabled on this deployment",
        details: { path: "/targets/0/channel" },
        requestId: "req_1",
        docs: "https://docs.example.test/errors#VALIDATION_FAILED",
      },
    };
    const api = fakeApi(() => ({ status: 400, body: envelope }));
    const synced = await admin(api.fetcher).alerts.sync("skriuw", [
      mail({ to: ["remco@gmail.com"] }),
    ]);
    expect(synced).toEqual({
      ok: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "mail is not enabled on this deployment",
        status: 400,
        details: { path: "/targets/0/channel" },
        requestId: "req_1",
      },
    });
  });

  test("a status without an envelope maps to the catalog code for it", async () => {
    const api = fakeApi(() => ({ status: 404 }));
    const listed = await admin(api.fetcher).alerts.list("skriuw");
    expect(listed.ok).toBe(false);
    if (!listed.ok) expect(listed.error).toMatchObject({ code: "NOT_FOUND", status: 404 });
  });

  test("an unreachable API is NETWORK and never throws", async () => {
    async function unreachable(): Promise<Response> {
      throw new TypeError("connection refused");
    }
    const status = await admin(unreachable).alerts.status();
    expect(status.ok).toBe(false);
    if (!status.ok) {
      expect(status.error.code).toBe("NETWORK");
      expect(status.error.status).toBeNull();
    }
  });

  test("an empty token fails without a request", async () => {
    const api = fakeApi(() => ({ status: 200, body: { data: [] } }));
    const listed = await admin(api.fetcher, "").alerts.list("skriuw");
    expect(listed).toMatchObject({ ok: false, error: { code: "NO_TOKEN" } });
    expect(api.calls).toHaveLength(0);
  });
});
