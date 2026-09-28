import { IngestEnvelope } from "@remcostoeten/analytics-contract";
import { Value } from "@sinclair/typebox/value";

import { createAnalytics } from "../src/core/client";
import type { AnalyticsConfig, Envelope, EventMap, SendResult, Transport } from "../src/core/types";

export type Recorder = Transport & {
  envelopes: Envelope[];
  respond: (result: SendResult) => void;
};

/**
 * @name recorder
 * @description A transport that records every envelope, checks it against the contract's
 * `IngestEnvelope`, and answers with an accepted result unless told otherwise.
 *
 * @example
 * const transport = recorder();
 */
function recorder(): Recorder {
  const envelopes: Envelope[] = [];
  let next: SendResult | null = null;
  return {
    envelopes,
    respond: (result) => {
      next = result;
    },
    send: async (envelope) => {
      if (!Value.Check(IngestEnvelope, envelope)) {
        const [first] = Value.Errors(IngestEnvelope, envelope);
        throw new Error(`envelope does not match the contract: ${first?.path} ${first?.message}`);
      }
      envelopes.push(envelope);
      const result: SendResult = next ?? {
        ok: true,
        result: { accepted: envelope.events.length, duplicates: 0, rejected: [] },
      };
      next = null;
      return result;
    },
  };
}

export function fresh() {
  localStorage.clear();
  sessionStorage.clear();
}

export function client<Events extends EventMap = EventMap>(options: Partial<AnalyticsConfig> = {}) {
  const transport = recorder();
  const analytics = createAnalytics<Events>({
    project: "remcostoeten.nl",
    key: "pk_test",
    endpoint: "https://api.example.test/v2/events",
    mode: "production",
    pageviews: false,
    transport,
    ...options,
  });
  return { analytics, transport };
}

export function sent(transport: Recorder) {
  return transport.envelopes.flatMap((envelope) => envelope.events);
}
