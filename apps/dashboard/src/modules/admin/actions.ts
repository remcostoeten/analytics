"use server";

import type { ClientError } from "@spoar/client";
import type {
  AddMember,
  CreatedProject,
  CreatedToken,
  CreateProject,
  CreateToken,
  GithubLookup,
  KeyKind,
  KeyStatus,
  MemberResponse,
  RotatedKey,
  UpdatedProject,
  UpdateMember,
  UpdateProject,
} from "@spoar/contract";
import type { Result } from "@spoar/shared/result";
import type { TokenID } from "@spoar/shared/semantic";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
 * @name checkKeys
 * @description Checks one project's keys through the API, stores the result and refreshes its
 * page. A secret key passed in is compared by hash and never stored.
 *
 * @example
 * const checked = await checkKeys("example.com", "sk_live_9b8a7f6e5d4c3b2a1f0e");
 */
export async function checkKeys(
  project: string,
  secretKey: string | null,
): Promise<Result<KeyStatus, ClientError>> {
  const api = await serverClient();
  const result = await api.projects.checkKeys(project, secretKey ? { secretKey } : {});
  if (result.ok) revalidatePath(`/admin/projects/${encodeURIComponent(project)}`);
  return result;
}

/**
 * @name removeProject
 * @description Deletes one project, owner only. Its keys stop at once and the cleanup job purges
 * its rows. On success the caller lands on the project list.
 *
 * @example
 * await removeProject("example.com");
 */
export async function removeProject(project: string): Promise<Result<null, ClientError>> {
  const api = await serverClient();
  const result = await api.projects.remove(project);
  if (!result.ok) return result;
  revalidatePath("/admin/projects");
  redirect("/admin/projects");
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

/**
 * @name lookupGithubLogin
 * @description Asks the API whether a GitHub login exists, for the add form's live check. The
 * answer holds GitHub's casing, numeric id, name and avatar.
 *
 * @example
 * const found = await lookupGithubLogin("octocat");
 */
export async function lookupGithubLogin(login: string): Promise<Result<GithubLookup, ClientError>> {
  const api = await serverClient();
  return api.members.lookup(login);
}

/**
 * @name addMember
 * @description Allows a GitHub login to sign in with a role and projects, owner only. The API
 * checks the login against GitHub and stores its numeric id.
 *
 * @example
 * await addMember({ login: "octocat", role: "analyst", projectIds: ["docs"] });
 */
export async function addMember(input: AddMember): Promise<Result<MemberResponse, ClientError>> {
  const api = await serverClient();
  const result = await api.members.add(input);
  if (result.ok) revalidatePath("/admin/members");
  return result;
}

/**
 * @name updateMember
 * @description Changes the role or projects of a member, owner only.
 *
 * @example
 * await updateMember("octocat", { role: "viewer" });
 */
export async function updateMember(
  login: string,
  changes: UpdateMember,
): Promise<Result<MemberResponse, ClientError>> {
  const api = await serverClient();
  const result = await api.members.update(login, changes);
  if (result.ok) revalidatePath("/admin/members");
  return result;
}

/**
 * @name removeMember
 * @description Takes a login off the sign-in list and signs it out, owner only.
 *
 * @example
 * await removeMember("octocat");
 */
export async function removeMember(login: string): Promise<Result<null, ClientError>> {
  const api = await serverClient();
  const result = await api.members.remove(login);
  if (result.ok) revalidatePath("/admin/members");
  return result;
}
