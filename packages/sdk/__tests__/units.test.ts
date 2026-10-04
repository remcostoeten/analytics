import { beforeEach, describe, expect, test } from "bun:test";

import { maxBodyBytes as contractMaxBodyBytes } from "@spoar/contract";
import type { WireEvent } from "@spoar/contract";

import { limitProps } from "../src/core/build-event";
import { debugFlag, privacySignal } from "../src/core/environment";
import { createIdentity } from "../src/core/identity";
import { createQueue, maxBodyBytes } from "../src/core/queue";
import { createSavedStore } from "../src/core/storage";
import type { SendResult } from "../src/core/types";
import { uuidv7 } from "../src/core/uuid";
import { beacon, ingestUrl, retryAfter } from "../src/transports/beacon";
import { fresh } from "./helpers";

beforeEach(fresh);

describe("limitProps", () => {
  test.each([
    [
      "keeps primitives",
      { a: "x", b: 1, c: true, d: null },
      { a: "x", b: 1, c: true, d: null },
      [],
    ],
    ["drops nested values", { a: { b: 1 }, c: [1] }, {}, ["a", "c"]],
    ["cuts long strings", { a: "y".repeat(300) }, { a: "y".repeat(255) }, ["a"]],
    ["drops long keys", { ["k".repeat(256)]: 1 }, {}, ["k".repeat(32)]],
    ["skips undefined", { a: undefined, b: 2 }, { b: 2 }, []],
  ])("%s", (_, input, props, problems) => {
    expect(limitProps(input)).toEqual({ props, problems });
  });

  test("keeps at most 25 props", () => {
    const input = Object.fromEntries(
      Array.from({ length: 27 }, (_, index) => [`p${index}`, index]),
    );
    const limited = limitProps(input);
    expect(Object.keys(limited.props)).toHaveLength(25);
    expect(limited.problems).toEqual(["p25", "p26"]);
  });
});

describe("uuidv7", () => {
  test("is a version 7 UUID that sorts by time", () => {
    const early = uuidv7(Date.UTC(2026, 8, 27, 16, 40));
    const late = uuidv7(Date.UTC(2026, 8, 27, 16, 41));
    expect(early).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(early < late).toBe(true);
    expect(early.slice(0, 13)).toBe("01a0e3bc-db00");
  });
});

describe("createSavedStore", () => {
  test("migrates the 1.x keys into __ra and removes them", () => {
    localStorage.setItem("__analytics_visitor_id", "legacy-visitor");
    localStorage.setItem("__analytics_opt_out", "true");
    localStorage.setItem("__analytics_identity", "user_1");
    localStorage.setItem("__analytics_user_props", JSON.stringify({ plan: "pro" }));
    localStorage.setItem("__analytics_experiments", JSON.stringify({ hero: "b" }));
    localStorage.setItem("__analytics_queue__", "[]");
    const saved = createSavedStore(localStorage, () => true);
    expect(saved.read()).toEqual({
      visitor: "legacy-visitor",
      optOut: true,
      userId: "user_1",
      traits: { plan: "pro" },
      experiments: { hero: "b" },
    });
    saved.write({});
    expect(Object.keys(localStorage).filter((key) => key.startsWith("__analytics"))).toEqual([]);
    expect(JSON.parse(localStorage.getItem("__ra") ?? "{}").visitor).toBe("legacy-visitor");
  });

  test("keeps values in memory while not allowed, but always records a decision", () => {
    const saved = createSavedStore(localStorage, () => false);
    saved.write({ visitor: "v" });
    expect(saved.read().visitor).toBe("v");
    expect(localStorage.getItem("__ra")).toBeNull();
    saved.write({ consent: "denied" }, true);
    expect(JSON.parse(localStorage.getItem("__ra") ?? "{}")).toEqual({ consent: "denied" });
  });

  test("reads the 1.x keys before consent but moves them only once allowed", () => {
    localStorage.setItem("__analytics_visitor_id", "legacy-visitor");
    let allowed = false;
    const saved = createSavedStore(localStorage, () => allowed);
    saved.write({});
    expect(saved.read().visitor).toBe("legacy-visitor");
    expect(localStorage.getItem("__ra")).toBeNull();
    expect(localStorage.getItem("__analytics_visitor_id")).toBe("legacy-visitor");
    allowed = true;
    saved.write({ consent: "granted" });
    expect(JSON.parse(localStorage.getItem("__ra") ?? "{}")).toEqual({
      visitor: "legacy-visitor",
      consent: "granted",
    });
    expect(localStorage.getItem("__analytics_visitor_id")).toBeNull();
  });

  test("a tab opened before a revoke elsewhere keeps the denial and writes nothing", () => {
    function tab() {
      const saved = createSavedStore(localStorage, () => saved.read().consent !== "denied");
      return saved;
    }
    const stale = tab();
    stale.write({ visitor: "v" });
    const other = tab();
    other.drop(["visitor"]);
    other.write({ consent: "denied" }, true);
    stale.write({ userId: "user_1" });
    expect(stale.read().consent).toBe("denied");
    expect(JSON.parse(localStorage.getItem("__ra") ?? "{}")).toEqual({ consent: "denied" });
  });

  test("a write changes only its own fields and refresh takes over another tab's decisions", () => {
    const first = createSavedStore(localStorage, () => true);
    const second = createSavedStore(localStorage, () => true);
    first.write({ visitor: "v", debug: true }, true);
    second.write({ userId: "user_1" });
    expect(JSON.parse(localStorage.getItem("__ra") ?? "{}")).toEqual({
      visitor: "v",
      debug: true,
      userId: "user_1",
    });
    second.write({ optOut: true }, true);
    first.refresh();
    expect(first.read()).toMatchObject({ optOut: true, debug: true });
  });

  test("survives storage that throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => undefined,
    };
    const saved = createSavedStore(broken, () => true);
    saved.write({ visitor: "v" });
    expect(saved.read()).toEqual({ visitor: "v" });
  });
});

