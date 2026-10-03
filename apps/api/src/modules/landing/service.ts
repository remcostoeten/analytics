import type { Nullable, Path, Timestamp } from "@remcostoeten/analytics-shared/semantic";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

export type ApiRoute = {
  method: string;
  path: string;
  hooks: { detail?: { summary?: string; tags?: string[]; hide?: boolean } };
};

export type ApiTag = { name: string; description: string };

export type RouteEntry = { method: string; path: Path; summary: string };

export type RouteGroup = ApiTag & { routes: RouteEntry[] };

export type HealthView = {
  ok: true;
  version: string;
  time: Timestamp;
  runtime: string;
  bootedAt: Timestamp;
  geo: { city: Nullable<string>; asn: Nullable<string>; loadMs: number };
};

type HistoryWeek = { week: Timestamp; total: number; days: number[] };

export type History = { repo: string; weeks: HistoryWeek[]; total: number };

export type HistorySource = { repo: string; send: typeof fetch; token: Nullable<string> };

export type Landing = {
  name: string;
  baseUrl: string;
  links: { docs: string; openapi: string; health: string; source: string; author: string };
  health: HealthView;
  groups: RouteGroup[];
  history: Nullable<History>;
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

const CommitActivity = Type.Array(
  Type.Object(
    { total: Type.Number(), week: Type.Number(), days: Type.Array(Type.Number()) },
    { additionalProperties: true },
  ),
);

/**
 * @name fetchHistory
 * @description Reads the last 52 weeks of commits per day from GitHub's commit activity endpoint. GitHub
 * answers 202 while it computes the statistics; that, any other failure and a malformed body
 * give `null`, so the page renders without the chart. A `token` raises the rate limit from 60
 * to 5000 requests an hour, which shared egress addresses need.
 *
 * @example
 * const history = await fetchHistory({ repo: "remcostoeten/analytics", send: fetch, token: null });
 */
export async function fetchHistory(source: HistorySource): Promise<Nullable<History>> {
  try {
    const response = await source.send(
      `https://api.github.com/repos/${source.repo}/stats/commit_activity`,
      {
        headers: {
          accept: "application/vnd.github+json",
          "user-agent": "spoar-api",
          ...(source.token ? { authorization: `Bearer ${source.token}` } : {}),
        },
      },
    );
    if (response.status !== 200) return null;
    const body: unknown = await response.json();
    if (!Value.Check(CommitActivity, body)) return null;
    const weeks = body.map((item) => ({
      week: new Date(item.week * 1000).toISOString(),
      total: item.total,
      days: item.days,
    }));
    return { repo: source.repo, weeks, total: weeks.reduce((sum, w) => sum + w.total, 0) };
  } catch {
    return null;
  }
}

/**
 * @name landing
 * @description The public description of the API served at `/` and `/v2`: links, the health
 * details, every documented route grouped by tag and the commit history when it loaded.
 *
 * @example
 * const view = landing({ baseUrl: "https://api.analytics.remcostoeten.nl", health, groups, history: null });
 */
export function landing(input: {
  baseUrl: string;
  health: HealthView;
  groups: RouteGroup[];
  history: Nullable<History>;
}): Landing {
  return {
    name: "Spoar API",
    baseUrl: input.baseUrl,
    links: {
      docs: `${input.baseUrl}/v2/openapi`,
      openapi: `${input.baseUrl}/v2/openapi/json`,
      health: `${input.baseUrl}/v2/health`,
      source: "https://github.com/remcostoeten/analytics",
      author: "https://remcostoeten.nl",
    },
    health: input.health,
    groups: input.groups,
    history: input.history,
  };
}
