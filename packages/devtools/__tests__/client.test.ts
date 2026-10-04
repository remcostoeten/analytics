import { describe, expect, test } from "bun:test";

import type { Fetcher } from "@spoar/shared/http";

import { createClient, refreshAheadMs } from "../src/client/client";
import type { Bootstrap } from "../src/client/types";

type Call = { url: string; headers: Headers; credentials: RequestCredentials | undefined };

function memoryFetch(expiresIn: () => number) {
  const calls: Call[] = [];
  let issued = 0;
  const send: Fetcher = async (url, init) => {
    calls.push({
      url,
      headers: new Headers(init.headers),
      credentials: init.credentials,
    });
    const path = new URL(url).pathname;
    if (path === "/v2/widget/session") {
      issued += 1;
      const data: Bootstrap = {
        token: `wt_${issued}`,
        expiresAt: new Date(expiresIn()).toISOString(),
        project: { id: "site", name: "site", environment: "production" },
        user: { name: "admin" },
        widgetReports: false,
      };
      await Bun.sleep(5);
      return Response.json({ data });
    }
    if (path.endsWith("/overview")) return Response.json({ data: { online: 3 } });
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
      project: { id: "site", name: "site", environment: "production" },
      user: { name: "admin" },
      widgetReports: false,
    };
    const client = createClient(
      { endpoint: "https://api.example.com", project: "site", fetch: memory.send, now: () => now },
      initial,
    );
    await client.overview();
    expect(memory.calls).toHaveLength(1);
    expect(memory.calls[0]?.headers.get("authorization")).toBe("Bearer wt_initial");
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
