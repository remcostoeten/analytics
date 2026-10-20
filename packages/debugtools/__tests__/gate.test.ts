import { afterEach, describe, expect, test } from "bun:test";

import { isConsoleArmed, readConsoleGrant, saveConsoleGrant } from "@spoar/shared/console";

import { startConsole } from "../src/gate";
import type { GateOptions } from "../src/gate";

const api = "https://api.example.com";
type Posted = {
  type: string;
  project: string;
  token: string;
  expiresAt: string;
};

function later() {
  return new Date(Date.now() + 10 * 60_000).toISOString();
}

let stops: (() => void)[] = [];

function options(status: number, seen: string[] = [], popup: Window | null = null): GateOptions {
  return {
    endpoint: api,
    popup,
    fetch: async (input) => {
      seen.push(String(input));
      return new Response(
        JSON.stringify({ project: "site", token: "wt_cookie", expiresAt: later() }),
        {
          status,
        },
      );
    },
  };
}

function start(gate: GateOptions, calls: string[]) {
  const stop = startConsole(gate, async () => (mounted, grant) => {
    calls.push(`mount ${mounted.project} ${grant?.token} open=${mounted.open === true}`);
    return () => calls.push("unmount");
  });
  stops.push(stop);
  return stop;
}

async function settle() {
  for (let index = 0; index < 10; index++) await Promise.resolve();
}

afterEach(() => {
  for (const stop of stops) stop();
  stops = [];
  localStorage.clear();
  sessionStorage.clear();
});

describe("startConsole without a popup", () => {
  test("reopens with the grant this tab holds, without a request", async () => {
    saveConsoleGrant({ project: "site", token: "wt_stored", expiresAt: later() });
    const seen: string[] = [];
    const calls: string[] = [];
    start(options(200, seen), calls);
    await settle();
    expect(calls).toEqual(["mount site wt_stored open=false"]);
    expect(seen).toEqual([]);
  });

  test("asks the session route, keeps the grant and arms the browser", async () => {
    const seen: string[] = [];
    const calls: string[] = [];
    start(options(200, seen), calls);
    await settle();
    expect(seen).toEqual([`${api}/v2/widget/session`]);
    expect(calls).toEqual(["mount site wt_cookie open=false"]);
    expect(readConsoleGrant(new Date())?.token).toBe("wt_cookie");
    expect(isConsoleArmed()).toBe(true);
  });

  test("disarms the browser when the API refuses", async () => {
    localStorage.setItem("spoar.console", "site");
    const calls: string[] = [];
    start(options(401), calls);
    await settle();
    expect(calls).toEqual([]);
    expect(isConsoleArmed()).toBe(false);
  });

  test("mounts one console however often it starts", async () => {
    saveConsoleGrant({ project: "site", token: "wt_stored", expiresAt: later() });
    const calls: string[] = [];
    start(options(200), calls);
    start(options(200), calls);
    await settle();
    expect(calls).toEqual(["mount site wt_stored open=false"]);
  });
});

describe("startConsole with a popup", () => {
  function post(data: Posted, origin = api) {
    dispatchEvent(new MessageEvent("message", { data, origin, source: window }));
  }

  test("takes the grant the popup posts from the API's origin and opens the panel", async () => {
    const seen: string[] = [];
    const calls: string[] = [];
    start(options(200, seen, window), calls);
    post(
      { type: "spoar:console", project: "site", token: "wt_elsewhere", expiresAt: later() },
      "https://evil.example",
    );
    post({ type: "other", project: "site", token: "wt_other", expiresAt: later() });
    await settle();
    expect(calls).toEqual([]);
    post({ type: "spoar:console", project: "site", token: "wt_popup", expiresAt: later() });
    await settle();
    expect(calls).toEqual(["mount site wt_popup open=true"]);
    expect(seen).toEqual([]);
    expect(readConsoleGrant(new Date())?.token).toBe("wt_popup");
    expect(isConsoleArmed()).toBe(true);
  });
});
