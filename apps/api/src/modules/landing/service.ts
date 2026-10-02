import type { Path, Timestamp } from "@remcostoeten/analytics-shared/semantic";

export type ApiRoute = {
  method: string;
  path: string;
  hooks: { detail?: { summary?: string; tags?: string[]; hide?: boolean } };
};

export type ApiTag = { name: string; description: string };

export type RouteEntry = { method: string; path: Path; summary: string };

export type RouteGroup = ApiTag & { routes: RouteEntry[] };

export type Landing = {
  name: string;
  version: string;
  status: "ok";
  time: Timestamp;
  runtime: string;
  baseUrl: string;
  links: { docs: string; openapi: string; health: string; guide: string; source: string };
  groups: RouteGroup[];
};

const methodOrder = ["GET", "POST", "PUT", "PATCH", "DELETE", "ALL"];

function methodRank(method: string) {
  const rank = methodOrder.indexOf(method);
  return rank === -1 ? methodOrder.length : rank;
}

/**
 * @name routeGroups
 * @description Groups the documented API routes by their first OpenAPI tag, in the order of
 * `tags`, sorted by path then method. Hidden routes, untagged routes and `OPTIONS` are left out.
 *
 * @example
 * const groups = routeGroups(api.routes, apiTags);
 */
export function routeGroups(routes: ApiRoute[], tags: ApiTag[]): RouteGroup[] {
  const byTag = new Map<string, RouteEntry[]>();
  for (const route of routes) {
    const detail = route.hooks.detail;
    const tag = detail?.tags?.[0];
    if (!tag || detail.hide || route.method === "OPTIONS") continue;
    const entries = byTag.get(tag) ?? [];
    entries.push({ method: route.method, path: route.path, summary: detail.summary ?? "" });
    byTag.set(tag, entries);
  }
  return tags.flatMap((tag) => {
    const entries = byTag.get(tag.name);
    if (!entries) return [];
    const sorted = [...entries].sort(
      (a, b) => a.path.localeCompare(b.path) || methodRank(a.method) - methodRank(b.method),
    );
    return [{ ...tag, routes: sorted }];
  });
}

/**
 * @name landing
 * @description The public description of the API served at `/` and `/v2`: name, version, status,
 * the links that matter and every documented route grouped by tag.
 *
 * @example
 * const view = landing({ version, time: new Date().toISOString(), runtime: "bun 1.3.14", baseUrl: "https://api.analytics.remcostoeten.nl", groups });
 */
export function landing(input: {
  version: string;
  time: Timestamp;
  runtime: string;
  baseUrl: string;
  groups: RouteGroup[];
}): Landing {
  return {
    name: "Analytics API",
    version: input.version,
    status: "ok",
    time: input.time,
    runtime: input.runtime,
    baseUrl: input.baseUrl,
    links: {
      docs: `${input.baseUrl}/v2/openapi`,
      openapi: `${input.baseUrl}/v2/openapi/json`,
      health: `${input.baseUrl}/v2/health`,
      guide: "https://docs.analytics.remcostoeten.nl",
      source: "https://github.com/remcostoeten/analytics",
    },
    groups: input.groups,
  };
}