describe("createIdentity", () => {
  test("keeps a session for 30 idle minutes and starts a new one after", () => {
    let time = Date.UTC(2026, 8, 27, 12);
    const saved = createSavedStore(localStorage, () => true);
    const identity = createIdentity(
      saved,
      sessionStorage,
      () => time,
      () => true,
    );
    const first = identity.session();
    time += 29 * 60 * 1000;
    expect(identity.session()).toBe(first);
    time += 29 * 60 * 1000;
    expect(identity.session()).toBe(first);
    time += 31 * 60 * 1000;
    expect(identity.session()).not.toBe(first);
    expect(identity.visitor()).toBe(identity.visitor());
  });

  test("carries over a 1.x session id", () => {
    sessionStorage.setItem("__analytics_session_id", "legacy-session");
    const saved = createSavedStore(localStorage, () => true);
    const identity = createIdentity(saved, sessionStorage, Date.now, () => true);
    expect(identity.session()).toBe("legacy-session");
    expect(sessionStorage.getItem("__analytics_session_id")).toBeNull();
  });
});

function event(id: string): WireEvent {
  return {
    id,
    name: "pageview",
    ts: "2026-09-27T16:39:58.412Z",
    visitor: "v",
    session: "s",
    page: { path: "/" },
    props: {},
  };
}

function scripted(results: SendResult[]) {
  const calls: { ids: string[]; unloading: boolean }[] = [];
  return {
    calls,
    transport: {
      send: async (envelope: { events: WireEvent[] }, unloading: boolean): Promise<SendResult> => {
        calls.push({ ids: envelope.events.map((item) => item.id), unloading });
        return (
          results.shift() ?? {
            ok: true,
            result: { accepted: envelope.events.length, duplicates: 0, rejected: [] },
          }
        );
      },
    },
  };
}

function queueWith(results: SendResult[]) {
  const waits: number[] = [];
  const persisted: string[] = [];
  const failures: number[] = [];
  const scheduled: (() => void)[] = [];
  const { calls, transport } = scripted(results);
  const queue = createQueue({
    transport,
    now: () => Date.UTC(2026, 8, 27),
    wait: async (ms) => {
      waits.push(ms);
    },
    schedule: (run) => {
      scheduled.push(run);
      return () => undefined;
    },
    onSend: () => undefined,
    onFailure: (_, status) => failures.push(status),
    persist: (events) => persisted.push(...events.map((item) => item.id)),
  });
  return { queue, calls, waits, persisted, scheduled, failures };
}

