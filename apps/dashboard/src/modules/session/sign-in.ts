import { request } from "@spoar/shared/http";
import type { Json } from "@spoar/shared/http";
import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";

import { apiEndpoint } from "@/shared/api/endpoint";
import { withCredentials } from "@/shared/api/with-credentials";

function redirectUrl(body: Json): string | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  return typeof body.url === "string" ? body.url : null;
}

/**
 * @name startSignIn
 * @description Asks the API to begin GitHub sign-in and returns the GitHub URL to send the
 * browser to. After GitHub, the API sets the session cookie and redirects to `callbackURL`.
 *
 * @example
 * const started = await startSignIn(`${location.origin}/admin/projects`);
 * if (started.ok) location.assign(started.value);
 */
export async function startSignIn(callbackURL: string): Promise<Result<string, string>> {
  const answer = await request({
    method: "POST",
    url: `${apiEndpoint()}/v2/auth/sign-in/social`,
    body: { provider: "github", callbackURL },
    fetch: withCredentials(),
  });
  if (!answer.ok) return err(answer.error.message);
  const url = redirectUrl(answer.value.body);
  return url ? ok(url) : err("The API did not return a sign-in URL.");
}

/**
 * @name signOut
 * @description Ends the API session and clears its cookie.
 *
 * @example
 * await signOut();
 * router.refresh();
 */
export async function signOut(): Promise<Result<null, string>> {
  const answer = await request({
    method: "POST",
    url: `${apiEndpoint()}/v2/auth/sign-out`,
    body: {},
    fetch: withCredentials(),
  });
  return answer.ok ? ok(null) : err(answer.error.message);
}
