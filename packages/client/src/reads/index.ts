import { scope } from "../scope";
import type { Scope } from "../scope";
import type { ScopeState, Send } from "../types";
import { aggregateReads } from "./aggregate";
import type { AggregateReads } from "./aggregate";
import { detailReads, peopleReads } from "./details";
import type { DetailReads, PeopleReads, ProjectDetailReads } from "./details";
import { downloadReads, projectDownloadReads } from "./download";
import type { DownloadReads, ProjectDownloadReads } from "./download";
import { exploreReads } from "./explore";
import type { ExploreReads } from "./explore";
import { issueReads } from "./issues";
import type { IssueReads, ProjectIssueReads } from "./issues";
import { allOnlyReads, projectOnlyReads } from "./project";
import type { AllOnlyReads, ProjectOnlyReads } from "./project";
import { speedReads } from "./speed";
import type { SpeedReads } from "./speed";

type Shared = AggregateReads & ExploreReads & SpeedReads;

export type ProjectReads = Shared &
  ProjectIssueReads &
  ProjectDetailReads &
  ProjectOnlyReads & { download: ProjectDownloadReads };

export type AllReads = Shared &
  IssueReads &
  DetailReads &
  PeopleReads &
  AllOnlyReads & { download: DownloadReads };

export type ProjectScope = Scope<ProjectReads>;

export type AllScope = Scope<AllReads>;

function emptyState(project: string | null): ScopeState {
  return { project, filter: {} };
}

/**
 * @name projectScope
 * @description A chainable scope over one project: every link narrows the range, traffic,
 * environment or filters, and every terminal is one read route under `/v2/projects/:project`.
 *
 * @example
 * const skriuw = projectScope(send, "skriuw");
 * await skriuw.period("7d").where({ country: "NL" }).stats();
 */
export function projectScope(send: Send, project: string): ProjectScope {
  return scope(emptyState(project), (state) => ({
    ...aggregateReads(send, state),
    ...exploreReads(send, state),
    ...speedReads(send, state),
    ...issueReads(send, state),
    ...detailReads(send, state),
    ...projectOnlyReads(send, state),
    download: projectDownloadReads(send, state),
  }));
}

/**
 * @name allScope
 * @description A chainable scope over every project the caller may read, on the combined routes
 * under `/v2`. `project` is a dimension here, so `where({ project: "skriuw" })` narrows it.
 *
 * @example
 * await allScope(send).period("30d").projectBreakdown();
 */
export function allScope(send: Send): AllScope {
  return scope(emptyState(null), (state) => {
    const { issues } = issueReads(send, state);
    const { events, visitors, sessions } = detailReads(send, state);
    return {
      ...aggregateReads(send, state),
      ...exploreReads(send, state),
      ...speedReads(send, state),
      ...peopleReads(send),
      ...allOnlyReads(send, state),
      issues,
      events,
      visitors,
      sessions,
      download: downloadReads(send, state),
    };
  });
}
