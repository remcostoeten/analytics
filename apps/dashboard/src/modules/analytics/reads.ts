import type {
  BreakdownResponse,
  ProjectList,
  PublicProject,
  TimeseriesResponse,
} from "@spoar/contract";
import { createClient } from "@spoar/client";
import type { Client, ProjectScope } from "@spoar/client";
import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";
import { cacheLife } from "next/cache";
import { cookies } from "next/headers";

import { apiEndpoint } from "@/shared/api/endpoint";
import { serverClient } from "@/shared/api/server-client";
import { hasSessionCookie } from "@/shared/api/session-cookie";

import type { MetricView } from "./metrics";
import { viewScope } from "./scope";
import { speedFilters } from "./speed";
import type { FilterDimension, ViewFilters, ViewState } from "./view-state";

export type SplitSeries = { value: string; total: number | null; series: TimeseriesResponse };

type Projects = Result<ProjectList["data"], string>;

function projectsOf(listed: Awaited<ReturnType<Client<string>["projects"]["list"]>>): Projects {
  return listed.ok ? ok(listed.value.data) : err(listed.error.message);
}

async function listPublicProjects(): Promise<Projects> {
  "use cache";
  cacheLife("minutes");
  return projectsOf(await createClient({ endpoint: apiEndpoint() }).projects.list());
}

async function listMemberProjects(): Promise<Projects> {
  "use cache: private";
  cacheLife("minutes");
  const api = await serverClient();
  return projectsOf(await api.projects.list());
}

/**
 * @name listProjects
 * @description Every project the caller may read: public ones when signed out, private ones too
 * for members, with every setting for admins. The public list is read without a cookie and shared
 * by every anonymous visitor for a minute, so a crawler walking the public pages does not list the
 * projects once per page. A member's list is cached per session for five minutes in the browser,
 * so the sidebar and headings render with a route's prefetched shell. A server action that
 * revalidates clears it.
 *
 * @example
 * const projects = await listProjects();
 */
export async function listProjects(): Promise<Projects> {
  const jar = await cookies();
  return hasSessionCookie(jar.toString()) ? listMemberProjects() : listPublicProjects();
}

/**
 * @name readScope
 * @description The read scope for one project and the view in the URL: its period, traffic and
 * filters.
 *
 * @example
 * const scope = await readScope("skriuw", state);
 * const stats = await scope.stats();
 */
export async function readScope(project: string, state: ViewState): Promise<ProjectScope> {
  return viewScope(await serverClient(), project, state);
}

/**
 * @name readSplitSeries
 * @description One series per top value of a dimension, for the summary chart's split view. Empty
 * values are skipped, because the API cannot filter on them.
 *
 * @example
 * const split = await readSplitSeries(scope, metricView("visitors"), "country", 5);
 */
export async function readSplitSeries(
  scope: ProjectScope,
  view: MetricView,
  dimension: FilterDimension,
  limit: number,
): Promise<Result<SplitSeries[], string>> {
  const top = await scope.breakdown(dimension, { limit, metrics: [view.count] });
  if (!top.ok) return err(top.error.message);
  const rows = top.value.data.filter((row) => row.value !== "");
  const series = await Promise.all(
    rows.map(async (row) => {
      const filter: ViewFilters = {};
      filter[dimension] = row.value;
      const read = await scope.where(filter).timeseries(view.series);
      const total = row[view.count] ?? null;
      return read.ok
        ? ok({ value: row.value, total, series: read.value })
        : err(read.error.message);
    }),
  );
  const failed = series.find((entry) => !entry.ok);
  if (failed && !failed.ok) return err(failed.error);
  return ok(series.flatMap((entry) => (entry.ok ? [entry.value] : [])));
}

/**
 * @name readTopList
 * @description The top values of one dimension, ranked by the metric's count.
 *
 * @example
 * const pages = await readTopList(scope, "page", "visitors", 5);
 */
export async function readTopList(
  scope: ProjectScope,
  dimension: FilterDimension,
  count: MetricView["count"],
  limit: number,
): Promise<Result<BreakdownResponse, string>> {
  const read = await scope.breakdown(dimension, { limit, metrics: [count] });
  return read.ok ? ok(read.value) : err(read.error.message);
}

/**
 * @name speedScope
 * @description The read scope for the speed routes of one project: its period and only the route,
 * path and country filters, which are the ones speed accepts. Traffic is always human there.
 *
 * @example
 * const scope = await speedScope("skriuw", state);
 * const vitals = await scope.speed({ percentile: state.percentile, device: state.device });
 */
export async function speedScope(project: string, state: ViewState): Promise<ProjectScope> {
  const api = await serverClient();
  return api.project(project).period(state.period).where(speedFilters(state.filters));
}

/**
 * @name findProject
 * @description One project from the caller's readable list, or null when it does not exist or is
 * hidden from them. Shares the per-request listing with `listProjects`.
 *
 * @example
 * const project = await findProject("skriuw");
 * if (!project) notFound();
 */
export async function findProject(id: string): Promise<PublicProject | null> {
  const projects = await listProjects();
  return projects.ok ? (projects.value.find((entry) => entry.id === id) ?? null) : null;
}