describe("createQueue", () => {
  test("sends a batch of 20 at once and the rest on the 5 second timer", async () => {
    const { queue, calls, scheduled } = queueWith([]);
    for (let index = 0; index < 21; index += 1) queue.add(event(`e${index}`));
    await Promise.resolve();
    expect(calls[0]?.ids).toHaveLength(20);
    scheduled[0]?.();
    await queue.flush();
    expect(calls.flatMap((call) => call.ids)).toHaveLength(21);
  });

  test("retries a 5xx after 1, 4 and 16 seconds with the same ids, then persists", async () => {
    const failure: SendResult = { ok: false, retry: true, status: 503 };
    const { queue, calls, waits, persisted } = queueWith([failure, failure, failure, failure]);
    queue.add(event("a"));
    expect(await queue.flush()).toEqual({ accepted: 0, duplicates: 0, failed: 1 });
    expect(waits).toEqual([1000, 4000, 16_000]);
    expect(calls.map((call) => call.ids)).toEqual([["a"], ["a"], ["a"], ["a"]]);
    expect(persisted).toEqual(["a"]);
  });

  test("a retry that succeeds counts as accepted", async () => {
    const { queue } = queueWith([{ ok: false, retry: true, status: 0 }]);
    queue.add(event("a"));
    expect(await queue.flush()).toEqual({ accepted: 1, duplicates: 0, failed: 0 });
  });

  test("a 4xx is dropped without retries or persisting", async () => {
    const { queue, waits, persisted } = queueWith([{ ok: false, retry: false, status: 400 }]);
    queue.add(event("a"));
    await queue.flush();
    expect(waits).toEqual([]);
    expect(persisted).toEqual([]);
  });

  test("waits for Retry-After, capped at 16 seconds", async () => {
    const { queue, waits } = queueWith([
      { ok: false, retry: true, status: 429, after: 2500 },
      { ok: false, retry: true, status: 429, after: 120_000 },
    ]);
    queue.add(event("a"));
    expect(await queue.flush()).toEqual({ accepted: 1, duplicates: 0, failed: 0 });
    expect(waits).toEqual([2500, 16_000]);
  });

  test("keeps each body under the API's limit and drops a single event over it", async () => {
    expect(maxBodyBytes).toBe(contractMaxBodyBytes);
    const { queue, calls, failures } = queueWith([]);
    function big(id: string, size: number): WireEvent {
      return { ...event(id), props: { blob: "x".repeat(size) } };
    }
    for (let index = 0; index < 6; index += 1) queue.add(big(`e${index}`, 25_000));
    queue.add(big("huge", maxBodyBytes));
    expect(await queue.flush()).toEqual({ accepted: 6, duplicates: 0, failed: 1 });
    expect(calls.map((call) => call.ids.length)).toEqual([2, 2, 2]);
    expect(calls.flatMap((call) => call.ids)).not.toContain("huge");
    expect(failures).toEqual([413]);
  });

  test("an unload during a retry backoff sends the waiting batch and cancels its retry", async () => {
    const { calls, transport } = scripted([{ ok: false, retry: true, status: 503 }]);
    const persisted: string[] = [];
    let resume: () => void = () => undefined;
    const queue = createQueue({
      transport,
      now: () => Date.UTC(2026, 8, 27),
      wait: () =>
        new Promise((resolve) => {
          resume = resolve;
        }),
      schedule: () => () => undefined,
      onSend: () => undefined,
      onFailure: () => undefined,
      persist: (events) => persisted.push(...events.map((item) => item.id)),
    });
    queue.add(event("a"));
    const first = queue.flush();
    await Bun.sleep(0);
    await queue.flush(true);
    resume();
    await first;
    expect(calls).toEqual([
      { ids: ["a"], unloading: false },
      { ids: ["a"], unloading: true },
    ]);
    expect(persisted).toEqual([]);
  });

  test("while unloading a batch is sent once", async () => {
    const { queue, calls, waits } = queueWith([{ ok: false, retry: true, status: 0 }]);
    queue.add(event("a"));
    await queue.flush(true);
    expect(calls).toEqual([{ ids: ["a"], unloading: true }]);
    expect(waits).toEqual([]);
  });
});

