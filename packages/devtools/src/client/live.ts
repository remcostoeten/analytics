import type {
  ActiveVisitor,
  LiveChannel,
  LiveEvent,
  LiveServerMessage,
  LiveSession,
  LogLine,
} from "@spoar/contract";
import type { Nullable } from "@spoar/shared/semantic";

import type { ClientResult } from "./client";

export type SocketState = "connecting" | "live" | "paused" | "offline" | "failed";

export type SocketEvents = {
  open: () => void;
  message: (text: string) => void;
  close: (code: number) => void;
};

export type SocketHandle = {
  send: (text: string) => void;
  close: () => void;
};

export type Connect = (url: string, events: SocketEvents) => SocketHandle;

export type SocketOptions = {
  url: string;
  token: () => ClientResult<string>;
  refresh: () => ClientResult<string>;
  channels: LiveChannel[];
  connect?: Connect;
  retryMs?: number;
  onEvents: (items: LiveEvent[]) => void;
  onLogs: (items: LogLine[]) => void;
  onVisitors: (rows: ActiveVisitor[]) => void;
  onSessions: (rows: LiveSession[]) => void;
  onState: (state: SocketState) => void;
};

export type Socket = {
  pause: (channel: LiveChannel) => void;
  resume: (channel: LiveChannel) => void;
  stop: () => void;
};

type Cursored = "events" | "logs";

const expired = 4001;
const refused = 4401;
const failuresBeforeGivingUp = 2;
const maxRetryMs = 30_000;
const pingMs = 30_000;
const seenLimit = 1000;

function browserSocket(url: string, events: SocketEvents): SocketHandle {
  const socket = new WebSocket(url);
  socket.addEventListener("open", () => events.open());
  socket.addEventListener("message", (event) => events.message(String(event.data)));
  socket.addEventListener("close", (event) => events.close(event.code));
  return {
    send: (text) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(text);
    },
    close: () => socket.close(1000),
  };
}

function read(text: string): Nullable<LiveServerMessage> {
  try {
    const value: unknown = JSON.parse(text);
    if (value === null || typeof value !== "object" || !("type" in value)) return null;
    // The API checks every message against the contract before sending it (decision 10).
    return value as LiveServerMessage;
  } catch {
    return null;
  }
}

/**
 * @name socketUrl
 * @description The live WebSocket address for a project on an API base URL.
 *
 * @example
 * socketUrl("https://api.example.com", "site"); // "wss://api.example.com/v2/projects/site/live"
 */
export function socketUrl(base: string, project: string): string {
  const url = new URL(`${base}/v2/projects/${encodeURIComponent(project)}/live`);
  url.protocol = url.protocol === "http:" ? "ws:" : "wss:";
  return url.toString();
}

/**
 * @name openSocket
 * @description Follows `/v2/projects/:project/live`: sends the widget token as the first message,
 * subscribes to the wanted channels the `ready` answer grants, resumes `events` and `logs` from
 * their last cursor after a reconnect and drops ids it already delivered. On 4001 it fetches a
 * new token and reconnects at once; other closes reconnect with a backoff. When the socket never
 * reaches `ready` twice in a row, or the token is refused, the state turns `failed` and it stops,
 * so the caller can fall back to server-sent events and polling. It closes while the tab is
 * hidden and reconnects when it is visible again.
 *
 * @example
 * const socket = openSocket({ url, token, refresh, channels: ["events"], onEvents, onLogs, onVisitors, onSessions, onState });
 * socket.stop();
 */
