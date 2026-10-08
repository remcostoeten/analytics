import type { Fetcher } from "@spoar/shared/http";

/**
 * @name withCookie
 * @description A fetcher that sends the given cookie header on every request, so a server
 * component forwards the browser's session cookie to the API. An empty cookie adds nothing.
 *
 * @example
 * createClient({ endpoint, fetch: withCookie((await cookies()).toString()) });
 */
export function withCookie(cookie: string, base: Fetcher = fetch): Fetcher {
  return (url, init) => {
    const headers = new Headers(init.headers);
    if (cookie.length > 0) headers.set("cookie", cookie);
    return base(url, { ...init, headers });
  };
}
