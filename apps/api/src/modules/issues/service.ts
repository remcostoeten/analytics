import type {
  DeviceType,
  IssueEventList,
  IssueList,
  IssueResponse,
  UpdatedIssue,
} from "@remcostoeten/analytics-contract";
import { engineError, parseStack } from "@remcostoeten/analytics-engine";
import type {
  EngineError,
  IssueEventRecord,
  IssueRecord,
  IssueStatus,
  IssueStore,
} from "@remcostoeten/analytics-engine";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";

import { nextCursor, readPage } from "../reads/params";

type Reply<Value> = Promise<Result<Value, EngineError>>;

type Kind = "navigation" | "click" | "fetch" | "event";

const statuses = new Set<string>(["open", "resolved", "ignored"]);
const kinds = new Set<string>(["navigation", "click", "fetch", "event"]);
const deviceTypes = new Set<string>(["desktop", "mobile", "tablet", "bot", "unknown"]);
// A breadcrumb line: Unix milliseconds, the kind, then the message.
const crumbLine = /^(\d{10,16}) (\w+) (.*)$/;

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function shapeIssue(issue: IssueRecord) {
  return {
    id: issue.id,
    title: issue.title,
    culprit: issue.culprit,
    level: issue.level,
    status: issue.status,
    isRegression: issue.isRegression,
    count: issue.count,
    visitors: issue.visitors,
    firstSeen: issue.firstSeen.toISOString(),
    lastSeen: issue.lastSeen.toISOString(),
    firstRelease: issue.firstRelease,
    lastRelease: issue.lastRelease,
    resolvedAt: issue.resolvedAt ? issue.resolvedAt.toISOString() : null,
  };
}

function breadcrumbs(value: unknown) {
  return text(value)
    .split("\n")
    .flatMap((line) => {
      const match = crumbLine.exec(line);
      if (!match?.[1] || !match[2] || !kinds.has(match[2])) return [];
      return [
        {
          ts: new Date(Number(match[1])).toISOString(),
          kind: match[2] as Kind,
          message: match[3] ?? "",
        },
      ];
    })
    .slice(-20);
}

function shapeEvent(event: IssueEventRecord) {
  const type = event.device.type ?? "unknown";
  return {
    id: event.id,
    ts: event.ts.toISOString(),
    visitor: event.visitorId ?? "unknown",
    release: event.release,
    environment: text(event.props.environment) || null,
    page: { path: event.path || "/" },
    error: {
      type: text(event.props.type) || "Error",
      message: text(event.props.message),
      stack: parseStack(text(event.props.stack)),
    },
    breadcrumbs: breadcrumbs(event.props.breadcrumbs),
    device: {
      type: (deviceTypes.has(type) ? type : "unknown") as DeviceType,
      browser: event.device.browser,
      browserVersion: event.device.browserVersion,
      os: event.device.os,
      osVersion: event.device.osVersion,
      screen: event.device.screen,
      viewport: event.device.viewport,
      language: event.device.language,
      connection: event.device.connection,
    },
  };
}

async function found(store: IssueStore, projectIds: string[], id: string): Reply<IssueRecord> {
  const issue = await store.get(projectIds, id);
  if (!issue.ok) return issue;
  return issue.value ? ok(issue.value) : err(engineError("NOT_FOUND", "Issue not found"));
}

/**
 * @name listIssues
 * @description Issues most recently seen first, optionally by `status`, paged with a cursor.
 *
 * @example
 * await listIssues(store, params, ["remcostoeten.nl"]);
 */
export async function listIssues(
  store: IssueStore,
  params: URLSearchParams,
  projectIds: string[],
): Reply<IssueList> {
  const status = params.get("status");
  if (status !== null && !statuses.has(status)) {
    return err(engineError("VALIDATION_FAILED", `Unknown status ${status}`));
  }
  const page = readPage(params);
  if (!page.ok) return page;
  const listed = await store.list(projectIds, status as IssueStatus | null, page.value);
  if (!listed.ok) return listed;
  return ok({
    data: listed.value.rows.map(shapeIssue),
    nextCursor: nextCursor(page.value.offset, listed.value.rows.length, listed.value.total),
  });
}

/**
 * @name issueDetail
 * @description One issue by its `iss_` id, or `NOT_FOUND`.
 *
 * @example
 * await issueDetail(store, ["remcostoeten.nl"], "iss_42");
 */
export async function issueDetail(
  store: IssueStore,
  projectIds: string[],
  id: string,
): Reply<IssueResponse> {
  const issue = await found(store, projectIds, id);
  return issue.ok ? ok({ data: shapeIssue(issue.value) }) : issue;
}

/**
 * @name issueEvents
 * @description An issue's stored events newest first: the error with its parsed stack, the
 * breadcrumbs, release, environment, page and device.
 *
 * @example
 * await issueEvents(store, ["remcostoeten.nl"], "iss_42", params);
 */
export async function issueEvents(
  store: IssueStore,
  projectIds: string[],
  id: string,
  params: URLSearchParams,
): Reply<IssueEventList> {
  const page = readPage(params);
  if (!page.ok) return page;
  const issue = await found(store, projectIds, id);
  if (!issue.ok) return issue;
  const listed = await store.events(issue.value, page.value);
  if (!listed.ok) return listed;
  return ok({
    data: listed.value.rows.map(shapeEvent),
    nextCursor: nextCursor(page.value.offset, listed.value.rows.length, listed.value.total),
  });
}

/**
 * @name updateIssue
 * @description Sets an issue's status; resolving stamps `resolvedAt` and a later occurrence
 * reopens it as a regression.
 *
 * @example
 * await updateIssue(store, ["remcostoeten.nl"], "iss_42", "resolved");
 */
export async function updateIssue(
  store: IssueStore,
  projectIds: string[],
  id: string,
  status: IssueStatus,
): Reply<UpdatedIssue> {
  const issue = await found(store, projectIds, id);
  if (!issue.ok) return issue;
  const updated = await store.setStatus(issue.value, status);
  if (!updated.ok) return updated;
  return ok({
    data: {
      id: updated.value.id,
      status: updated.value.status,
      resolvedAt: updated.value.resolvedAt ? updated.value.resolvedAt.toISOString() : null,
    },
  });
}
