import type { CreatedToken, CreateToken, TokenList } from "@spoar/contract";
import type { Json } from "@spoar/shared/http";
import type { TokenID } from "@spoar/shared/semantic";

import { toBody } from "../body";
import type { ClientResult, Send } from "../types";

export type TokensAdmin = {
  list: () => ClientResult<TokenList>;
  create: (token: CreateToken) => ClientResult<CreatedToken>;
  revoke: (token: TokenID) => ClientResult<null>;
};

/**
 * @name tokensAdmin
 * @description The API token routes, admin only: list, create (the token value is in the answer
 * once) and revoke. Widget tokens never appear in the list.
 *
 * @example
 * await tokensAdmin(send).create({ name: "CI report", scope: "read", projectIds: ["skriuw"] });
 */
export function tokensAdmin(send: Send): TokensAdmin {
  return {
    list: () => send.json<TokenList>({ method: "GET", path: "/v2/tokens" }),
    create: (token) =>
      send.json<CreatedToken>({ method: "POST", path: "/v2/tokens", body: toBody(token) }),
    revoke: async (token) => {
      const result = await send.json<Json>({
        method: "DELETE",
        path: `/v2/tokens/${encodeURIComponent(token)}`,
      });
      return result.ok ? { ok: true, value: null } : result;
    },
  };
}
