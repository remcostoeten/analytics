import {
  CreateErrorRule,
  ErrorRuleList,
  ErrorRuleResponse,
  IssueEventList,
  IssueList,
  IssueResponse,
  UpdatedIssue,
  UpdateIssue,
} from "@spoar/contract";
import { Elysia, t } from "elysia";

import type { AccessDeps } from "../../access/types";
import { access } from "../../plugins/access";
import { errorResponses } from "../../plugins/error-responses";
import { readGate } from "../reads/guard";
import type { ReadsOptions } from "../reads/guard";
import {
  createErrorRule,
  deleteErrorRule,
  issueDetail,
  issueEvents,
  listErrorRules,
  listIssues,
  updateIssue,
} from "./service";
import { issuesQuery, pagingQuery } from "../reads/query";

const tags = ["Issues"];
const responses = { ...errorResponses, 429: errorResponses[400] };

/**
 * @name issuesModule
 * @description Error tracking under `/v2/projects/:project`: issues, one issue, its events at the
 * `detail` level, an admin status change, and the admin `/error-rules` for ignore patterns and
 * mutes. Any breakdown narrows to one issue with `filter[issue]=iss_<id>`.
 *
 * @example
 * app.use(issuesModule(deps, reads, docsBase));
 */
export function issuesModule(deps: AccessDeps, options: ReadsOptions, docsBase: string) {
  const gate = readGate(options, docsBase);
  const store = options.issues;

  return new Elysia({ name: "issues" })
    .use(access(deps, docsBase))
    .get(
      "/projects/:project/issues",
      ({ request, caller, project, set }) =>
        gate.answer(request, caller, project, set, "private", (params, id) =>
          listIssues(store, params, [id]),
        ),
      {
        query: issuesQuery,
        access: "detail",
        response: { 200: IssueList, ...responses },
        detail: {
          summary: "Issues",
          description: "Grouped errors, most recently seen first; `status` narrows the list.",
          tags,
        },
      },
    )
    .get(
      "/projects/:project/issues/:issue",
      ({ request, caller, project, params: path, set }) =>
        gate.answer(request, caller, project, set, "private", (_, id) =>
          issueDetail(store, [id], path.issue),
        ),
      {
        access: "detail",
        response: { 200: IssueResponse, ...responses },
        detail: { summary: "One issue", description: "By its `iss_` id.", tags },
      },
    )
    .get(
      "/projects/:project/issues/:issue/events",
      ({ request, caller, project, params: path, set }) =>
        gate.answer(request, caller, project, set, "private", (params, id) =>
          issueEvents(store, [id], path.issue, params),
        ),
      {
        query: pagingQuery,
        access: "detail",
        response: { 200: IssueEventList, ...responses },
        detail: {
          summary: "An issue's events",
          description: "Newest first, with the parsed stack, breadcrumbs, release and device.",
          tags,
        },
      },
    )
    .patch(
      "/projects/:project/issues/:issue",
      ({ request, caller, project, params: path, body, set }) =>
        gate.answer(request, caller, project, set, "private", (_, id) =>
          updateIssue(store, [id], path.issue, body.status),
        ),
      {
        access: "admin",
        body: UpdateIssue,
        response: { 200: UpdatedIssue, ...responses },
        detail: {
          summary: "Resolve, ignore or reopen an issue",
          description: "A resolved issue that happens again reopens as a regression.",
          tags,
        },
      },
    )
    .get(
      "/projects/:project/error-rules",
      ({ request, caller, project, set }) =>
        gate.answer(request, caller, project, set, "private", (_, id) => listErrorRules(store, id)),
      {
        access: "admin",
        response: { 200: ErrorRuleList, ...responses },
        detail: {
          summary: "Error rules",
          description:
            "Ignore patterns on the message or stack, then muted issues as `mute_iss_<id>` rules.",
          tags,
        },
      },
    )
    .post(
      "/projects/:project/error-rules",
      async ({ request, caller, project, body, set }) => {
        const created = await gate.answer(request, caller, project, set, "private", (_, id) =>
          createErrorRule(store, id, body, options.clock()),
        );
        if (set.status === 200) set.status = 201;
        return created;
      },
      {
        access: "admin",
        body: CreateErrorRule,
        response: { 201: ErrorRuleResponse, ...responses },
        detail: {
          summary: "Add an error rule",
          description:
            "`ignore` drops new errors whose message or stack contains `pattern`, ignoring case. `mute` ignores an issue until a date, a count of further occurrences, or whichever comes first, then reopens it.",
          tags,
        },
      },
    )
    .delete(
      "/projects/:project/error-rules/:rule",
      async ({ request, caller, project, params: path, set, status }) => {
        const removed = await gate.answer(request, caller, project, set, "private", (_, id) =>
          deleteErrorRule(store, id, path.rule),
        );
        return removed === null ? status(204, undefined) : removed;
      },
      {
        access: "admin",
        response: { 204: t.Void(), ...responses },
        detail: {
          summary: "Remove an error rule",
          description: "Deleting a `mute_iss_<id>` rule unmutes and reopens the issue.",
          tags,
        },
      },
    );
}
