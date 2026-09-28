import type { BotVerdict, Device, Geo, Source, WireEvent } from "@remcostoeten/analytics-contract";
import type { Nullable, ProjectID, Timestamp } from "@remcostoeten/analytics-shared/semantic";

export type RequestFacts = {
  ip: Nullable<string>;
  userAgent: Nullable<string>;
  origin: Nullable<string>;
};

export type IngestBatch = {
  projectId: ProjectID;
  receivedAt: Timestamp;
  sentAt: Timestamp;
  request: RequestFacts;
  events: WireEvent[];
};

export type Network = {
  asn: Nullable<number>;
  asOrg: Nullable<string>;
};

export type Enrichment = {
  geo: Nullable<Geo>;
  network: Nullable<Network>;
  device: Nullable<Device>;
  source: Nullable<Source>;
};

export type EventDraft = {
  index: number;
  projectId: ProjectID;
  receivedAt: Timestamp;
  ts: Timestamp;
  event: WireEvent;
  request: RequestFacts;
  enrichment: Enrichment;
  bot: BotVerdict;
};

export const emptyEnrichment: Enrichment = { geo: null, network: null, device: null, source: null };

/**
 * @name correctedTimestamp
 * @description Shifts a client timestamp by the gap between when the server received the batch
 * and when the client says it sent it, so a wrong client clock does not misplace events.
 *
 * @example
 * correctedTimestamp("2026-09-27T16:00:00.000Z", "2026-09-27T16:00:05.000Z", "2026-09-27T16:00:10.000Z");
 * // "2026-09-27T16:00:05.000Z"
 */
export function correctedTimestamp(ts: Timestamp, sentAt: Timestamp, receivedAt: Timestamp) {
  const skew = Date.parse(receivedAt) - Date.parse(sentAt);
  return new Date(Date.parse(ts) + skew).toISOString();
}

/**
 * @name createDraft
 * @description Turns one wire event of a batch into the draft the pipeline stages refine, with
 * a skew-corrected timestamp, empty enrichment and a clean bot verdict.
 *
 * @example
 * const drafts = batch.events.map((event, index) => createDraft(batch, event, index));
 */
export function createDraft(batch: IngestBatch, event: WireEvent, index: number): EventDraft {
  return {
    index,
    projectId: batch.projectId,
    receivedAt: batch.receivedAt,
    ts: correctedTimestamp(event.ts, batch.sentAt, batch.receivedAt),
    event,
    request: batch.request,
    enrichment: emptyEnrichment,
    bot: { score: 0, reasons: [] },
  };
}
