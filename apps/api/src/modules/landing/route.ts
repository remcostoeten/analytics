import { Elysia } from "elysia";

import { landingPage } from "./page";
import { landing, routeGroups } from "./service";
import type { ApiRoute, ApiTag } from "./service";

export type LandingOptions = {
  version: string;
  clock: () => Date;
  tags: ApiTag[];
  routes: () => ApiRoute[];
};

function wantsHtml(headers: Headers) {
  return (headers.get("accept") ?? "").includes("text/html");
}

/**
 * @name landingModule
 * @description `GET /` and `GET /v2`: the API's landing page with its status, links and every
 * documented route grouped by tag. Browsers get HTML; any other `Accept` gets the same data as
 * JSON. Both routes are hidden from the OpenAPI document.
 *
 * @example
 * new Elysia().use(landingModule({ version, clock, tags: apiTags, routes: () => api.routes })).use(api);
 */
export function landingModule(options: LandingOptions) {
  let groups: ReturnType<typeof routeGroups> | null = null;

  function render(request: Request) {
    groups ??= routeGroups(options.routes(), options.tags);
    const view = landing({
      version: options.version,
      time: options.clock().toISOString(),
      baseUrl: new URL(request.url).origin,
      groups,
    });
    const html = wantsHtml(request.headers);
    return new Response(html ? landingPage(view) : JSON.stringify(view), {
      headers: {
        "content-type": html ? "text/html; charset=utf-8" : "application/json",
        "cache-control": "public, max-age=300",
        vary: "Accept",
      },
    });
  }

  return new Elysia({ name: "landing" })
    .get("/", ({ request }) => render(request), { detail: { hide: true } })
    .get("/v2", ({ request }) => render(request), { detail: { hide: true } });
}
