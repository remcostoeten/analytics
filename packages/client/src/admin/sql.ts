import type {
  CreateSavedQuery,
  QueryHistory,
  QueryParams,
  QueryPlan,
  QuerySchema,
  SavedQueryList,
  SavedQueryResponse,
  UpdateSavedQuery,
} from "@spoar/contract";
import type { Json } from "@spoar/shared/http";

import { toBody } from "../body";
import type { ClientResult, Send } from "../types";

export type SqlAdmin = {
  explain: (sql: string, params?: QueryParams) => ClientResult<QueryPlan>;
  schema: () => ClientResult<QuerySchema>;
  history: () => ClientResult<QueryHistory>;
  saved: () => ClientResult<SavedQueryList>;
  save: (query: CreateSavedQuery) => ClientResult<SavedQueryResponse>;
  get: (query: string) => ClientResult<SavedQueryResponse>;
  update: (query: string, changes: UpdateSavedQuery) => ClientResult<SavedQueryResponse>;
  remove: (query: string) => ClientResult<null>;
};

/**
 * @name sqlAdmin
 * @description The SQL routes around running a query: `explain` a statement, the `schema` of the
 * views SQL may read, the caller's run `history`, and the saved queries. Running a query is a
 * terminal on a scope (`client.query(sql)` or `client.project("x").query(sql)`).
 *
 * @example
 * await sqlAdmin(send).save({ name: "Top routes", sql: "select route, count(*) from pageviews group by 1" });
 */
export function sqlAdmin(send: Send): SqlAdmin {
  function savedPath(query: string) {
    return `/v2/queries/${encodeURIComponent(query)}`;
  }

  return {
    explain: (sql, params) =>
      send.json<QueryPlan>({
        method: "POST",
        path: "/v2/query/explain",
        body: toBody(params ? { sql, params } : { sql }),
      }),
    schema: () => send.json<QuerySchema>({ method: "GET", path: "/v2/query/schema" }),
    history: () => send.json<QueryHistory>({ method: "GET", path: "/v2/queries/history" }),
    saved: () => send.json<SavedQueryList>({ method: "GET", path: "/v2/queries" }),
    save: (query) =>
      send.json<SavedQueryResponse>({ method: "POST", path: "/v2/queries", body: toBody(query) }),
    get: (query) => send.json<SavedQueryResponse>({ method: "GET", path: savedPath(query) }),
    update: (query, changes) =>
      send.json<SavedQueryResponse>({
        method: "PATCH",
        path: savedPath(query),
        body: toBody(changes),
      }),
    remove: async (query) => {
      const result = await send.json<Json>({ method: "DELETE", path: savedPath(query) });
      return result.ok ? { ok: true, value: null } : result;
    },
  };
}
