import {
  IssueEventList,
  IssueList,
  IssueResponse,
  UpdatedIssue,
  UpdateIssue,
} from "@remcostoeten/analytics-contract";
import { Elysia } from "elysia";

import type { AccessDeps } from "../../access/types";
import { access } from "../../plugins/access";
import { errorResponses } from "../../plugins/error-responses";
import { readGate } from "../reads/guard";
import type { ReadsOptions } from "../reads/guard";
import { issueDetail, issueEvents, listIssues, updateIssue } from "./service";

const tags = ["Issues"];
const responses = { ...errorResponses, 429: errorResponses[400] };

/**
 * @name issuesModule
 * @description Error tracking under `/v2/projects/:project`: issues, one issue, its events at the
 * `detail` level, and an admin status change. Any breakdown narrows to one issue with
 * `filter[issue]=iss_<id>`.
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
    );
}
