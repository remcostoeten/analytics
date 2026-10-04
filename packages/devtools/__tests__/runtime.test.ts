import { afterEach, describe, expect, test } from "bun:test";

import type { Fetcher } from "@spoar/shared/http";
import type { Analytics } from "@spoar/sdk";

import type { ClientReport } from "../src/client/types";
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

describe("readBootstrap", () => {
  test("resolves the bootstrap on a 200 and null otherwise", async () => {
    const answer = await readBootstrap({ endpoint, project: "site", fetch: fixtureFetch() });
    expect(answer?.project.id).toBe("site");
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
  test("fills every buffer from the API once the panel opens", async () => {
    const fixtures = createFixtures(Date.now());
    const runtime = createRuntime(fixtures.bootstrap, {
      endpoint,
      project: "site",
      fetch: fixtureFetch({ liveMs: 20 }),
    });
    running.push(runtime);
    runtime.setOpen(true);
    await until(() => runtime.errors.get().loaded && runtime.visitors.get().loaded);
    expect(runtime.visitors.get().rows).toHaveLength(6);
    expect(runtime.sessions.get().rows).toHaveLength(6);
    expect(runtime.speed.get().rows[0]?.id).toBe("/");
    expect(runtime.errors.get().rows).toHaveLength(3);
    expect(runtime.live.get().overview?.online).toBe(27);
    await until(() => runtime.logs.get().rows.length > fixtures.logs.length);
    expect(runtime.logs.get().rows[0]?.id).toMatch(/^live_/);
    runtime.loadVisitor("v_a0f4d8e1c3a7");
    await until(() => Boolean(runtime.visitors.get().details.v_a0f4d8e1c3a7));
    expect(runtime.visitors.get().details.v_a0f4d8e1c3a7?.botScore).toBe(0.92);
  });

  test("shows SDK drops and errors in the logs and reports them only with widgetReports", async () => {
    const reports: ClientReport[][] = [];
    const handle = createFixtureHandler({ liveMs: 1000, now: () => Date.now() - 1000 });
    const send: Fetcher = async (url, init) => {
      const request = new Request(url, init);
      if (new URL(url).pathname.endsWith("/logs/client")) {
        const body: { entries: ClientReport[] } = await request.clone().json();
        reports.push(body.entries);
      }
      return handle(request);
    };
    const bootstrap = { ...createFixtures(Date.now()).bootstrap, widgetReports: true };
    const analytics = fakeAnalytics();
    const runtime = createRuntime(
      bootstrap,
      { endpoint, project: "site", fetch: send, analytics },
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
    expect(reports[0]?.map((report) => report.outcome)).toEqual(["dropped", "error"]);
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
    const runtime = createRuntime(createFixtures(Date.now()).bootstrap, {
      endpoint,
      project: "site",
      fetch: send,
      analytics,
    });
    running.push(runtime);
    analytics.handlers.error[0]?.("RA_INGEST_FAILED", "offline");
    await Bun.sleep(50);
    expect(runtime.logs.get().rows[0]?.code).toBe("RA_INGEST_FAILED");
    expect(posted).toBe(0);
  });
});
