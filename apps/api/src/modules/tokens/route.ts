import { CreatedToken, CreateToken, TokenList } from "@remcostoeten/analytics-contract";
import type { EngineError } from "@remcostoeten/analytics-engine";
import { Elysia, t } from "elysia";

import type { AccessDeps } from "../../access/types";
import { access } from "../../plugins/access";
import { failure } from "../../plugins/error-handler";
import { errorResponses } from "../../plugins/error-responses";
import { createToken, listTokens, revokeToken } from "./service";

const tags = ["Tokens"];

/**
 * @name tokensModule
 * @description `/v2/tokens` for organization admins: list API tokens without their values, create
 * one (its value is returned once), and revoke one.
 *
 * @example
 * app.use(tokensModule(deps, docsBase));
 */
export function tokensModule(deps: AccessDeps, docsBase: string) {
  function reject(
    error: EngineError,
    set: { status?: unknown; headers: { [name: string]: unknown } },
  ) {
    const failed = failure(error, set.headers, docsBase);
    set.status = failed.status;
    return failed.body;
  }

  return new Elysia({ name: "tokens" })
    .use(access(deps, docsBase))
    .get(
      "/tokens",
      async ({ set }) => {
        const listed = await listTokens(deps);
        return listed.ok ? { data: listed.value, nextCursor: null } : reject(listed.error, set);
      },
      {
        access: "admin",
        response: { 200: TokenList, ...errorResponses },
        detail: {
          summary: "List API tokens",
          description: "Token values are never returned.",
          tags,
        },
      },
    )
    .post(
      "/tokens",
      async ({ body, set, status }) => {
        const created = await createToken(deps, body);
        return created.ok ? status(201, { data: created.value }) : reject(created.error, set);
      },
      {
        access: "admin",
        body: CreateToken,
        response: { 201: CreatedToken, ...errorResponses },
        detail: {
          summary: "Create an API token",
          description:
            "Scope `read`, `sql` or `admin`, limited to `projectIds` or all projects when null. The token is in this response only.",
          tags,
        },
      },
    )
    .delete(
      "/tokens/:token",
      async ({ params, set, status }) => {
        const revoked = await revokeToken(deps, params.token);
        return revoked.ok ? status(204, undefined) : reject(revoked.error, set);
      },
      {
        access: "admin",
        response: { 204: t.Void(), ...errorResponses },
        detail: { summary: "Revoke an API token", description: "It stops working at once.", tags },
      },
    );
}
