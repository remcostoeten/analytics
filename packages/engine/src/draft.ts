import type { BotVerdict, Device, Source, WireEvent } from "@remcostoeten/analytics-contract";
import type { Nullable, ProjectID, Timestamp } from "@remcostoeten/analytics-shared/semantic";

import type { IssueDraft } from "./errors/stage";
import type { GeoPlace, Location } from "./ports";
import { clientIp } from "./utilities/client-ip";
import type { HeaderBag } from "./utilities/client-ip";
import { hostOf } from "./utilities/hosts";

export type Credentials = {
  publicKey: Nullable<string>;
  secretKey: Nullable<string>;
};

export type RequestFacts = {
  headers: HeaderBag;
  adminSession: boolean;
};

export type IngestRequest = {
  credentials: Credentials;
  receivedAt: Timestamp;
  sentAt: Timestamp;
  request: RequestFacts;
  events: unknown[];
};

export type BatchContext = {
  projectId: ProjectID;
  trusted: boolean;
  receivedAt: Timestamp;
  sentAt: Timestamp;
  request: RequestFacts;
};

export type Network = {
  asn: Nullable<number>;
  asOrg: Nullable<string>;
};

export type Client = {
  ip: Nullable<string>;
  userAgent: Nullable<string>;
  ipHash: Nullable<string>;
};

export type Enrichment = {
  client: Client;
  geo: Nullable<Location>;
  places: GeoPlace[];
  network: Nullable<Network>;
  device: Nullable<Device>;
  source: Nullable<Source>;
};

export type Flags = {
  localhost: boolean;
  preview: boolean;
  internal: boolean;
};

export type EventDraft = {
  index: number;
  projectId: ProjectID;
  trusted: boolean;
  receivedAt: Timestamp;
  ts: Timestamp;
  origin: Nullable<string>;
  host: Nullable<string>;
  event: WireEvent;
  request: RequestFacts;
  enrichment: Enrichment;
  flags: Flags;
  bot: BotVerdict;
  replay: boolean;
  issue: Nullable<IssueDraft>;
};

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
 * @description Turns one parsed wire event into the draft the pipeline stages refine: a
 * skew-corrected timestamp, the client IP and user agent from the request headers, empty
 * enrichment, cleared flags and a clean bot verdict.
 *
 * @example
 * const drafts = events.map((event, index) => createDraft(batch, event, index));
 */
export function createDraft(batch: BatchContext, event: WireEvent, index: number): EventDraft {
  const origin = batch.request.headers.get("origin");
  return {
    index,
    projectId: batch.projectId,
    trusted: batch.trusted,
    receivedAt: batch.receivedAt,
    ts: correctedTimestamp(event.ts, batch.sentAt, batch.receivedAt),
    origin,
    host: hostOf(origin),
    event,
    request: batch.request,
    enrichment: {
      client: {
        ip: clientIp(batch.request.headers),
        userAgent: batch.request.headers.get("user-agent"),
        ipHash: null,
      },
      geo: null,
      places: [],
      network: null,
      device: null,
      source: null,
    },
    flags: { localhost: false, preview: false, internal: false },
    bot: { score: 0, reasons: [] },
    replay: false,
    issue: null,
  };
}