describe("beacon", () => {
  const envelope = { v: 1 as const, sentAt: "2026-09-27T16:40:00.000Z", events: [event("a")] };

  test("puts the key in the URL and leaves it out when empty", () => {
    expect(ingestUrl("/_ra", "")).toBe("/_ra");
    expect(ingestUrl("/_ra", "pk live")).toBe("/_ra?key=pk%20live");
    expect(ingestUrl("https://api.example.test/v2/events?x=1", "pk")).toBe(
      "https://api.example.test/v2/events?x=1&key=pk",
    );
  });

  test("posts text/plain with keepalive and reads the result", async () => {
    const requests: { url: string; init: RequestInit }[] = [];
    const transport = beacon({
      endpoint: "/_ra",
      key: "pk",
      fetch: async (url, init) => {
        requests.push({ url, init });
        return new Response(JSON.stringify({ accepted: 1, duplicates: 0, rejected: [] }), {
          status: 202,
        });
      },
    });
    expect(await transport.send(envelope, false)).toEqual({
      ok: true,
      result: { accepted: 1, duplicates: 0, rejected: [] },
    });
    expect(requests[0]?.url).toBe("/_ra?key=pk");
    expect(requests[0]?.init).toMatchObject({
      method: "POST",
      keepalive: true,
      headers: { "content-type": "text/plain;charset=UTF-8" },
    });
    const body = requests[0]?.init.body;
    expect(JSON.parse(typeof body === "string" ? body : "")).toEqual(envelope);
  });

  test.each([
    [503, true],
    [429, true],
    [400, false],
    [413, false],
  ])("HTTP %i retry is %p", async (status, retry) => {
    const transport = beacon({
      endpoint: "/_ra",
      key: "pk",
      fetch: async () => new Response("{}", { status }),
    });
    expect(await transport.send(envelope, false)).toEqual({ ok: false, retry, status });
  });

  test("reads Retry-After as seconds or an HTTP date", async () => {
    const now = Date.parse("2026-09-30T12:00:00Z");
    expect(retryAfter("7", now)).toBe(7000);
    expect(retryAfter("Wed, 30 Sep 2026 12:01:00 GMT", now)).toBe(60_000);
    expect(retryAfter("Wed, 30 Sep 2026 11:00:00 GMT", now)).toBeUndefined();
    expect(retryAfter("soon", now)).toBeUndefined();
    expect(retryAfter(null, now)).toBeUndefined();
    const transport = beacon({
      endpoint: "/_ra",
      key: "pk",
      fetch: async () => new Response("{}", { status: 429, headers: { "retry-after": "30" } }),
    });
    expect(await transport.send(envelope, false)).toEqual({
      ok: false,
      retry: true,
      status: 429,
      after: 30_000,
    });
  });

  test("a network error is retryable", async () => {
    const transport = beacon({
      endpoint: "/_ra",
      key: "pk",
      fetch: async () => {
        throw new TypeError("Failed to fetch");
      },
    });
    expect(await transport.send(envelope, false)).toEqual({ ok: false, retry: true, status: 0 });
  });

  test("uses sendBeacon while unloading and falls back to fetch when it is refused", async () => {
    let fetched = 0;
    const beacons: string[] = [];
    async function fetcher() {
      fetched += 1;
      return new Response(JSON.stringify({ accepted: 1, duplicates: 0, rejected: [] }), {
        status: 202,
      });
    }
    const accepting = beacon({
      endpoint: "/_ra",
      key: "pk",
      fetch: fetcher,
      sendBeacon: (url) => beacons.push(url) > 0,
    });
    expect((await accepting.send(envelope, true)).ok).toBe(true);
    expect([beacons, fetched]).toEqual([["/_ra?key=pk"], 0]);
    const refusing = beacon({
      endpoint: "/_ra",
      key: "pk",
      fetch: fetcher,
      sendBeacon: () => false,
    });
    await refusing.send(envelope, true);
    expect(fetched).toBe(1);
  });
});

describe("environment", () => {
  test("?ra=debug turns debug on, ?ra=nodebug off, anything else leaves it", () => {
    history.replaceState(null, "", "/?ra=debug");
    expect(debugFlag()).toBe(true);
    history.replaceState(null, "", "/?ra=nodebug");
    expect(debugFlag()).toBe(false);
    history.replaceState(null, "", "/");
    expect(debugFlag()).toBeNull();
  });

  test.each([
    ["Do Not Track", { doNotTrack: "1" }, true],
    ["Global Privacy Control", { globalPrivacyControl: true }, true],
    ["neither", { doNotTrack: "unspecified", globalPrivacyControl: false }, false],
    ["no navigator", undefined, false],
  ])("privacySignal with %s", (_, browser, expected) => {
    expect(privacySignal(browser)).toBe(expected);
  });
});
