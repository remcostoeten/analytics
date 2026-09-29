import type { IssueID, ProjectID } from "@remcostoeten/analytics-shared/semantic";

export type AlertLinks = {
  issue: (project: ProjectID, issue: IssueID) => string;
};

/**
 * @name apiLinks
 * @description The links alerts point to, on the API's issue route until the v2 dashboard exists.
 * The one place alert links are built.
 *
 * @example
 * apiLinks("https://api.remcostoeten.nl").issue("remcostoeten.nl", "iss_42");
 * // "https://api.remcostoeten.nl/v2/projects/remcostoeten.nl/issues/iss_42"
 */
export function apiLinks(base: string): AlertLinks {
  const root = base.replace(/\/+$/, "");
  return {
    issue: (project, issue) =>
      `${root}/v2/projects/${encodeURIComponent(project)}/issues/${encodeURIComponent(issue)}`,
  };
}
