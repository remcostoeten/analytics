import type { Milliseconds, Nullable } from "@remcostoeten/analytics-shared/semantic";
import { Elysia } from "elysia";

import { landingPage } from "./page";
import { fetchHistory, landing, routeGroups } from "./service";
import type { ApiRoute, ApiTag, History, HistorySource } from "./service";

export type LandingOptions = {
  version: string;
  clock: () => Date;
  tags: ApiTag[];
  routes: () => ApiRoute[];
  geo: { city: Nullable<string>; asn: Nullable<string>; loadMs: number };
  history: Nullable<HistorySource>;
};

const historyTtl: Milliseconds = 60 * 60 * 1000;

function wantsHtml(headers: Headers) {
  return (headers.get("accept") ?? "").includes("text/html");
}

/**
 * @name landingModule
 * @description `GET /` and `GET /v2`: the health details, every documented route grouped by tag
 * and, with a `history` source, the repository's commits per week for the last year, cached for
 * an hour. Browsers get HTML; any other `Accept` gets the same data as JSON. Both routes are
 * hidden from the OpenAPI document.
 *
 * @example
 * new Elysia().use(landingModule({ version, clock, tags: apiTags, routes: () => api.routes, geo, history: null })).use(api);
 */
export function landingModule(options: LandingOptions) {
  const bootedAt = options.clock().toISOString();
  const runtime = process.versions.bun
    ? `bun ${process.versions.bun}`
    : `node ${process.versions.node}`;
  let groups: ReturnType<typeof routeGroups> | null = null;
  let cached: { history: History; at: number } | null = null;

  async function history(): Promise<Nullable<History>> {
    if (!options.history) return null;
    const now = options.clock().getTime();
    if (cached && now - cached.at < historyTtl) return cached.history;
    const fresh = await fetchHistory(options.history);
    if (fresh) cached = { history: fresh, at: now };
    return fresh ?? cached?.history ?? null;
  }

  async function render(request: Request) {
    groups ??= routeGroups(options.routes(), options.tags);
    const view = landing({
      baseUrl: new URL(request.url).origin,
      health: {
        ok: true,
        version: options.version,
        time: options.clock().toISOString(),
        runtime,
        bootedAt,
        geo: options.geo,
      },
      groups,
      history: await history(),
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
