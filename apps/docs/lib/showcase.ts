import { createClient } from "@spoar/client";
import type { BreakdownRow, PublicProject, StatsResponse, TimeseriesPoint } from "@spoar/contract";
import type { Nullable } from "@spoar/shared/semantic";
import { cacheLife } from "next/cache";

import { apiEndpoint } from "./api-endpoint";

export type Showcase = {
  project: string;
  stats: Nullable<StatsResponse["data"]>;
  series: TimeseriesPoint[];
  pages: BreakdownRow[];
  sources: BreakdownRow[];
};

export type ShowcaseProject = PublicProject & {
  visitors: Nullable<number>;
};

export const showcasePeriod = "30d";

const fallbackProject = "docs.analytics.remcostoeten.nl";

/**
 * @name showcaseProject
 * @description The project the landing page shows: the one this site tracks itself into, from
 * `NEXT_PUBLIC_RA_CONFIG`, else the production docs project.
 *
 * @example
 * showcaseProject(); // "docs.analytics.remcostoeten.nl"
 */
export function showcaseProject() {
  try {
    const config: { project?: string } = JSON.parse(process.env.NEXT_PUBLIC_RA_CONFIG ?? "{}");
    return config.project || fallbackProject;
  } catch {
    return fallbackProject;
  }
}

function scope(project: string) {
  return createClient({ endpoint: apiEndpoint() }).project(project).period(showcasePeriod);
}

/**
 * @name readShowcase
 * @description This site's own numbers for the last 30 days, read from the public API and cached
 * for a minute: the stats, visitors per day, the top pages and the top referrers. A read that
 * fails leaves its part empty, so the page still renders when the API is unreachable at build.
 *
 * @example
 * const { stats, series } = await readShowcase();
 */
export async function readShowcase(): Promise<Showcase> {
  "use cache";
  cacheLife("minutes");
  const project = showcaseProject();
  const reads = scope(project);
  const [stats, series, pages, sources] = await Promise.all([
    reads.stats(),
    reads.timeseries("visitors", { interval: "day" }),
    reads.breakdown("page", { metrics: ["visitors"], limit: 5 }),
    reads.breakdown("referrer_domain", { metrics: ["visitors"], limit: 4 }),
  ]);
  return {
    project,
    stats: stats.ok ? stats.value.data : null,
    series: series.ok ? series.value.data : [],
    pages: pages.ok ? pages.value.data : [],
    sources: sources.ok ? sources.value.data : [],
  };
}

/**
 * @name readProjects
 * @description Every public project on the API with its visitors over the last 30 days, cached
 * for a minute. An empty list means the API gave no answer.
 *
 * @example
 * const projects = await readProjects();
 */
export async function readProjects(): Promise<ShowcaseProject[]> {
  "use cache";
  cacheLife("minutes");
  const api = createClient({ endpoint: apiEndpoint() });
  const list = await api.projects.list();
  if (!list.ok) return [];
  return Promise.all(
    list.value.data.map(async (project) => {
      const stats = await api.project(project.id).period(showcasePeriod).stats();
      return {
        id: project.id,
        name: project.name,
        domain: project.domain,
        visibility: project.visibility,
        createdAt: project.createdAt,
        visitors: stats.ok ? stats.value.data.visitors.value : null,
      };
    }),
  );
}
