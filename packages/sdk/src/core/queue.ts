import type { WireEvent } from "@remcostoeten/analytics-contract";

import type { Envelope, FlushResult, SendResult, Transport } from "./types";

export type QueueOptions = {
  transport: Transport;
  now: () => number;
  wait: (ms: number) => Promise<void>;
  schedule: (run: () => void, ms: number) => () => void;
  onSend: (envelope: Envelope) => void;
  onFailure: (events: WireEvent[], status: number) => void;
  persist: (events: WireEvent[]) => void;
};

export type Queue = {
  add: (event: WireEvent) => void;
  flush: (unloading?: boolean) => Promise<FlushResult>;
  size: () => number;
  clear: () => void;
};

const batchSize = 20;
const batchDelayMs = 5000;
const retryDelaysMs = [1000, 4000, 16_000];

/**
 * @name createQueue
 * @description Batches events in memory and sends them after 5 seconds, at 20 events, or when
 * flushed. A network error or 5xx is retried after 1, 4 and 16 seconds with the same event ids,
 * then handed to `persist`; a 4xx drops the batch. While unloading, a batch is sent once with no
 * retries.
 *
 * @example
 * const queue = createQueue({ transport, now: Date.now, wait, schedule, onSend, onFailure, persist });
 * queue.add(event);
 */
export function createQueue(options: QueueOptions): Queue {
  let pending: WireEvent[] = [];
  let cancel: (() => void) | null = null;

  function envelope(events: WireEvent[]): Envelope {
    return { v: 1, sentAt: new Date(options.now()).toISOString(), events };
  }

  async function deliver(events: WireEvent[], unloading: boolean): Promise<SendResult> {
    let result = await options.transport.send(envelope(events), unloading);
    for (const delay of unloading ? [] : retryDelaysMs) {
      if (result.ok || !result.retry) break;
      await options.wait(delay);
      result = await options.transport.send(envelope(events), false);
    }
    return result;
  }

  async function flush(unloading = false): Promise<FlushResult> {
    cancel?.();
    cancel = null;
    const total: FlushResult = { accepted: 0, duplicates: 0, failed: 0 };
    while (pending.length > 0) {
      const events = pending.slice(0, batchSize);
      pending = pending.slice(batchSize);
      const result = await deliver(events, unloading);
      if (result.ok) {
        options.onSend(envelope(events));
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
  }

  return {
    add,
    flush,
    size: () => pending.length,
    clear,
  };
}
