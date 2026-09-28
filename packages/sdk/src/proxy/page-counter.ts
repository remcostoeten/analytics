import { createServerAnalytics } from "../server/client";
import type { ServerConfig, ServerResult, WaitUntil } from "../server/types";

/**
 * @name isPageRequest
 * @description True for a browser loading an HTML page: a GET whose `Sec-Fetch-Dest` is
 * `document`, or that accepts `text/html` when that header is missing, and that is not a prefetch.
 *
 * @example
 * isPageRequest(request); // true for a normal page load
 */
export function isPageRequest(request: Request): boolean {
  const { headers } = request;
  if (request.method !== "GET") return false;
  if ((headers.get("sec-purpose") ?? headers.get("purpose"))?.includes("prefetch")) return false;
  const destination = headers.get("sec-fetch-dest");
  if (destination) return destination === "document";
  return headers.get("accept")?.includes("text/html") ?? false;
}

/**
 * @name createPageCounter
 * @description Counts HTML page requests on the server as `page_request` events, for middleware.
 * Blockers cannot stop these, so comparing them with browser pageviews estimates the share of
 * visitors whose pageviews were blocked. Returns null for requests that are not page loads.
 *
 * @example
 * const countPage = createPageCounter({ secret: env.RA_SECRET, endpoint: "https://api.remcostoeten.nl" });
 * countPage(request, event.waitUntil);
 */
export function createPageCounter(
  options: ServerConfig = {},
): (request: Request, waitUntil?: WaitUntil) => Promise<ServerResult> | null {
  const server = createServerAnalytics(options);
  return function countPage(request, waitUntil) {
    if (!isPageRequest(request)) return null;
    return server.track("page_request", {}, waitUntil ? { request, waitUntil } : { request });
  };
}
