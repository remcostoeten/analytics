import type { Fetcher, Json } from "@spoar/shared/http";
import { noop } from "@spoar/shared/noop";
import type { Nullable } from "@spoar/shared/semantic";

import type { ClientResult } from "./client";

export type StreamState = "connecting" | "live" | "polling" | "paused" | "offline";

export type ServerEvent = {
  id: Nullable<string>;
  event: string;
  data: string;
};

export type StreamOptions<Item> = {
  url: (cursor: Nullable<string>) => string;
  token: () => ClientResult<string>;
  fetch?: Fetcher;
  onItems: (items: Item[]) => void;
  onState: (state: StreamState) => void;
  retryMs?: number;
};

export type Stream = {
  pause: () => void;
  resume: () => void;
  stop: () => void;
};

type Batch<Item> = { data: Item[]; nextCursor: Nullable<string> };

const pollTimeoutMs = 35_000;
const failuresBeforePolling = 2;
const quickMs = 1000;

/**
 * @name parseEvents
 * @description Splits server-sent event text into complete events and the unfinished rest, so
 * a stream can be read in arbitrary chunks. `retry:` lines and comments are skipped.
 *
 * @example
 * parseEvents("id: c1\nevent: events\ndata: {}\n\nid: c2");
 * // { events: [{ id: "c1", event: "events", data: "{}" }], rest: "id: c2" }
 */
export function parseEvents(text: string): { events: ServerEvent[]; rest: string } {
  const blocks = text.replaceAll("\r\n", "\n").split("\n\n");
  const rest = blocks.pop() ?? "";
  const events: ServerEvent[] = [];
  for (const block of blocks) {
    let id: Nullable<string> = null;
    let event = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      const colon = line.indexOf(":");
      if (colon <= 0) continue;
      const field = line.slice(0, colon);
      const value = line.slice(colon + 1).replace(/^ /, "");
      if (field === "id") id = value;
      if (field === "event") event = value;
      if (field === "data") data.push(value);
    }
    if (data.length > 0) events.push({ id, event, data: data.join("\n") });
  }
  return { events, rest };
}

function readBatch<Item>(text: string): Nullable<Batch<Item>> {
  try {
    const value: Json = JSON.parse(text);
    if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
    // The API checks every answer against the contract before sending it (decision 10).
    return value as Batch<Item>;
  } catch {
    return null;
  }
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    function done() {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    }
    const timer = setTimeout(done, ms);
    signal.addEventListener("abort", done, { once: true });
  });
}

/**
 * @name openStream
 * @description Follows a live route such as `realtime/events` or `logs`: server-sent events
 * first, reconnecting with `Last-Event-ID`, and long polling on `after` when streaming fails
 * twice or the answer is not an event stream. It pauses while the tab is hidden and resumes
 * from the last cursor when it is visible again.
 *
 * @example
 * const stream = openStream({ url: (cursor) => `${base}/logs?after=${cursor ?? ""}`, token, onItems, onState });
 * stream.stop();
 */
export function openStream<Item>(options: StreamOptions<Item>): Stream {
  const send: Fetcher = options.fetch ?? ((url, init) => fetch(url, init));
  const retryMs = options.retryMs ?? 2000;
  let cursor: Nullable<string> = null;
  let mode: "stream" | "poll" = "stream";
  let failures = 0;
  let stopped = false;
  let hidden = false;
  let held = false;
  let controller = new AbortController();
  let wake: () => void = noop;

  function deliver(batch: Nullable<Batch<Item>>) {
    if (!batch) return false;
    if (batch.nextCursor) cursor = batch.nextCursor;
    if (batch.data.length === 0) return false;
    options.onItems(batch.data);
    return true;
  }

  async function streamOnce(token: string, signal: AbortSignal) {
    const headers: { [name: string]: string } = {
      accept: "text/event-stream",
      authorization: `Bearer ${token}`,
    };
    if (cursor) headers["last-event-id"] = cursor;
    const response = await send(options.url(null), { headers, signal });
    if (signal.aborted) return false;
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !type.includes("text/event-stream") || !response.body) {
      mode = "poll";
      return true;
    }
    options.onState("live");
    failures = 0;
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    let delivered = false;
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) return delivered;
      const parsed = parseEvents(buffer + chunk.value);
      buffer = parsed.rest;
      for (const event of parsed.events) {
        if (event.event === "error") continue;
        delivered = deliver(readBatch<Item>(event.data)) || delivered;
        if (event.id) cursor = event.id;
      }
    }
  }

  async function pollOnce(token: string, signal: AbortSignal) {
    const timeout = AbortSignal.any([signal, AbortSignal.timeout(pollTimeoutMs)]);
    const response = await send(options.url(cursor), {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
      signal: timeout,
    });
    if (!response.ok) throw new Error(`answered ${response.status}`);
    const text = await response.text();
    if (signal.aborted) return false;
    options.onState("polling");
    return deliver(readBatch<Item>(text));
  }

  async function run() {
    while (!stopped) {
      if (hidden || held) {
        await new Promise<void>((resolve) => {
          wake = resolve;
        });
        continue;
      }
      const signal = controller.signal;
      const token = await options.token();
      if (!token.ok) {
        options.onState("offline");
        await wait(retryMs * 2, signal);
        continue;
      }
      try {
        const started = Date.now();
        const delivered =
          mode === "stream"
            ? await streamOnce(token.value, signal)
            : await pollOnce(token.value, signal);
        const quick = Date.now() - started < quickMs;
        await wait(quick && !delivered ? retryMs : 0, signal);
      } catch {
        if (signal.aborted) continue;
        failures += 1;
        if (failures >= failuresBeforePolling) mode = "poll";
        options.onState("offline");
        await wait(retryMs, signal);
      }
    }
  }

  function update(nextHidden: boolean, nextHeld: boolean) {
    const was = hidden || held;
    hidden = nextHidden;
    held = nextHeld;
    const now = hidden || held;
    if (stopped || was === now) return;
    if (now) {
      options.onState("paused");
      controller.abort();
      return;
    }
    controller = new AbortController();
    options.onState("connecting");
    wake();
  }

  function onVisibility() {
    update(document.visibilityState === "hidden", held);
  }

  document.addEventListener("visibilitychange", onVisibility);
  options.onState("connecting");
  void run();

  return {
    pause: () => update(hidden, true),
    resume: () => update(hidden, false),
    stop: () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisibility);
      controller.abort();
      wake();
    },
  };
}
