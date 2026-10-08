const fallback = "https://api.analytics.remcostoeten.nl";

/**
 * @name apiEndpoint
 * @description The v2 API origin from `NEXT_PUBLIC_API_URL`, without a trailing slash, falling
 * back to production. Read on the server and in the browser alike.
 *
 * @example
 * createClient({ endpoint: apiEndpoint(), credentials: "include" });
 */
export function apiEndpoint() {
  return (process.env.NEXT_PUBLIC_API_URL ?? fallback).replace(/\/+$/, "");
}
