"use server";

import type { AnnotationInput, ClientError } from "@spoar/client";
import type { Annotation, IssueStatus, UpdatedIssue } from "@spoar/contract";
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

function revalidateProject(project: string) {
  revalidatePath(`/projects/${encodeURIComponent(project)}`, "layout");
}

/**
 * @name createAnnotation
 * @description Adds a dated label to a project's time series through the admin annotations
 * routes and refreshes the project's charts.
 *
 * @example
 * await createAnnotation("skriuw", { title: "v2.0 released", date: "2026-10-01", kind: "release" });
 */
export async function createAnnotation(
  project: string,
  input: AnnotationInput,
): Promise<Result<Annotation, ClientError>> {
  const api = await serverClient();
  const result = await api.annotations.create(project, input);
  if (result.ok) revalidateProject(project);
  return result;
}

/**
 * @name removeAnnotation
 * @description Deletes one annotation by id and refreshes the project's charts.
 *
 * @example
 * await removeAnnotation("skriuw", "ann_01J8ZC");
 */
export async function removeAnnotation(
  project: string,
  id: string,
): Promise<Result<null, ClientError>> {
  const api = await serverClient();
  const result = await api.annotations.remove(project, id);
  if (result.ok) revalidateProject(project);
  return result;
}
