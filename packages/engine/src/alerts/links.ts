import type { IssueID, ProjectID } from "@remcostoeten/analytics-shared/semantic";

export type AlertLinks = {
  issue: (project: ProjectID, issue: IssueID) => string;
  speed: (project: ProjectID) => string;
};

/**
 * @name apiLinks
 * @description The links alerts point to, on the API's issue and speed routes until the v2
 * dashboard exists.
 * The one place alert links are built.
 *
 * @example
 * apiLinks("https://api.analytics.remcostoeten.nl").issue("remcostoeten.nl", "iss_42");
 * // "https://api.analytics.remcostoeten.nl/v2/projects/remcostoeten.nl/issues/iss_42"
 */
export function apiLinks(base: string): AlertLinks {
  let root = base;
  while (root.endsWith("/")) root = root.slice(0, -1);
  return {
    issue: (project, issue) =>
      `${root}/v2/projects/${encodeURIComponent(project)}/issues/${encodeURIComponent(issue)}`,
    speed: (project) => `${root}/v2/projects/${encodeURIComponent(project)}/speed`,
  };
}
