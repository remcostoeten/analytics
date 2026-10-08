import type { Fetcher } from "@spoar/shared/http";

/**
 * @name withCredentials
 * @description A fetcher that sends the browser's cookies to the API origin and accepts the
 * cookies it sets, which cross-origin fetches leave out by default.
 *
 * @example
 * request({ method: "POST", url, body, fetch: withCredentials() });
 */
export function withCredentials(base: Fetcher = fetch): Fetcher {
  return (url, init) => base(url, { ...init, credentials: "include" });
}
