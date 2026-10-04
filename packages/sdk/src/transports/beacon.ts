import type { IngestResult } from "@spoar/contract";

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
 * `sendBeacon` cannot set headers and a custom header would force a CORS preflight. An empty key
 * leaves the parameter out: a same-origin proxy adds the secret itself, and the API answers 401
 * to a direct request without one.
 *
 * @example
 * ingestUrl("/_ra", "pk_test"); // "/_ra?key=pk_test"
 */
export function ingestUrl(endpoint: string, key: string): string {
  if (!key) return endpoint;
  return `${endpoint}${endpoint.includes("?") ? "&" : "?"}key=${encodeURIComponent(key)}`;
}

/**
 * @name retryAfter
 * @description A `Retry-After` header in milliseconds, from either seconds or an HTTP date, or
 * undefined when it is missing, unreadable or not in the future.
 *
 * @example
 * retryAfter("30", Date.now()); // 30000
 */
export function retryAfter(value: string | null, now: number): number | undefined {
  const ms = value ? Number(value) * 1000 || Date.parse(value) - now : 0;
  return ms > 0 ? ms : undefined;
}

function retryable(status: number) {
  return status === 0 || status === 429 || status >= 500;
}

/**
 * @name beacon
 * @description The default transport: `fetch` with `keepalive` and a `text/plain` JSON body, a
 * CORS-safelisted type so browsers skip the preflight. While the page unloads it uses
 * `sendBeacon`, falling back to `fetch` when the beacon is refused. A queued beacon counts as
 * accepted, because its response cannot be read: server rejections of that batch are not seen.
 * A network error, 429 or 5xx is reported as retryable, with the `Retry-After` delay when the
 * server sent one.
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
        return {
          ok: false,
          retry: retryable(response.status),
          status: response.status,
          after: retryAfter(response.headers.get("retry-after"), Date.now()),
        };
      } catch {
        return { ok: false, retry: true, status: 0 };
      }
    },
  };
}
