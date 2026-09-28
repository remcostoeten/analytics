import type { WaitUntil } from "./types";

export type VisitorDetails = {
  ip: string | null;
  userAgent: string | null;
};

type VercelContext = { get?: () => { waitUntil?: WaitUntil } | undefined };

/**
 * @name visitorDetails
 * @description The visitor's IP and user agent from incoming request headers: the IP from
 * `cf-connecting-ip`, then `x-real-ip`, then the first `x-forwarded-for` entry, the same order
 * the API uses.
 *
 * @example
 * visitorDetails(request.headers); // { ip: "203.0.113.7", userAgent: "Mozilla/5.0 ..." }
 */
export function visitorDetails(headers: Headers): VisitorDetails {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ip: headers.get("cf-connecting-ip") || headers.get("x-real-ip") || forwarded || null,
    userAgent: headers.get("user-agent"),
  };
}

/**
 * @name eventsUrl
 * @description The ingest URL for an API base URL, accepting a base that already ends in
 * `/v2/events`.
 *
 * @example
 * eventsUrl("https://api.remcostoeten.nl/"); // "https://api.remcostoeten.nl/v2/events"
 */
export function eventsUrl(endpoint: string): string {
  let base = endpoint;
  while (base.endsWith("/")) base = base.slice(0, -1);
  return base.endsWith("/v2/events") ? base : `${base}/v2/events`;
}

/**
 * @name runtimeWaitUntil
 * @description The runtime's `waitUntil` when there is one, read from Vercel's request context,
 * so work can finish after the response is sent. Other runtimes pass their own `waitUntil`.
 *
 * @example
 * runtimeWaitUntil()?.(flushing);
 */
export function runtimeWaitUntil(): WaitUntil | undefined {
  const context = (globalThis as { [key: symbol]: VercelContext | undefined })[
    Symbol.for("@vercel/request-context")
  ];
  return context?.get?.()?.waitUntil;
}
