"use server";

import type { ClientError } from "@spoar/client";
import type { IssueStatus, UpdatedIssue } from "@spoar/contract";
import type { Result } from "@spoar/shared/result";
import type { IssueID } from "@spoar/shared/semantic";
import { revalidatePath } from "next/cache";

import { serverClient } from "@/shared/api/server-client";

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
