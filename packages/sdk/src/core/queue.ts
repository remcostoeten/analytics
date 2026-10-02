import type { IngestResult, WireEvent } from "@spoar/contract";

import type { Envelope, FlushResult, SendResult, Transport } from "./types";

export type QueueOptions = {
  transport: Transport;
  now: () => number;
  wait: (ms: number) => Promise<void>;
  schedule: (run: () => void, ms: number) => () => void;
  onSend: (envelope: Envelope, result: IngestResult) => void;
  onFailure: (events: WireEvent[], status: number) => void;
  persist: (events: WireEvent[]) => void;
};

export type Queue = {
  add: (event: WireEvent) => void;
  flush: (unloading?: boolean) => Promise<FlushResult>;
  size: () => number;
  clear: () => void;
};

export const maxBodyBytes = 60 * 1024;

const batchSize = 20;
const batchDelayMs = 5000;
const retryDelaysMs = [1000, 4000, 16_000];

/**
 * @name createQueue
 * @description Batches events in memory and sends them after 5 seconds, at 20 events, or when
 * flushed. A batch is cut short when its body would pass the API's 60 KB limit (`maxBodyBytes`),
 * and a single event over that limit is dropped as a 413 without being sent. A network error, 429
 * or 5xx is retried after 1, 4 and 16 seconds, or after the server's `Retry-After` capped at 16
 * seconds, with the same event ids, then handed to `persist`; a 4xx drops the batch. While
 * unloading, a batch is sent once with no retries, and batches waiting between retries are sent
 * with it and not retried afterwards.
 *
 * @example
 * const queue = createQueue({ transport, now: Date.now, wait, schedule, onSend, onFailure, persist });
 * queue.add(event);
 */
export function createQueue(options: QueueOptions): Queue {
  let pending: WireEvent[] = [];
  let cancel: (() => void) | null = null;
  const retrying = new Set<WireEvent[]>();

  function envelope(events: WireEvent[]): Envelope {
    return { v: 1, sentAt: new Date(options.now()).toISOString(), events };
  }

  function oversize(events: WireEvent[]) {
    return new Blob([JSON.stringify(envelope(events))]).size > maxBodyBytes;
  }

  async function deliver(events: WireEvent[], unloading: boolean): Promise<SendResult | null> {
    let result = await options.transport.send(envelope(events), unloading);
    for (const delay of unloading ? [] : retryDelaysMs) {
      if (result.ok || !result.retry) break;
      retrying.add(events);
      await options.wait(Math.min(result.after ?? delay, 16_000));
      if (!retrying.delete(events)) return null;
      result = await options.transport.send(envelope(events), false);
    }
    return result;
  }

  async function flush(unloading = false): Promise<FlushResult> {
    cancel?.();
    cancel = null;
    if (unloading) {
      pending = [...[...retrying].flat(), ...pending];
      retrying.clear();
    }
    const total: FlushResult = { accepted: 0, duplicates: 0, failed: 0 };
    while (pending.length > 0) {
      const events = pending.slice(0, batchSize);
      while (events.length > 1 && oversize(events)) events.pop();
      pending = pending.slice(events.length);
      const result: SendResult | null = oversize(events)
        ? { ok: false, retry: false, status: 413 }
        : await deliver(events, unloading);
      if (!result) continue;
      if (result.ok) {
        options.onSend(envelope(events), result.result);
        total.accepted += result.result.accepted;
        total.duplicates += result.result.duplicates;
        total.failed += result.result.rejected.length;
        continue;
      }
      total.failed += events.length;
      options.onFailure(events, result.status);
      if (result.retry) options.persist(events);
    }
    return total;
  }

  function add(event: WireEvent) {
    pending.push(event);
    if (pending.length >= batchSize) {
      void flush();
      return;
    }
    cancel ??= options.schedule(() => {
      cancel = null;
      void flush();
    }, batchDelayMs);
  }

  function clear() {
    cancel?.();
    cancel = null;
    pending = [];
    retrying.clear();
  }

  return {
    add,
    flush,
    size: () => pending.length,
    clear,
  };
}
