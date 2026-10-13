import type { ApiToken, ProjectResponse } from "@spoar/contract";
import type { ClientError } from "@spoar/client";
import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";
import { cacheLife } from "next/cache";

import { serverClient } from "@/shared/api/server-client";

/**
 * @name listTokens
 * @description The API tokens the admin may see. Cached per session for five minutes in the
 * browser, so the tokens page renders with its prefetched shell; creating or revoking a token
 * revalidates and clears it.
 *
 * @example
 * const tokens = await listTokens();
 * if (tokens.ok) render(tokens.value);
 */
export async function listTokens(): Promise<Result<ApiToken[], ClientError>> {
  "use cache: private";
  cacheLife("minutes");
  const api = await serverClient();
  const listed = await api.tokens.list();
  return listed.ok ? ok(listed.value.data) : err(listed.error);
}

/**
 * @name readProject
 * @description One project with its settings when the caller may change them. Cached per session
 * for five minutes in the browser, so a link that prefetches the settings page shows the form at
 * once; saving, rotating a key or deleting revalidates and clears it.
 *
 * @example
 * const found = await readProject("example.com");
 * if (found.ok) render(found.value);
 */
export async function readProject(
  project: string,
): Promise<Result<ProjectResponse["data"], ClientError>> {
  "use cache: private";
  cacheLife("minutes");
  const api = await serverClient();
  const found = await api.projects.get(project);
  return found.ok ? ok(found.value.data) : err(found.error);
}
