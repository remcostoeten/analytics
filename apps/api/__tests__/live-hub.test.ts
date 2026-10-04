import { describe, expect, test } from "bun:test";

import type { LiveEvent, LiveServerMessage, LiveSession } from "@spoar/contract";
import { engineError } from "@spoar/engine";
import { err, ok } from "@spoar/shared/result";

import { createHub } from "../src/modules/live/hub";
import type { HubSources } from "../src/modules/live/hub";

function event(index: number): LiveEvent {
  return {
    id: String(index),
    project: "docs",
    name: "pageview",
    ts: "2026-10-04T10:00:00.000Z",
    path: `/page-${index}`,
    country: null,
    device: "desktop",
  };
}

function session(pages: number): LiveSession {
  return {
    id: "s1",
    visitor: "v1",
    startedAt: "2026-10-04T10:00:00.000Z",
    lastSeen: "2026-10-04T10:00:00.000Z",
    trail: ["/"],
    pages,
    events: pages,
    durationMs: 0,
    referrer: null,
    country: null,
    device: "desktop",
    botScore: 0,
    signal: "human",
  };
}

function settle(ms = 40) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sources() {
  const events: LiveEvent[] = [event(1), event(2)];
  const calls = { events: 0, sessions: 0 };
  let pages = 1;
  let failing = false;
  const fake: HubSources = {
    events: async (_, __, after, wait) => {
      calls.events += 1;
      if (after === null) return ok({ data: events.slice(-50), cursor: String(events.length) });
      if (events.length === Number(after) && wait.ms > 0) await settle(5);
      return ok({ data: events.slice(Number(after)), cursor: String(events.length) });
    },
    logs: async () => ok({ data: [], cursor: "0" }),
    visitors: async () => ok([]),
    sessions: async () => {
      calls.sessions += 1;
      return failing ? err(engineError("UNAVAILABLE", "down")) : ok([session(pages)]);
    },
  };
  return {
    fake,
    calls,
    add: (index: number) => events.push(event(index)),
    setPages: (value: number) => {
      pages = value;
    },
    fail: () => {
      failing = true;
    },
  };
}

function inbox() {
  const messages: LiveServerMessage[] = [];
  return { messages, send: (message: LiveServerMessage) => messages.push(message) };
}

const options = { waitMs: 20, snapshotMs: 10, retryMs: 10 };

describe("createHub", () => {
  test("subscribers of one topic share one poller and each get every new batch once", async () => {
    const source = sources();
    const hub = createHub(source.fake, options);
    const first = inbox();
    const second = inbox();
    const base = { project: "docs", channel: "events" as const, detailed: false, after: null };
    await hub.join({ ...base, id: "a", send: first.send });
    await hub.join({ ...base, id: "b", send: second.send });
    expect(hub.size()).toBe(1);
    expect(first.messages[0]).toEqual({ type: "events", data: [event(1), event(2)], cursor: "2" });
    await settle();
    source.add(3);
    await settle();
    for (const box of [first, second]) {
      expect(box.messages.filter((message) => message.type === "events").at(-1)).toEqual({
        type: "events",
        data: [event(3)],
        cursor: "3",
      });
    }
    hub.leave("a", null);
    hub.leave("b", null);
    expect(hub.size()).toBe(0);
  });

  test("a subscriber with a cursor gets what it missed first", async () => {
    const source = sources();
    const hub = createHub(source.fake, options);
    source.add(3);
    const box = inbox();
    await hub.join({
      id: "a",
      project: "docs",
      channel: "events",
      detailed: true,
      after: "1",
      send: box.send,
    });
    expect(box.messages[0]).toEqual({
      type: "events",
      data: [event(2), event(3)],
      cursor: "3",
    });
    hub.leave("a", "events");
    expect(hub.size()).toBe(0);
  });

  test("snapshots are published when they change, and failures as errors", async () => {
    const source = sources();
    const hub = createHub(source.fake, options);
    const box = inbox();
    await hub.join({
      id: "a",
      project: "docs",
      channel: "sessions",
      detailed: true,
      after: null,
      send: box.send,
    });
    await settle();
    const before = box.messages.length;
    await settle();
    expect(box.messages.length).toBe(before);
    source.setPages(4);
    await settle();
    expect(box.messages.at(-1)).toEqual({ type: "sessions", data: [session(4)] });
    source.fail();
    await settle();
    expect(box.messages.at(-1)).toEqual({
      type: "error",
      code: "UNAVAILABLE",
      message: "down",
      channel: "sessions",
    });
    hub.leave("a", null);
    const calls = source.calls.sessions;
    await settle();
    expect(source.calls.sessions).toBe(calls);
  });
});