export function openSocket(options: SocketOptions): Socket {
  const connect = options.connect ?? browserSocket;
  const retryMs = options.retryMs ?? 2000;
  const wanted = new Set<LiveChannel>(options.channels);
  const cursors: { [channel in Cursored]: Nullable<string> } = { events: null, logs: null };
  const seen: { [channel in Cursored]: Set<string> } = { events: new Set(), logs: new Set() };
  let granted = new Set<LiveChannel>();
  let socket: Nullable<SocketHandle> = null;
  let failures = 0;
  let reached = false;
  let stopped = false;
  let hidden = false;
  let retry: Nullable<ReturnType<typeof setTimeout>> = null;
  let ping: Nullable<ReturnType<typeof setInterval>> = null;

  function send(message: { [field: string]: string }) {
    socket?.send(JSON.stringify(message));
  }

  function subscribe(channel: LiveChannel) {
    if (!granted.has(channel)) return;
    const after = channel === "events" || channel === "logs" ? cursors[channel] : null;
    send(after ? { type: "subscribe", channel, after } : { type: "subscribe", channel });
  }

  function fresh<Item extends { id: string }>(channel: Cursored, items: Item[]) {
    const known = seen[channel];
    const kept = items.filter((item) => !known.has(item.id));
    for (const item of kept) known.add(item.id);
    for (const id of known) {
      if (known.size <= seenLimit) break;
      known.delete(id);
    }
    return kept;
  }

  function receive(message: LiveServerMessage) {
    switch (message.type) {
      case "ready":
        granted = new Set(message.channels);
        failures = 0;
        reached = true;
        options.onState("live");
        for (const channel of wanted) subscribe(channel);
        return;
      case "events": {
        cursors.events = message.cursor;
        const items = fresh("events", message.data);
        if (items.length > 0 && wanted.has("events")) options.onEvents(items);
        return;
      }
      case "logs": {
        cursors.logs = message.cursor;
        const items = fresh("logs", message.data);
        if (items.length > 0 && wanted.has("logs")) options.onLogs(items);
        return;
      }
      case "visitors":
        if (wanted.has("visitors")) options.onVisitors(message.data);
        return;
      case "sessions":
        if (wanted.has("sessions")) options.onSessions(message.data);
        return;
      default:
        return;
    }
  }

  function clearTimers() {
    if (retry) clearTimeout(retry);
    if (ping) clearInterval(ping);
    retry = null;
    ping = null;
  }

  function fail() {
    stopped = true;
    clearTimers();
    document.removeEventListener("visibilitychange", onVisibility);
    options.onState("failed");
  }

  function closed(handle: SocketHandle, code: number) {
    if (socket !== handle) return;
    socket = null;
    granted = new Set();
    clearTimers();
    if (stopped || hidden) return;
    if (code === expired) {
      void open(true);
      return;
    }
    failures += 1;
    if (!reached && (code === refused || failures >= failuresBeforeGivingUp)) {
      fail();
      return;
    }
    options.onState("offline");
    const delay = Math.min(maxRetryMs, retryMs * 2 ** (failures - 1));
    retry = setTimeout(() => void open(code === refused), delay);
  }

  async function open(renew: boolean) {
    if (stopped || hidden || socket) return;
    options.onState("connecting");
    const token = await (renew ? options.refresh() : options.token());
    if (stopped || hidden || socket) return;
    if (!token.ok) {
      options.onState("offline");
      retry = setTimeout(() => void open(false), retryMs * 2);
      return;
    }
    const handle = connect(options.url, {
      open: () => {
        if (socket !== handle) return;
        send({ type: "auth", token: token.value });
        ping = setInterval(() => send({ type: "ping" }), pingMs);
      },
      message: (text) => {
        const message = socket === handle ? read(text) : null;
        if (message) receive(message);
      },
      close: (code) => closed(handle, code),
    });
    socket = handle;
  }

  function shut() {
    clearTimers();
    const handle = socket;
    socket = null;
    granted = new Set();
    handle?.close();
  }

  function onVisibility() {
    const now = document.visibilityState === "hidden";
    if (now === hidden || stopped) return;
    hidden = now;
    if (hidden) {
      shut();
      options.onState("paused");
      return;
    }
    void open(false);
  }

  document.addEventListener("visibilitychange", onVisibility);
  hidden = document.visibilityState === "hidden";
  if (hidden) options.onState("paused");
  else void open(false);

  return {
    pause: (channel) => {
      if (!wanted.delete(channel)) return;
      if (granted.has(channel)) send({ type: "unsubscribe", channel });
    },
    resume: (channel) => {
      if (wanted.has(channel)) return;
      wanted.add(channel);
      subscribe(channel);
    },
    stop: () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisibility);
      shut();
    },
  };
}
