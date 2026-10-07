import type { MapLevel, PathDirection } from "@spoar/contract";
import type { SessionID, VisitorID } from "@spoar/shared/semantic";

import { basePath, toQuery } from "../scope";
import type { ClientResult, Dimension, Download, Metric, ScopeState, Send } from "../types";

export type DownloadPage = Download & { limit?: number };

export type DownloadReads = {
  breakdown: (
    dimension: Dimension,
    options: DownloadPage & { metrics?: readonly Metric[] },
  ) => ClientResult<string>;
  paths: (
    page: string,
    options: DownloadPage & { direction?: PathDirection },
  ) => ClientResult<string>;
  map: (options: DownloadPage & { level?: MapLevel }) => ClientResult<string>;
  events: (options: DownloadPage & { name?: string }) => ClientResult<string>;
  visitors: (options: DownloadPage) => ClientResult<string>;
  sessions: (options: DownloadPage) => ClientResult<string>;
};

export type ProjectDownloadReads = DownloadReads & {
  visitorVisits: (visitor: VisitorID, options: DownloadPage) => ClientResult<string>;
  sessionEvents: (session: SessionID, options: DownloadPage) => ClientResult<string>;
};

/**
 * @name downloadReads
 * @description The same list routes as the JSON terminals, answered as one CSV or SQL file instead
 * of a page: `format` picks the file, `limit` caps the rows (up to the API's download cap), and
 * the result is the file's text.
 *
 * @example
 * const files = downloadReads(send, { project: "skriuw", period: "30d", filter: {} });
 * const csv = await files.breakdown("page", { format: "csv", metrics: ["visitors"] });
 */
export function downloadReads(send: Send, state: ScopeState): DownloadReads {
  const base = basePath(state);
  const query = toQuery(state);

  function file(path: string, extra: { [name: string]: string | number | undefined }) {
    return send.text({ method: "GET", path, query: { ...query, ...extra } });
  }

  return {
    breakdown: (dimension, options) =>
      file(`${base}/breakdown/${encodeURIComponent(dimension)}`, {
        metrics: options.metrics?.join(","),
        format: options.format,
        limit: options.limit,
      }),
    paths: (page, options) =>
      file(`${base}/paths`, {
        page,
        direction: options.direction,
        format: options.format,
        limit: options.limit,
      }),
    map: (options) =>
      file(`${base}/map`, { level: options.level, format: options.format, limit: options.limit }),
    events: (options) =>
      file(`${base}/events`, { name: options.name, format: options.format, limit: options.limit }),
    visitors: (options) =>
      file(`${base}/visitors`, { format: options.format, limit: options.limit }),
    sessions: (options) =>
      file(`${base}/sessions`, { format: options.format, limit: options.limit }),
  };
}

/**
 * @name projectDownloadReads
 * @description The downloads of one project: the shared list downloads plus one visitor's visits
 * and one session's events as a file.
 *
 * @example
 * await projectDownloadReads(send, state).sessionEvents(sessionId, { format: "csv" });
 */
export function projectDownloadReads(send: Send, state: ScopeState): ProjectDownloadReads {
  const base = basePath(state);

  return {
    ...downloadReads(send, state),
    visitorVisits: (visitor, options) =>
      send.text({
        method: "GET",
        path: `${base}/visitors/${encodeURIComponent(visitor)}/visits`,
        query: { format: options.format, limit: options.limit },
      }),
    sessionEvents: (session, options) =>
      send.text({
        method: "GET",
        path: `${base}/sessions/${encodeURIComponent(session)}/events`,
        query: { format: options.format, limit: options.limit },
      }),
  };
}
