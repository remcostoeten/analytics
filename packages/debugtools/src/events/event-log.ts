import type { WireEvent } from "@spoar/contract";
import type { Nullable } from "@spoar/shared/semantic";

import type { ConsoleHost } from "../host";

export type EventStatus = "accepted" | "rejected" | "dropped" | "failed";

export type EventEntry = {
  key: number;
  event: Nullable<WireEvent>;
  status: EventStatus;
  reason: Nullable<string>;
  at: string;
};

export type EventLog = {
  subscribe: (listener: () => void) => () => void;
  read: () => EventEntry[];
  clear: () => void;
  stop: () => void;
};

const eventLogLimit = 200;

const rejectedCode = "RA_INGEST_REJECTED";
const failedCode = "RA_INGEST_FAILED";

/**
 * @name rejectionCode
 * @description The engine's reason code from the detail the SDK reports for a rejected event,
 * the part before the first colon, or the whole detail when it has none.
 *
 * @example
 * rejectionCode("VALIDATION_FAILED: props.plan is too long"); // "VALIDATION_FAILED"
 */
export function rejectionCode(detail: string): string {
  const colon = detail.indexOf(":");
  return colon === -1 ? detail.trim() : detail.slice(0, colon).trim();
}

/**
 * @name createEventLog
 * @description Listens to the page's SDK client and keeps the newest 200 events it handled,
 * newest first: accepted or rejected after a send, dropped before one, and a row for each failed
 * send. The SDK reports an envelope's rejections just before its `send`, so an event is accepted
 * unless a rejection named its id. Read it with `useSyncExternalStore(log.subscribe, log.read)`.
 *
 * @example
 * const log = createEventLog(host);
 * log.read()[0]; // { event, status: "accepted", reason: null, at: "2026-11-01T10:00:00.000Z" }
 */
export function createEventLog(
  host: ConsoleHost,
  now: () => Date = () => new Date(),
  limit = eventLogLimit,
): EventLog {
  let entries: EventEntry[] = [];
  let next = 0;
  const rejections = new Map<string, string>();
  const listeners = new Set<() => void>();

  function add(added: Omit<EventEntry, "key" | "at">[]) {
    if (added.length === 0) return;
    const at = now().toISOString();
    const rows = added.map((entry) => ({ ...entry, key: next++, at })).reverse();
    entries = [...rows, ...entries].slice(0, limit);
    for (const listener of listeners) listener();
  }

  const removers = [
    host.on("send", (envelope) => {
      add(
        envelope.events.map((event) => {
          const reason = rejections.get(event.id) ?? null;
          return { event, status: reason ? "rejected" : "accepted", reason };
        }),
      );
      rejections.clear();
    }),
    host.on("drop", (event, reason) => add([{ event, status: "dropped", reason }])),
    host.on("error", (code, detail, event) => {
      if (code === rejectedCode && event) rejections.set(event.id, detail);
      else if (code === rejectedCode) add([{ event: null, status: "rejected", reason: detail }]);
      else if (code === failedCode) add([{ event: null, status: "failed", reason: detail }]);
    }),
  ];

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    read: () => entries,
    clear: () => {
      entries = [];
      rejections.clear();
      for (const listener of listeners) listener();
    },
    stop: () => {
      for (const remove of removers.splice(0)) remove();
      listeners.clear();
    },
  };
}

const shared = new WeakMap<ConsoleHost, EventLog>();

/**
 * @name sharedEventLog
 * @description The one event log of a host, created on first use and kept while the host lives,
 * so switching tabs or closing the panel does not lose the events seen so far.
 *
 * @example
 * sharedEventLog(host) === sharedEventLog(host); // true
 */
export function sharedEventLog(host: ConsoleHost): EventLog {
  const found = shared.get(host);
  if (found) return found;
  const log = createEventLog(host);
  shared.set(host, log);
  return log;
}
