import { describe, expect, test } from "bun:test";

import type { WidgetSession } from "@spoar/contract";
import type { Fetcher } from "@spoar/shared/http";

import { createClient, refreshAheadMs } from "../src/client/client";
import type { Bootstrap } from "../src/client/types";

type Call = {
  url: string;
  headers: Headers;
  credentials: RequestCredentials | undefined;
  body: string;
};

const overview = {
  online: 3,
  viewsPerMinute: [0, 0, 0, 0, 0, 0, 0, 0, 1, 2],
  today: { visitors: 10, pageviews: 20, bounceRate: 0.5, avgSessionSeconds: 61.5 },
  ingest: { last24h: { accepted: 90, duplicates: 4, rejected: 6, rateLimited: 4 } },
  bots: { share: 0.1, headless: 2, webdriver: 0, datacenterAsn: 1 },
  speed: { lcp: 1800, inp: null, cls: null, ttfb: null },
  errors: { last30m: 1, openIssues: 2 },
  topPages: [{ path: "/", views: 12 }],
  referrers: [{ name: "google", share: 0.5 }],
  countries: [{ code: "NL", share: 1 }],
  release: { current: "r1", deployedAt: "2026-10-04T10:00:00.000Z", newIssuesSince: 1 },
};

function memoryFetch(expiresIn: () => number) {
  const calls: Call[] = [];
  let issued = 0;
  const send: Fetcher = async (url, init) => {
    calls.push({
      url,
      headers: new Headers(init.headers),
      credentials: init.credentials,
      body: typeof init.body === "string" ? init.body : "",
    });
    const path = new URL(url).pathname;
    if (path === "/v2/widget/session") {
      issued += 1;
      const session: WidgetSession = {
        project: "site",
        projectName: "Site",
        publicKey: "pk_site",
        access: "admin",
        user: { id: "u1", name: "admin" },
        release: null,
        token: `wt_${issued}`,
        expiresAt: new Date(expiresIn()).toISOString(),
        features: { logs: true, speed: true, issues: true, reports: true },
      };
      await Bun.sleep(5);
      return Response.json(session);
    }
    if (path.endsWith("/overview")) return Response.json(overview);
    if (path.endsWith("/logs/client")) return Response.json({ accepted: 1 }, { status: 202 });
    return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  };
  return { calls, send };
}

describe("createClient", () => {
  test("bootstrap sends the session cookie and other calls send the bearer token", async () => {
    const now = 1_000_000;
    const memory = memoryFetch(() => now + 15 * 60_000);
    const client = createClient({
      endpoint: "https://api.example.com/",
      project: "site",
      fetch: memory.send,
      now: () => now,
    });
    const overview = await client.overview();
    expect(overview.ok).toBe(true);
    const [session, read] = memory.calls;
    expect(session?.url).toBe("https://api.example.com/v2/widget/session?project=site");
    expect(session?.credentials).toBe("include");
    expect(read?.url).toBe("https://api.example.com/v2/projects/site/overview");
    expect(read?.headers.get("authorization")).toBe("Bearer wt_1");
    expect(read?.credentials).toBeUndefined();
  });

  test("refreshes 60 seconds before expiresAt and shares one refresh", async () => {
    let now = 1_000_000;
    const memory = memoryFetch(() => now + 15 * 60_000);
    const client = createClient({
      endpoint: "https://api.example.com",
      project: "site",
      fetch: memory.send,
      now: () => now,
    });
    await client.overview();
    now += 15 * 60_000 - refreshAheadMs - 1;
    await client.overview();
    expect(memory.calls.filter((call) => call.url.includes("/widget/session"))).toHaveLength(1);
    now += 2;
    await Promise.all([client.overview(), client.overview(), client.overview()]);
    const sessions = memory.calls.filter((call) => call.url.includes("/widget/session"));
    expect(sessions).toHaveLength(2);
    expect(memory.calls.at(-1)?.headers.get("authorization")).toBe("Bearer wt_2");
  });

  test("uses the initial bootstrap until it is due", async () => {
    const now = 1_000_000;
    const memory = memoryFetch(() => now + 15 * 60_000);
    const initial: Bootstrap = {
      token: "wt_initial",
      expiresAt: new Date(now + 10 * 60_000).toISOString(),
      project: { id: "site", name: "Site", release: null },
      user: { name: "admin" },
      publicKey: "pk_site",
      features: { logs: true, speed: true, issues: true, reports: true },
    };
    const client = createClient(
      { endpoint: "https://api.example.com", project: "site", fetch: memory.send, now: () => now },
      initial,
    );
    await client.overview();
    expect(memory.calls).toHaveLength(1);
    expect(memory.calls[0]?.headers.get("authorization")).toBe("Bearer wt_initial");
  });

  test("maps the overview to the panel's numbers", async () => {
    const memory = memoryFetch(() => Date.now() + 60 * 60_000);
    const client = createClient({
      endpoint: "https://api.example.com",
      project: "site",
      fetch: memory.send,
    });
    const answer = await client.overview();
    expect(answer.ok && answer.value).toMatchObject({
      online: 3,
      today: { sessionMs: 61_500 },
      ingest: { accepted: 90, rejected: 10, ratio: 0.9 },
      bots: {
        reasons: [
          { label: "headless", value: 2, unit: "count" },
          { label: "datacenter", value: 1, unit: "count" },
        ],
      },
      topPages: [{ label: "/", value: 12, unit: "count" }],
      referrers: [{ label: "google", value: 0.5, unit: "ratio" }],
      release: { name: "r1", newIssues: 1 },
      lcp: 1800,
      errors: 1,
    });
  });

  test("posts reports with the public key and no bearer token", async () => {
    const memory = memoryFetch(() => Date.now() + 60 * 60_000);
    const client = createClient({
      endpoint: "https://api.example.com",
      project: "site",
      fetch: memory.send,
    });
    await client.bootstrap();
    const answer = await client.report([
      {
        at: "2026-10-04T10:00:00.000Z",
        outcome: "error",
        code: "RA_INGEST_FAILED",
        message: "RA_INGEST_FAILED offline",
        path: "/cars",
      },
    ]);
    expect(answer.ok).toBe(true);
    const sent = memory.calls.at(-1);
    expect(sent?.url).toBe("https://api.example.com/v2/projects/site/logs/client");
    expect(sent?.headers.get("x-project-key")).toBe("pk_site");
    expect(sent?.headers.get("authorization")).toBeNull();
    expect(JSON.parse(sent?.body ?? "")).toEqual({
      logs: [
        {
          kind: "transport",
          level: "error",
          message: "RA_INGEST_FAILED offline",
          data: { outcome: "rejected", code: "RA_INGEST_FAILED", path: "/cars" },
          ts: "2026-10-04T10:00:00.000Z",
        },
      ],
    });
  });

  test("returns failures as values", async () => {
    const memory = memoryFetch(() => Date.now() + 60 * 60_000);
    const client = createClient({
      endpoint: "https://api.example.com",
      project: "site",
      fetch: memory.send,
    });
    const answer = await client.speed();
    expect(answer.ok).toBe(false);
    if (!answer.ok) expect(answer.error.status).toBe(404);
    const unreachable = createClient({
      endpoint: "https://api.example.com",
      project: "site",
      fetch: async () => {
        throw new TypeError("offline");
      },
    });
    const failed = await unreachable.visitors();
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.error.kind).toBe("network");
  });
});
