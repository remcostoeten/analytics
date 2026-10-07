import type {
  CreateErrorRule,
  ErrorRuleList,
  ErrorRuleResponse,
  IssueEventList,
  IssueList,
  IssueResponse,
  IssueStatus,
  UpdatedIssue,
  UpdateIssue,
} from "@spoar/contract";
import type { Json } from "@spoar/shared/http";
import type { IssueID } from "@spoar/shared/semantic";

import { basePath } from "../scope";
import { toBody } from "../body";
import type { ClientResult, Page, ScopeState, Send } from "../types";

export type IssuesOptions = Page & { status?: IssueStatus };

export type IssueReads = {
  issues: (options?: IssuesOptions) => ClientResult<IssueList>;
};

export type ProjectIssueReads = IssueReads & {
  issue: (issue: IssueID) => ClientResult<IssueResponse>;
  issueEvents: (issue: IssueID, options?: Page) => ClientResult<IssueEventList>;
  updateIssue: (issue: IssueID, changes: UpdateIssue) => ClientResult<UpdatedIssue>;
  errorRules: () => ClientResult<ErrorRuleList>;
  createErrorRule: (rule: CreateErrorRule) => ClientResult<ErrorRuleResponse>;
  removeErrorRule: (rule: string) => ClientResult<null>;
};

/**
 * @name issueReads
 * @description The error terminals: the `issues` list on any scope, and on a project scope one
 * issue with its events, the status change, and the project's error rules. Issues are not scoped
 * by range or filter, so these take only their own paging and status.
 *
 * @example
 * const reads = issueReads(send, { project: "skriuw", filter: {} });
 * await reads.issues({ status: "open" });
 */
export function issueReads(send: Send, state: ScopeState): ProjectIssueReads {
  const base = basePath(state);

  function issuePath(issue: IssueID) {
    return `${base}/issues/${encodeURIComponent(issue)}`;
  }

  return {
    issues: (options = {}) =>
      send.json<IssueList>({
        method: "GET",
        path: `${base}/issues`,
        query: { status: options.status, limit: options.limit, cursor: options.cursor },
      }),
    issue: (issue) => send.json<IssueResponse>({ method: "GET", path: issuePath(issue) }),
    issueEvents: (issue, options = {}) =>
      send.json<IssueEventList>({
        method: "GET",
        path: `${issuePath(issue)}/events`,
        query: { limit: options.limit, cursor: options.cursor },
      }),
    updateIssue: (issue, changes) =>
      send.json<UpdatedIssue>({ method: "PATCH", path: issuePath(issue), body: toBody(changes) }),
    errorRules: () => send.json<ErrorRuleList>({ method: "GET", path: `${base}/error-rules` }),
    createErrorRule: (rule) =>
      send.json<ErrorRuleResponse>({
        method: "POST",
        path: `${base}/error-rules`,
        body: toBody(rule),
      }),
    removeErrorRule: async (rule) => {
      const result = await send.json<Json>({
        method: "DELETE",
        path: `${base}/error-rules/${encodeURIComponent(rule)}`,
      });
      return result.ok ? { ok: true, value: null } : result;
    },
  };
}
