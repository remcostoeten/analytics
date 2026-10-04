import type { Nullable } from "@remcostoeten/analytics-shared/semantic";
import { Elysia } from "elysia";

const allowedHeaders = "content-type, authorization, x-project-key, x-request-id";
const exposedHeaders = "x-request-id, retry-after";
const widgetSession = "/v2/widget/session";

export type CorsOptions = {
  dashboardOrigin: Nullable<string>;
  widgetOrigin?: (origin: string) => Promise<boolean>;
};

async function credentialed(origin: string, path: string, options: CorsOptions) {
  if (origin === options.dashboardOrigin) return true;
  return path === widgetSession && options.widgetOrigin ? options.widgetOrigin(origin) : false;
}

/**
 * @name cors
 * @description CORS for every route. The dashboard origin gets credentials, and so does any origin
 * that `widgetOrigin` accepts on `GET /v2/widget/session`, so the dev widget can send the admin
 * session cookie from a customer site; any other origin gets `*` without credentials, which is
 * what ingest and the bearer-token widget reads need, because the engine checks the origin
 * against the project key's allowed origins itself. Preflight requests answer 204 here.
 *
 * @example
 * new Elysia().use(cors({ dashboardOrigin: "https://analytics.remcostoeten.nl" }));
 */
export function cors(options: CorsOptions) {
  return new Elysia({ name: "cors" }).onRequest(async ({ request, set }) => {
    const origin = request.headers.get("origin");
    if (origin) {
      const allowed = await credentialed(origin, new URL(request.url).pathname, options);
      set.headers["access-control-allow-origin"] = allowed ? origin : "*";
      set.headers["access-control-expose-headers"] = exposedHeaders;
      if (allowed) {
        set.headers["access-control-allow-credentials"] = "true";
        set.headers.vary = "Origin";
      }
    }
    if (request.method !== "OPTIONS") return;
    set.headers["access-control-allow-methods"] = "GET, POST, PATCH, DELETE, OPTIONS";
    set.headers["access-control-allow-headers"] = allowedHeaders;
    set.headers["access-control-max-age"] = "86400";
    const headers = new Headers();
    for (const [name, value] of Object.entries(set.headers)) headers.set(name, String(value));
    return new Response(null, { status: 204, headers });
  });
}
