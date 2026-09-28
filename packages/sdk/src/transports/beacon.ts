import type { IngestResult } from "@remcostoeten/analytics-contract";

import type { SendResult, Transport } from "../core/types";

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

export type BeaconOptions = {
  endpoint: string;
  key: string;
  fetch?: Fetcher;
  sendBeacon?: (url: string, body: Blob) => boolean;
};

const contentType = "text/plain;charset=UTF-8";

/**
 * @name ingestUrl
 * @description The ingest URL with the public key as a `key` query parameter, because
 * `sendBeacon` cannot set headers and a custom header would force a CORS preflight.
 *
 * @example
 * ingestUrl("/_ra", "pk_test"); // "/_ra?key=pk_test"
 */
export function ingestUrl(endpoint: string, key: string): string {
  return `${endpoint}${endpoint.includes("?") ? "&" : "?"}key=${encodeURIComponent(key)}`;
}

function retryable(status: number) {
  return status === 0 || status === 429 || status >= 500;
}

/**
 * @name beacon
 * @description The default transport: `fetch` with `keepalive` and a `text/plain` JSON body, a
 * CORS-safelisted type so browsers skip the preflight. While the page unloads it uses
 * `sendBeacon`, falling back to `fetch` when the beacon is refused. A network error, 429 or 5xx
 * is reported as retryable.
 *
 * @example
 * const transport = beacon({ endpoint: "/_ra", key: "pk_test" });
 */
export function beacon(options: BeaconOptions): Transport {
  const url = ingestUrl(options.endpoint, options.key);
  return {
    send: async (envelope, unloading): Promise<SendResult> => {
      const body = JSON.stringify(envelope);
      const sendBeacon = options.sendBeacon ?? globalThis.navigator?.sendBeacon?.bind(navigator);
      if (unloading && sendBeacon?.(url, new Blob([body], { type: contentType }))) {
        return {
          ok: true,
          result: { accepted: envelope.events.length, duplicates: 0, rejected: [] },
        };
      }
      try {
        const request: Fetcher = options.fetch ?? ((target, init) => fetch(target, init));
        const response = await request(url, {
          method: "POST",
          body,
          headers: { "content-type": contentType },
          keepalive: true,
        });
        if (response.ok) return { ok: true, result: (await response.json()) as IngestResult };
        return { ok: false, retry: retryable(response.status), status: response.status };
      } catch {
        return { ok: false, retry: true, status: 0 };
      }
    },
  };
}
