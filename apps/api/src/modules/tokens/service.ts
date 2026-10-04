import type { ApiToken, CreatedToken, CreateToken } from "@spoar/contract";
import { engineError } from "@spoar/engine";
import type { EngineError, TokenRecord } from "@spoar/engine";
import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";

import { randomSecret } from "../../access/secrets";
import type { AccessDeps } from "../../access/types";

function iso(date: Date | null) {
  return date ? date.toISOString() : null;
}

/**
 * @name tokenShape
 * @description A token as `GET /v2/tokens` lists it, without the token itself.
 *
 * @example
 * tokenShape(record);
 */
function tokenShape(token: TokenRecord): ApiToken {
  return {
    id: token.id,
    name: token.name,
    scope: token.scope,
    projectIds: token.projectIds,
    lastUsedAt: iso(token.lastUsedAt),
    expiresAt: iso(token.expiresAt),
    createdAt: token.createdAt.toISOString(),
  };
}

/**
 * @name listTokens
 * @description Every API token, oldest first, without the token values. Widget tokens are never
 * listed.
 *
 * @example
 * await listTokens(deps);
 */
export async function listTokens(deps: AccessDeps): Promise<Result<ApiToken[], EngineError>> {
  const found = await deps.tokens.list("api");
  return found.ok ? ok(found.value.map(tokenShape)) : found;
}

/**
 * @name createToken
 * @description Creates an API token. The `at_live_` value is returned once and stored as its
 * sha256 hash. An expiry in the past is `VALIDATION_FAILED`.
 *
 * @example
 * await createToken(deps, { name: "CI report", scope: "read", projectIds: ["docs"] });
 */
export async function createToken(
  deps: AccessDeps,
  input: CreateToken,
): Promise<Result<CreatedToken["data"], EngineError>> {
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  if (expiresAt && expiresAt <= deps.clock()) {
    return err(engineError("VALIDATION_FAILED", "expiresAt must be in the future"));
  }
  const token = randomSecret("at_live_", 16);
  const created = await deps.tokens.create({
    id: randomSecret("tok_", 8),
    kind: "api",
    name: input.name,
    scope: input.scope,
    projectIds: input.projectIds ?? null,
    expiresAt,
    tokenHash: await deps.hasher.sha256(token),
  });
  if (!created.ok) return created;
  const shaped = tokenShape(created.value);
  return ok({
    id: shaped.id,
    name: shaped.name,
    scope: shaped.scope,
    projectIds: shaped.projectIds,
    token,
    expiresAt: shaped.expiresAt,
    createdAt: shaped.createdAt,
  });
}

/**
 * @name revokeToken
 * @description Deletes a token, so it stops working at once. An unknown id is `NOT_FOUND`.
 *
 * @example
 * await revokeToken(deps, "tok_01j8z7");
 */
export async function revokeToken(
  deps: AccessDeps,
  id: string,
): Promise<Result<void, EngineError>> {
  const revoked = await deps.tokens.revoke(id);
  if (!revoked.ok) return revoked;
  return revoked.value ? ok(undefined) : err(engineError("NOT_FOUND", "Token not found"));
}
