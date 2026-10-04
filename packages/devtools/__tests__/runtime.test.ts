import { afterEach, describe, expect, test } from "bun:test";

import type { ClientLog, LiveServerMessage } from "@spoar/contract";
import type { Fetcher } from "@spoar/shared/http";
import type { Analytics } from "@spoar/sdk";

import { toBootstrap } from "../src/client/bootstrap";
import type { Connect, SocketEvents } from "../src/client/live";
import { createFixtureHandler, createFixtures, fixtureFetch } from "../src/fixtures/index";
import { readBootstrap, startDevtools } from "../src/loader/start";
import { createRuntime, timing } from "../src/panel/runtime";
import type { Runtime } from "../src/panel/runtime";

const endpoint = "https://api.example.com";
const running: Runtime[] = [];

afterEach(() => {
  for (const runtime of running.splice(0)) runtime.stop();
});

async function until(check: () => boolean) {
  for (let tries = 0; tries < 300 && !check(); tries += 1) await Bun.sleep(5);
}

type Hooks = Pick<Analytics, "on">;
type Handler = (...args: unknown[]) => void;

function fakeAnalytics() {
  const handlers: { [name: string]: Handler[] } = { error: [], send: [], drop: [] };
  const analytics: Hooks = {
    on: (name, handler) => {
      const list = handlers[name] ?? [];
      const stored = handler as Handler;
      list.push(stored);
      return () => {
        list.splice(list.indexOf(stored), 1);
      };
    },
  };
  return { ...analytics, handlers };
}

type Fake = {
  url: string;
  events: SocketEvents;
  sent: { [field: string]: string }[];
  closed: boolean;
};

function fakeSockets(opens = true) {
  const sockets: Fake[] = [];
  const connect: Connect = (url, events) => {
    const fake: Fake = { url, events, sent: [], closed: false };
    sockets.push(fake);
    queueMicrotask(() => (opens ? events.open() : events.close(1006)));
    return {
      send: (text) => fake.sent.push(JSON.parse(text)),
      close: () => {
        fake.closed = true;
      },
    };
  };
  function push(message: LiveServerMessage, index = sockets.length - 1) {
    sockets[index]?.events.message(JSON.stringify(message));
  }
  return { sockets, connect, push };
}

function bootstrapOf(now = Date.now()) {
  return toBootstrap(createFixtures(now).session);
}

describe("readBootstrap", () => {
  test("resolves the bootstrap on a 200 and null otherwise", async () => {
    const answer = await readBootstrap({ endpoint, project: "site", fetch: fixtureFetch() });
    expect(answer?.project).toEqual({
      id: "site",
      name: "noorderlicht-lease",
      release: "2026.10.03-a1",
    });
    expect(answer?.publicKey).toBe("pk_fixture");
    const denied: Fetcher = async () =>
      Response.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    expect(await readBootstrap({ endpoint, project: "site", fetch: denied })).toBeNull();
    const offline: Fetcher = async () => {
      throw new TypeError("offline");
    };
    expect(await readBootstrap({ endpoint, project: "site", fetch: offline })).toBeNull();
  });
});

describe("startDevtools", () => {
  test("never loads the panel for a visitor without a session", async () => {
    let loads = 0;
    const denied: Fetcher = async () => new Response(null, { status: 401 });
    startDevtools({ endpoint, project: "site", fetch: denied }, async () => {
      loads += 1;
      return () => () => undefined;
    });
    await Bun.sleep(20);
    expect(loads).toBe(0);
  });

  test("loads and mounts the panel after a 200, and unmounts it", async () => {
    let unmounted = false;
    const stop = startDevtools(
      { endpoint, project: "site", fetch: fixtureFetch() },
      async () => () => () => {
        unmounted = true;
      },
    );
    await Bun.sleep(20);
    stop();
    expect(unmounted).toBe(true);
  });
});

