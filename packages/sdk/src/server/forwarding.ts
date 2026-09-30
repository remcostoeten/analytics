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
 * @name sessionCookie
 * @description The name of the API's admin session cookie, Better Auth's `session_token` under the
 * `ra` prefix. On HTTPS Better Auth adds the `__Secure-` prefix, which `adminSessionCookie` also
 * matches.
 *
 * @example
 * adminSessionCookie(request.headers.get("cookie"), sessionCookie);
 */
export const sessionCookie = "ra.session_token";

/**
 * @name adminSessionCookie
 * @description The admin session cookie, plain and `__Secure-` prefixed, picked out of a `Cookie`
 * header so it can be forwarded to ingest, which marks events from signed-in admins internal.
 * Every other cookie is dropped. Gives null when neither is present.
 *
 * @example
 * adminSessionCookie("theme=dark; ra.session_token=abc", "ra.session_token"); // "ra.session_token=abc"
 */
export function adminSessionCookie(cookie: string | null, name = sessionCookie): string | null {
  if (!cookie) return null;
  const names = [name, `__Secure-${name}`];
  const kept = cookie
    .split(";")
    .map((pair) => pair.trim())
    .filter((pair) => pair.includes("=") && names.includes(pair.slice(0, pair.indexOf("="))));
  return kept.length > 0 ? kept.join("; ") : null;
}

/**
 * @name siteOrigin
 * @description The public origin of the site that received a request: the `x-forwarded-host` a
 * reverse proxy sets (with `x-forwarded-proto`), else the `host` header, else the request URL.
 * Ingest reads the event's host from the `Origin` it gets, which sets the localhost and preview
 * flags. Gives null when none of them parses.
 *
 * @example
 * siteOrigin(request.headers, request.url); // "https://remcostoeten.nl"
 */
export function siteOrigin(headers: Headers, url?: string): string | null {
  let base: URL | null = null;
  try {
    base = url ? new URL(url) : null;
  } catch {
    base = null;
  }
  const host = headers.get("x-forwarded-host")?.split(",")[0]?.trim() || headers.get("host");
  const protocol =
    headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    base?.protocol.replace(":", "") ||
    "https";
  if (host) {
    try {
      return new URL(`${protocol}://${host}`).origin;
    } catch {
      return base?.origin ?? null;
    }
  }
  return base?.origin ?? null;
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
