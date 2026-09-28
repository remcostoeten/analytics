import type { Nullable } from "@remcostoeten/analytics-shared/semantic";
import { Elysia } from "elysia";

const allowedHeaders = "content-type, authorization, x-project-key, x-request-id";
const exposedHeaders = "x-request-id, retry-after";

/**
 * @name cors
 * @description CORS for every route. The dashboard origin gets credentials; any other origin gets
 * `*` without credentials, which is what ingest needs, because the engine checks the origin
 * against the project key's allowed origins itself. Preflight requests answer 204 here.
 *
 * @example
 * new Elysia().use(cors({ dashboardOrigin: "https://analytics.remcostoeten.nl" }));
 */
export function cors(options: { dashboardOrigin: Nullable<string> }) {
  return new Elysia({ name: "cors" }).onRequest(({ request, set }) => {
    const origin = request.headers.get("origin");
    if (origin) {
      const dashboard = origin === options.dashboardOrigin;
      set.headers["access-control-allow-origin"] = dashboard ? origin : "*";
      set.headers["access-control-expose-headers"] = exposedHeaders;
      if (dashboard) {
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