describe("createRuntime", () => {
  test("fills every buffer from the HTTP routes when live is off", async () => {
    const fixtures = createFixtures(Date.now());
    const runtime = createRuntime(toBootstrap(fixtures.session), {
      endpoint,
      project: "site",
      fetch: fixtureFetch({ liveMs: 20 }),
      live: false,
    });
    running.push(runtime);
    runtime.setOpen(true);
    await until(() => runtime.errors.get().loaded && runtime.visitors.get().loaded);
    expect(runtime.visitors.get().rows).toHaveLength(6);
    expect(runtime.visitors.get().rows[0]).toMatchObject({
      id: "v_8f2a1c3e9c1e",
      botScore: 0.04,
      durationMs: 242_000,
      trail: ["/", "/cars", "/cars/polestar-2"],
    });
    expect(runtime.sessions.get().rows).toHaveLength(6);
    expect(runtime.speed.get().rows[0]?.id).toBe("/");
    expect(runtime.errors.get().rows).toHaveLength(3);
    expect(runtime.live.get().overview?.online).toBe(6);
    const rejected = runtime.logs.get().rows.find((row) => row.id === "3");
    expect(rejected).toMatchObject({ outcome: "rejected", code: "RA_INGEST_REJECTED" });
    expect(rejected?.path).toBe("/contact");
    await until(() => runtime.logs.get().rows.length > fixtures.logs.length);
    expect(Number(runtime.logs.get().rows[0]?.id)).toBeGreaterThan(100);
    runtime.loadVisitor("v_a0f4d8e1c3a7");
    await until(() => Boolean(runtime.visitors.get().details.v_a0f4d8e1c3a7));
    expect(runtime.visitors.get().details.v_a0f4d8e1c3a7).toEqual({
      id: "v_a0f4d8e1c3a7",
      botScore: 0.92,
      verdict: "bot",
      signals: ["headless", "datacenterAsn"],
    });
  });

  test("shows SDK drops and errors in the logs and reports them only with widgetReports", async () => {
    const reports: ClientLog[][] = [];
    const handle = createFixtureHandler({ liveMs: 1000, now: () => Date.now() - 1000 });
    const send: Fetcher = async (url, init) => {
      const request = new Request(url, init);
      if (new URL(url).pathname.endsWith("/logs/client")) {
        const body: { logs: ClientLog[] } = await request.clone().json();
        reports.push(body.logs);
      }
      return handle(request);
    };
    const fixed = bootstrapOf();
    const bootstrap = { ...fixed, features: { ...fixed.features, reports: true } };
    const analytics = fakeAnalytics();
    const runtime = createRuntime(
      bootstrap,
      { endpoint, project: "site", fetch: send, analytics, live: false },
      { ...timing, report: 10 },
    );
    running.push(runtime);
    analytics.handlers.drop[0]?.(
      {
        id: "e1",
        name: "scroll_depth",
        type: "event",
        ts: new Date().toISOString(),
        props: {},
      } as never,
      "consent",
    );
    analytics.handlers.error[0]?.("RA_INGEST_FAILED", "503 from the API");
    const rows = runtime.logs.get().rows;
    expect(rows.map((row) => row.message)).toEqual([
      "RA_INGEST_FAILED 503 from the API",
      "scroll_depth dropped before send, reason consent",
    ]);
    expect(rows[0]?.code).toBe("RA_INGEST_FAILED");
    await until(() => reports.length > 0);
    expect(reports[0]?.map((report) => [report.kind, report.level, report.data?.outcome])).toEqual([
      ["pipeline", "info", "dropped"],
      ["transport", "error", "rejected"],
    ]);
    runtime.stop();
    expect(analytics.handlers.drop).toHaveLength(0);
  });

  test("keeps SDK outcomes local when widgetReports is off", async () => {
    let posted = 0;
    const handle = createFixtureHandler({ liveMs: 1000, now: () => Date.now() - 1000 });
    const send: Fetcher = async (url, init) => {
      if (new URL(url).pathname.endsWith("/logs/client")) posted += 1;
      return handle(new Request(url, init));
    };
    const analytics = fakeAnalytics();
    const runtime = createRuntime(bootstrapOf(), {
      endpoint,
      project: "site",
      fetch: send,
      analytics,
      live: false,
    });
    running.push(runtime);
    analytics.handlers.error[0]?.("RA_INGEST_FAILED", "offline");
    await Bun.sleep(50);
    expect(runtime.logs.get().rows[0]?.code).toBe("RA_INGEST_FAILED");
    expect(posted).toBe(0);
  });

  test("reads events, logs, visitors and sessions from the live socket", async () => {
    const fixtures = createFixtures(Date.now());
    const live = fakeSockets();
    const runtime = createRuntime(
      toBootstrap(fixtures.session),
      { endpoint, project: "site", fetch: fixtureFetch({ liveMs: 1000 }) },
      timing,
      live.connect,
    );
    running.push(runtime);
    await until(() => (live.sockets[0]?.sent.length ?? 0) > 0);
    expect(live.sockets[0]?.url).toBe("wss://api.example.com/v2/projects/site/live");
    expect(live.sockets[0]?.sent[0]).toEqual({ type: "auth", token: "wt_fixture" });
    live.push({
      type: "ready",
      project: "site",
      channels: ["events", "visitors", "sessions", "logs"],
      expiresAt: fixtures.session.expiresAt,
    });
    expect(live.sockets[0]?.sent.slice(1).map((message) => message.channel)).toEqual([
      "events",
      "logs",
      "visitors",
      "sessions",
    ]);
    expect(runtime.live.get().logs).toBe("live");
    live.push({ type: "sessions", data: fixtures.sessions });
    live.push({ type: "visitors", data: fixtures.visitors });
    expect(runtime.visitors.get().rows.find((row) => row.id === "v_e4c1803f2d9b")?.trail).toEqual([
      "/",
      "/cars",
      "/cars/kia-ev6",
      "/cars",
      "/cars/tesla-model-3",
    ]);
    expect(runtime.sessions.get().rows[1]?.botScore).toBe(0.92);
    live.push({ type: "logs", data: fixtures.logs, cursor: "7" });
    live.push({ type: "logs", data: fixtures.logs.slice(0, 2), cursor: "7" });
    expect(runtime.logs.get().rows).toHaveLength(7);
    live.push({ type: "events", data: [], cursor: "e1" });
    runtime.setLogPath("/cars");
    expect(live.sockets[0]?.sent.at(-1)).toEqual({ type: "unsubscribe", channel: "logs" });
    runtime.setLogPath(null);
    expect(live.sockets[0]?.sent.at(-1)).toEqual({
      type: "subscribe",
      channel: "logs",
      after: "7",
    });
    runtime.stop();
    expect(live.sockets[0]?.closed).toBe(true);
  });

  test("fetches a new token and reconnects when the socket closes with 4001", async () => {
    let sessions = 0;
    const handle = createFixtureHandler({ liveMs: 1000 });
    const send: Fetcher = async (url, init) => {
      if (new URL(url).pathname === "/v2/widget/session") sessions += 1;
      return handle(new Request(url, init));
    };
    const live = fakeSockets();
    const runtime = createRuntime(
      bootstrapOf(),
      { endpoint, project: "site", fetch: send },
      timing,
      live.connect,
    );
    running.push(runtime);
    await until(() => (live.sockets[0]?.sent.length ?? 0) > 0);
    live.push({ type: "ready", project: "site", channels: ["events"], expiresAt: null });
    live.push({ type: "events", data: [], cursor: "c9" });
    live.sockets[0]?.events.close(4001);
    await until(() => (live.sockets[1]?.sent.length ?? 0) > 0);
    expect(sessions).toBe(1);
    expect(live.sockets[1]?.sent[0]).toEqual({ type: "auth", token: "wt_fixture" });
    live.push({ type: "ready", project: "site", channels: ["events"], expiresAt: null });
    expect(live.sockets[1]?.sent[1]).toEqual({ type: "subscribe", channel: "events", after: "c9" });
  });

  test("falls back to streams and polling when the socket never opens", async () => {
    const live = fakeSockets(false);
    const runtime = createRuntime(
      bootstrapOf(),
      { endpoint, project: "site", fetch: fixtureFetch({ liveMs: 20 }) },
      { ...timing, retry: 5 },
      live.connect,
    );
    running.push(runtime);
    runtime.setOpen(true);
    await until(() => runtime.visitors.get().rows.length > 0 && runtime.logs.get().rows.length > 0);
    expect(live.sockets).toHaveLength(2);
    expect(runtime.visitors.get().rows).toHaveLength(6);
    expect(runtime.logs.get().rows.length).toBeGreaterThanOrEqual(7);
  });
});
