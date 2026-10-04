import type {
  ActiveVisitor,
  LiveChannel,
  LiveEvent,
  LiveServerMessage,
  LiveSession,
  LogLine,
} from "@spoar/contract";
import type { EngineError } from "@spoar/engine";
import type { Result } from "@spoar/shared/result";
import type { Nullable } from "@spoar/shared/semantic";

type Wait = { ms: number; signal: Nullable<AbortSignal> };

type Batch<Item> = { data: Item[]; cursor: string };

type Read<Value> = Promise<Result<Value, EngineError>>;

export type HubSources = {
  events: (
    project: string,
    detailed: boolean,
    after: Nullable<string>,
    wait: Wait,
  ) => Read<Batch<LiveEvent>>;
  logs: (project: string, after: Nullable<string>, wait: Wait) => Read<Batch<LogLine>>;
  visitors: (project: string) => Read<ActiveVisitor[]>;
  sessions: (project: string) => Read<LiveSession[]>;
};

export type HubOptions = {
  waitMs: number;
  snapshotMs: number;
  retryMs: number;
};

export type Send = (message: LiveServerMessage) => void;

export type Subscription = {
  id: string;
  project: string;
  channel: LiveChannel;
  detailed: boolean;
  after: Nullable<string>;
  send: Send;
};

type Topic = {
  subscribers: Map<string, Send>;
  stop: AbortController;
};

function pause(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

function topicKey(subscription: Pick<Subscription, "project" | "channel" | "detailed">) {
  return `${subscription.channel}\u0000${subscription.project}\u0000${subscription.detailed}`;
}

/**
 * @name createHub
 * @description Fans live data out to the WebSocket connections of one instance. Each project,
 * channel and access level is one topic with one poller, started by its first subscriber and
 * stopped after its last, so ten open widgets on a project cost the same reads as one. `events`
 * and `logs` long-poll their source from a cursor and publish each new batch; `visitors` and
 * `sessions` read a snapshot every `snapshotMs` and publish it when it changed. A joining
 * subscriber first gets its own catch-up: the batch after its `after` cursor, or the latest
 * window, or the current snapshot. Delivery is at least once around a join or reconnect, so
 * clients drop repeated ids. A failed read is published as an `error` message and retried after
 * `retryMs`.
 *
 * @example
 * const hub = createHub(sources, { waitMs: 25_000, snapshotMs: 5_000, retryMs: 2_000 });
 * await hub.join({ id: "ws-1", project: "docs", channel: "events", detailed: false, after: null, send });
 */
export function createHub(sources: HubSources, options: HubOptions) {
  const topics = new Map<string, Topic>();

  function publish(topic: Topic, message: LiveServerMessage) {
    for (const send of topic.subscribers.values()) send(message);
  }

  function failed(error: EngineError, channel: LiveChannel): LiveServerMessage {
    return { type: "error", code: error.code, message: error.message, channel };
  }

  async function stream<Item>(
    topic: Topic,
    channel: "events" | "logs",
    read: (after: Nullable<string>, wait: Wait) => Read<Batch<Item>>,
    message: (batch: Batch<Item>) => LiveServerMessage,
  ) {
    const signal = topic.stop.signal;
    let cursor: Nullable<string> = null;
    while (!signal.aborted) {
      const page = await read(cursor, { ms: cursor ? options.waitMs : 0, signal });
      if (signal.aborted) return;
      if (!page.ok) {
        publish(topic, failed(page.error, channel));
        await pause(options.retryMs, signal);
        continue;
      }
      if (cursor && page.value.data.length > 0) publish(topic, message(page.value));
      cursor = page.value.cursor;
    }
  }

  async function snapshot<Item>(
    topic: Topic,
    channel: "visitors" | "sessions",
    read: () => Read<Item[]>,
    message: (data: Item[]) => LiveServerMessage,
  ) {
    const signal = topic.stop.signal;
    let last = "";
    while (!signal.aborted) {
      await pause(options.snapshotMs, signal);
      if (signal.aborted) return;
      const found = await read();
      if (signal.aborted) return;
      if (!found.ok) {
        publish(topic, failed(found.error, channel));
        continue;
      }
      const serialized = JSON.stringify(found.value);
      if (serialized !== last) publish(topic, message(found.value));
      last = serialized;
    }
  }

  function run(topic: Topic, subscription: Subscription) {
    const { project, detailed } = subscription;
    if (subscription.channel === "events") {
      return stream(
        topic,
        "events",
        (after, wait) => sources.events(project, detailed, after, wait),
        (batch) => ({ type: "events", data: batch.data, cursor: batch.cursor }),
      );
    }
    if (subscription.channel === "logs") {
      return stream(
        topic,
        "logs",
        (after, wait) => sources.logs(project, after, wait),
        (batch) => ({ type: "logs", data: batch.data, cursor: batch.cursor }),
      );
    }
    if (subscription.channel === "visitors") {
      return snapshot(
        topic,
        "visitors",
        () => sources.visitors(project),
        (data) => ({ type: "visitors", data }),
      );
    }
    return snapshot(
      topic,
      "sessions",
      () => sources.sessions(project),
      (data) => ({ type: "sessions", data }),
    );
  }

  async function catchUp(subscription: Subscription): Promise<LiveServerMessage> {
    const { project, detailed, after, channel } = subscription;
    const now = { ms: 0, signal: null };
    if (channel === "events") {
      const page = await sources.events(project, detailed, after, now);
      return page.ok
        ? { type: "events", data: page.value.data, cursor: page.value.cursor }
        : failed(page.error, channel);
    }
    if (channel === "logs") {
      const page = await sources.logs(project, after, now);
      return page.ok
        ? { type: "logs", data: page.value.data, cursor: page.value.cursor }
        : failed(page.error, channel);
    }
    if (channel === "visitors") {
      const found = await sources.visitors(project);
      return found.ok ? { type: "visitors", data: found.value } : failed(found.error, channel);
    }
    const found = await sources.sessions(project);
    return found.ok ? { type: "sessions", data: found.value } : failed(found.error, channel);
  }

  async function join(subscription: Subscription) {
    subscription.send(await catchUp(subscription));
    const key = topicKey(subscription);
    const existing = topics.get(key);
    if (existing) {
      existing.subscribers.set(subscription.id, subscription.send);
      return;
    }
    const topic: Topic = {
      subscribers: new Map([[subscription.id, subscription.send]]),
      stop: new AbortController(),
    };
    topics.set(key, topic);
    void run(topic, subscription);
  }

  function leave(id: string, channel: Nullable<LiveChannel>) {
    for (const [key, topic] of topics) {
      if (channel && !key.startsWith(`${channel}\u0000`)) continue;
      topic.subscribers.delete(id);
      if (topic.subscribers.size > 0) continue;
      topic.stop.abort();
      topics.delete(key);
    }
  }

  function size() {
    return topics.size;
  }

  return { join, leave, size };
}
