import type { Nullable } from "@spoar/shared/semantic";

type RankedProject = {
  name: string;
  pageviews: Nullable<number>;
  visitors: Nullable<number>;
};

function countOrLast(count: Nullable<number>) {
  return count ?? -1;
}

/**
 * @name sortByPageviews
 * @description Orders projects from most to fewest pageviews. Visitors and then the name break a
 * tie, and a project whose stats could not be read comes last.
 *
 * @example
 * sortByPageviews(projects)[0]; // the project with the most pageviews
 */
export function sortByPageviews<Project extends RankedProject>(projects: readonly Project[]) {
  return projects.toSorted(
    (first, second) =>
      countOrLast(second.pageviews) - countOrLast(first.pageviews) ||
      countOrLast(second.visitors) - countOrLast(first.visitors) ||
      first.name.localeCompare(second.name),
  );
}
