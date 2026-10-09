"use server";

import type { ClientError } from "@spoar/client";
import type { IssueStatus, UpdatedIssue } from "@spoar/contract";
import type { Result } from "@spoar/shared/result";
import type { IssueID } from "@spoar/shared/semantic";
import { revalidatePath } from "next/cache";

import { serverClient } from "@/shared/api/server-client";

import { feedLimit } from "./realtime";
import type { RealtimeSnapshot } from "./realtime";

/**
 * @name updateIssueStatus
 * @description Sets one issue's status through the API with the caller's session and refreshes
 * the issue list and detail. Resolving stamps `resolvedAt`; a later occurrence reopens the issue
 * as a regression.
 *
 * @example
 * await updateIssueStatus("skriuw", "iss_01J8ZC", "resolved");
 */
export async function updateIssueStatus(
  project: string,
  issue: IssueID,
  status: IssueStatus,
): Promise<Result<UpdatedIssue, ClientError>> {
  const api = await serverClient();
  const result = await api.project(project).updateIssue(issue, { status });
  if (result.ok) {
    const base = `/projects/${encodeURIComponent(project)}/issues`;
    revalidatePath(base);
    revalidatePath(`${base}/${encodeURIComponent(issue)}`);
  }
  return result;
}

/**
 * @name readRealtime
 * @description One realtime poll for the panel: the five-minute summary, the latest live events,
 * and the active visitors and sessions, which need the detail level and come back as their own
 * `Result` so the panel can show a sign-in note for them alone.
 *
 * @example
 * const snapshot = await readRealtime("skriuw");
 */
export async function readRealtime(project: string): Promise<RealtimeSnapshot> {
  const api = await serverClient();
  const scope = api.project(project);
  const [summary, events, visitors, sessions] = await Promise.all([
    scope.realtime(),
    scope.realtimeEvents({ limit: feedLimit }),
    scope.realtimeVisitors({ limit: 50 }),
    scope.realtimeSessions({ limit: 50 }),
  ]);
  return { at: new Date().toISOString(), summary, events, visitors, sessions };
}
