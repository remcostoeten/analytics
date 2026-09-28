import { engineError } from "@remcostoeten/analytics-engine";
import type { EngineError } from "@remcostoeten/analytics-engine";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

import type { AccessDeps, Caller, SignedIn } from "./types";

const bearer = /^Bearer\s+(\S+)$/i;
const tokenPrefix = "at_";

/**
 * @name bearerToken
 * @description The token in an `Authorization: Bearer` header, or null.
 *
 * @example
 * bearerToken(request.headers); // "at_live_..."
 */
export function bearerToken(headers: Headers): Nullable<string> {
  const header = headers.get("authorization");
  return header ? (bearer.exec(header)?.[1] ?? null) : null;
}

/**
 * @name sameSecret
 * @description Compares two secrets in time that does not depend on where they first differ.
 *
 * @example
 * sameSecret(given, process.env.CRON_SECRET);
 */
export function sameSecret(given: string, expected: string): boolean {
  const left = new TextEncoder().encode(given);
  const right = new TextEncoder().encode(expected);
  let difference = left.length ^ right.length;
  for (let index = 0; index < right.length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

function unauthorized(message: string): Result<Caller, EngineError> {
  return err(engineError("UNAUTHORIZED", message));
}

async function tokenCaller(token: string, deps: AccessDeps): Promise<Result<Caller, EngineError>> {
  const found = await deps.tokens.byHash(await deps.hasher.sha256(token));
  if (!found.ok) return found;
  const record = found.value;
  if (!record) return unauthorized("The API token is not valid");
  const now = deps.clock();
  if (record.expiresAt && record.expiresAt <= now) return unauthorized("The API token has expired");
  const touched = await deps.tokens.touch(record.id, now);
  if (!touched.ok) return touched;
  return ok({
    kind: "token",
    tokenId: record.id,
    scope: record.scope,
    projectIds: record.projectIds,
  });
}

async function userCaller(
  signedIn: SignedIn,
  deps: AccessDeps,
): Promise<Result<Caller, EngineError>> {
  const membership = await deps.members.membership(signedIn.userId);
  if (!membership.ok) return membership;
  if (!membership.value) return ok({ kind: "anonymous" });
  const { role, projectIds } = membership.value;
  return ok({ kind: "user", signedIn, role, projectIds });
}

/**
 * @name resolveCaller
 * @description Who is calling: an API token from `Authorization: Bearer at_...`, else a signed-in
 * member from the session cookie, else anonymous. An unknown or expired token is `UNAUTHORIZED`
 * rather than anonymous, so a broken script fails loudly. A valid token's `lastUsedAt` is updated.
 *
 * @example
 * const caller = await resolveCaller(request.headers, deps);
 */
export async function resolveCaller(
  headers: Headers,
  deps: AccessDeps,
): Promise<Result<Caller, EngineError>> {
  const token = bearerToken(headers);
  if (token?.startsWith(tokenPrefix)) return tokenCaller(token, deps);
  const signedIn = await deps.sessions(headers);
  return signedIn ? userCaller(signedIn, deps) : ok({ kind: "anonymous" });
}
