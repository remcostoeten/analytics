import { mergeConfig, parseConfig, readEnv } from "../core/config";
import { eventsUrl, visitorDetails } from "../server/forwarding";
import type { Fetcher } from "../server/types";

export type ProxyConfig = {
  secret?: string;
  endpoint?: string;
  fetch?: Fetcher;
};

const maxBody = 64 * 1024;

function refuse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

function crossSite(request: Request) {
  const { headers } = request;
  const site = headers.get("sec-fetch-site");
  if (site) return site === "cross-site";
  const origin = headers.get("origin");
  if (!origin) return false;
  try {
    const hosts = [new URL(request.url).host, headers.get("host"), headers.get("x-forwarded-host")];
    return !hosts.includes(new URL(origin).host);
  } catch {
    return true;
  }
}

/**
 * @name createProxy
 * @description A fetch-standard `(request) => Response` handler for a same-origin path such as
 * `/_ra`, so ad blockers see a first-party request. It refuses other methods, cross-site requests
 * (by `Sec-Fetch-Site`, else by comparing `Origin` with the request's host) and bodies over
 * 64 KB, then forwards the body to `POST /v2/events` with the project secret and the visitor's IP
 * and user agent as `X-Visitor-IP` and `X-Visitor-UA`, and returns the API's answer. Options missing here are read from the JSON in `RA_CONFIG`.
 *
 * @example
 * export const POST = createProxy({ secret: env.RA_SECRET, endpoint: "https://api.remcostoeten.nl" });
 */
export function createProxy(options: ProxyConfig = {}): (request: Request) => Promise<Response> {
  const config = mergeConfig(parseConfig(readEnv(() => process.env.RA_CONFIG)), options);
  const send: Fetcher = config.fetch ?? ((url, init) => fetch(url, init));

  return async function proxy(request: Request) {
    if (!config.secret || !config.endpoint) {
      return refuse(500, "INTERNAL", "The analytics proxy needs a secret and an endpoint");
    }
    if (request.method !== "POST") {
      return refuse(405, "VALIDATION_FAILED", "Only POST is accepted");
    }
    if (crossSite(request)) {
      return refuse(403, "FORBIDDEN_ORIGIN", "Events must come from this site");
    }
    const body = await request.text();
    if (new TextEncoder().encode(body).length > maxBody) {
      return refuse(413, "PAYLOAD_TOO_LARGE", "The body is over 64 KB");
    }
    const visitor = visitorDetails(request.headers);
    const headers = new Headers({
      "content-type": "application/json",
      authorization: `Bearer ${config.secret}`,
    });
    if (visitor.ip) headers.set("x-visitor-ip", visitor.ip);
    if (visitor.userAgent) headers.set("x-visitor-ua", visitor.userAgent);
    try {
      const response = await send(eventsUrl(config.endpoint), { method: "POST", headers, body });
      return new Response(await response.text(), {
        status: response.status,
        headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
      });
    } catch {
      return refuse(502, "UNAVAILABLE", "The analytics API could not be reached");
    }
  };
}
