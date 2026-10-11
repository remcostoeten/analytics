import type { IngestTotals } from "@spoar/contract";

export type ConnectionState = "connected" | "rejected" | "waiting";

/**
 * @name connectionOf
 * @description Reads the last 24 hours of ingest counts and says whether the site is sending events. Accepted events mean connected, rejected events with none accepted mean the ingest is refusing the site, and no traffic at all means still waiting for the first event.
 * @example
 * connectionOf({ accepted: 12, duplicates: 0, rejected: 0, rateLimited: 0 }) // "connected"
 */
export function connectionOf(ingest: IngestTotals): ConnectionState {
  if (ingest.accepted > 0) return "connected";
  if (ingest.rejected > 0 || ingest.rateLimited > 0) return "rejected";
  return "waiting";
}
