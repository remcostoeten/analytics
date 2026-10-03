import { describe, expect, test } from "bun:test";

import type { Fetcher } from "@remcostoeten/analytics-shared/http";
import { ok } from "@remcostoeten/analytics-shared/result";

import { openStream, parseEvents } from "../src/client/stream";
import type { StreamState } from "../src/client/stream";

type Item = { id: string };

async function until(check: () => boolean) {
  for (let tries = 0; tries < 200 && !check(); tries += 1) await Bun.sleep(5);
}

describe("parseEvents", () => {
  test("splits complete events and keeps the rest", () => {
    const parsed = parseEvents(
      'retry: 2000\n\nid: c1\nevent: events\ndata: {"a":1}\n\n: comment\n\nid: c2\r\ndata: x\r\ndata: y\r\n\r\nid: c3',
    );
    expect(parsed.events).toEqual([
      { id: "c1", event: "events", data: '{"a":1}' },
      { id: "c2", event: "message", data: "x\ny" },
    ]);
    expect(parsed.rest).toBe("id: c3");
  });
});

describe("openStream", () => {
  test("reads server-sent events and reconnects with Last-Event-ID", async () => {
    const seen: string[] = [];
    const lastIds: (string | null)[] = [];
    const send: Fetcher = async (_url, init) => {
      lastIds.push(new Headers(init.headers).get("last-event-id"));
      const index = lastIds.length;
      const body = `id: c${index}\nevent: events\ndata: ${JSON.stringify({ data: [{ id: `e${index}` }], nextCursor: `c${index}` })}\n\n`;
      return new Response(body, { headers: { "content-type": "text/event-stream" } });
    };
    const stream = openStream<Item>({
      url: () => "https://api.example.com/v2/projects/site/logs",
      token: async () => ok("wt"),
      fetch: send,
      onItems: (items) => seen.push(...items.map((item) => item.id)),
      onState: () => undefined,
      retryMs: 5,
    });
    await until(() => seen.length >= 3);
    stream.stop();
    expect(seen.slice(0, 3)).toEqual(["e1", "e2", "e3"]);
    expect(lastIds.slice(0, 3)).toEqual([null, "c1", "c2"]);
  });

  test("falls back to long polling on after when the answer is not a stream", async () => {
    const urls: string[] = [];
    const states: StreamState[] = [];
    const seen: string[] = [];
    const send: Fetcher = async (url) => {
      urls.push(url);
      const after = new URL(url).searchParams.get("after");
      const next = String(Number(after ?? "0") + 1);
      return Response.json({ data: [{ id: `p${next}` }], nextCursor: next });
    };
    const stream = openStream<Item>({
      url: (cursor) => `https://api.example.com/logs${cursor ? `?after=${cursor}` : ""}`,
      token: async () => ok("wt"),
      fetch: send,
      onItems: (items) => seen.push(...items.map((item) => item.id)),
      onState: (state) => states.push(state),
      retryMs: 5,
    });
    await until(() => seen.length >= 2);
    stream.stop();
    expect(seen.slice(0, 2)).toEqual(["p1", "p2"]);
    expect(urls[2]).toBe("https://api.example.com/logs?after=1");
    expect(states).toContain("polling");
  });

  test("pauses while held and resumes from the last cursor", async () => {
    const urls: string[] = [];
    const send: Fetcher = async (url, init) => {
      urls.push(url);
      await new Promise<void>((resolve) => {
        init.signal?.addEventListener("abort", () => resolve());
        setTimeout(resolve, 20);
      });
      return Response.json({ data: [], nextCursor: "c9" });
    };
    const states: StreamState[] = [];
    const stream = openStream<Item>({
      url: (cursor) => `https://api.example.com/logs?after=${cursor ?? ""}`,
      token: async () => ok("wt"),
      fetch: send,
      onItems: () => undefined,
      onState: (state) => states.push(state),
      retryMs: 5,
    });
    await until(() => urls.length >= 3);
    stream.pause();
    const paused = urls.length;
    await Bun.sleep(60);
    expect(urls.length).toBe(paused);
    expect(states.at(-1)).toBe("paused");
    stream.resume();
    await until(() => urls.length > paused);
    stream.stop();
    expect(urls.at(-1)).toBe("https://api.example.com/logs?after=c9");
  });
});
