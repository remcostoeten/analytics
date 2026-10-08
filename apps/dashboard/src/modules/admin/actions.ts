"use server";

import type { ClientError } from "@spoar/client";
import type {
  CreatedProject,
  CreatedToken,
  CreateProject,
  CreateToken,
  KeyKind,
  RotatedKey,
  UpdatedProject,
  UpdateProject,
} from "@spoar/contract";
import type { Result } from "@spoar/shared/result";
import type { TokenID } from "@spoar/shared/semantic";
import { revalidatePath } from "next/cache";

import { serverClient } from "@/shared/api/server-client";

/**
 * @name createProject
 * @description Creates a project through the API with the caller's session and refreshes the
 * list. The answer holds the secret key once.
 *
 * @example
 * const created = await createProject({ id: "example.com", name: "Example", domain: "example.com" });
 */
export async function createProject(
  input: CreateProject,
): Promise<Result<CreatedProject, ClientError>> {
  const api = await serverClient();
  const result = await api.projects.create(input);
  if (result.ok) revalidatePath("/admin/projects");
  return result;
}

/**
 * @name updateProject
 * @description Changes the given settings of one project and refreshes its page.
 *
 * @example
 * await updateProject("example.com", { visibility: "private" });
 */
export async function updateProject(
  project: string,
  changes: UpdateProject,
): Promise<Result<UpdatedProject, ClientError>> {
  const api = await serverClient();
  const result = await api.projects.update(project, changes);
  if (result.ok) {
    revalidatePath("/admin/projects");
    revalidatePath(`/admin/projects/${encodeURIComponent(project)}`);
  }
  return result;
}

/**
 * @name rotateKey
 * @description Replaces the public or secret key of one project. The old key stops working at
 * once and the new one is in the answer only.
 *
 * @example
 * const rotated = await rotateKey("example.com", "secret");
 */
export async function rotateKey(
  project: string,
  kind: KeyKind,
): Promise<Result<RotatedKey, ClientError>> {
  const api = await serverClient();
  const result = await api.projects.rotateKey(project, kind);
  if (result.ok) revalidatePath(`/admin/projects/${encodeURIComponent(project)}`);
  return result;
}

/**
 * @name createToken
 * @description Creates an API token for scripts, CI or another frontend. The token value is in
 * the answer once.
 *
 * @example
 * const created = await createToken({ name: "CI report", scope: "read", projectIds: ["docs"] });
 */
export async function createToken(input: CreateToken): Promise<Result<CreatedToken, ClientError>> {
  const api = await serverClient();
  const result = await api.tokens.create(input);
  if (result.ok) revalidatePath("/admin/tokens");
  return result;
}

/**
 * @name revokeToken
 * @description Revokes one API token by id; requests with it fail from then on.
 *
 * @example
 * await revokeToken("tok_123");
 */
export async function revokeToken(token: TokenID): Promise<Result<null, ClientError>> {
  const api = await serverClient();
  const result = await api.tokens.revoke(token);
  if (result.ok) revalidatePath("/admin/tokens");
  return result;
}
