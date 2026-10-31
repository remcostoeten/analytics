import type { ProjectBreakdownRow, PublicProject } from "@spoar/contract";
import type { Nullable } from "@spoar/shared/semantic";

export type RankedProject = {
  id: string;
  name: string;
  domain: string;
  visitors: number;
  pageviews: number;
  change: Nullable<number>;
  speedScore: Nullable<number>;
  openIssues: Nullable<number>;
};

/**
 * @name rankProjects
 * @description Joins the readable projects with their traffic rows and ranks them by visitors,
 * highest first, then by name. A project with no traffic in the range stays in the list with zeros
 * and no change.
 *
 * @example
 * const ranked = rankProjects(projects.value, traffic.value.data);
 * ranked[0].visitors;
 */
export function rankProjects(
  projects: PublicProject[],
  rows: ProjectBreakdownRow[],
): RankedProject[] {
  const traffic = new Map(rows.map((row) => [row.value, row]));
  return projects
    .map((project) => {
      const row = traffic.get(project.id);
      return {
        id: project.id,
        name: project.name,
        domain: project.domain,
        visitors: row?.visitors ?? 0,
        pageviews: row?.pageviews ?? 0,
        change: row?.change.visitors ?? null,
        speedScore: row?.speedScore ?? null,
        openIssues: row?.openIssues ?? null,
      };
    })
    .sort((left, right) => right.visitors - left.visitors || left.name.localeCompare(right.name));
}
