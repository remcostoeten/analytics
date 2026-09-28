import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { Count, dataOf, Id, listOf, Milliseconds, nullable, oneOf, Timestamp } from "./schema";

export const QueryParams = Type.Object({
  from: Type.Optional(Timestamp),
  to: Type.Optional(Timestamp),
  project: Type.Optional(Type.String({ minLength: 1, maxLength: 64 })),
});
export type QueryParams = Static<typeof QueryParams>;

export const QueryRequest = Type.Object({
  sql: Type.String({ minLength: 1, maxLength: 20000 }),
  params: Type.Optional(QueryParams),
});
export type QueryRequest = Static<typeof QueryRequest>;

export const Cell = Type.Union([Type.String(), Type.Number(), Type.Boolean(), Type.Null()]);
export type Cell = Static<typeof Cell>;

export const QueryResult = Type.Object({
  columns: Type.Array(Type.String()),
  rows: Type.Array(Type.Array(Cell)),
  rowCount: Count,
  truncated: Type.Boolean(),
  durationMs: Milliseconds,
});
export type QueryResult = Static<typeof QueryResult>;

export const QueryPlan = Type.Object({
  data: Type.Object({
    totalCost: Type.Number({ minimum: 0 }),
    estimatedRows: Type.Number({ minimum: 0 }),
    plan: Type.Unknown(),
  }),
});
export type QueryPlan = Static<typeof QueryPlan>;

export const ViewColumn = Type.Object({
  name: Type.String({ minLength: 1 }),
  type: Type.String({ minLength: 1 }),
  description: Type.String(),
});
export type ViewColumn = Static<typeof ViewColumn>;

export const QuerySchema = Type.Object({
  data: Type.Array(
    Type.Object({
      name: Type.String({ minLength: 1 }),
      description: Type.String(),
      columns: Type.Array(ViewColumn),
    }),
  ),
  params: Type.Array(Type.Object({ name: Type.String(), type: Type.String() })),
});
export type QuerySchema = Static<typeof QuerySchema>;

export const QueryRun = Type.Object({
  id: Id,
  actor: Type.Object({ kind: oneOf(["user", "token"]), id: Id }),
  projectIds: Type.Array(Type.String()),
  sql: Type.String(),
  durationMs: nullable(Milliseconds),
  rowCount: nullable(Count),
  blocked: Type.Boolean(),
  error: nullable(Type.String()),
  createdAt: Timestamp,
});
export type QueryRun = Static<typeof QueryRun>;

export const QueryHistory = listOf(QueryRun);
export type QueryHistory = Static<typeof QueryHistory>;

export const ChartType = oneOf(["table", "line", "bar"]);
export type ChartType = Static<typeof ChartType>;

const SavedQueryFields = {
  name: Type.String({ minLength: 1, maxLength: 100 }),
  sql: Type.String({ minLength: 1, maxLength: 20000 }),
  description: nullable(Type.String({ maxLength: 500 })),
  chart: nullable(ChartType),
};

export const SavedQuery = Type.Object({
  id: Id,
  ...SavedQueryFields,
  createdBy: Type.Object({ kind: oneOf(["user", "token"]), id: Id }),
  createdAt: Timestamp,
  updatedAt: Timestamp,
});
export type SavedQuery = Static<typeof SavedQuery>;

export const SavedQueryList = listOf(SavedQuery);
export type SavedQueryList = Static<typeof SavedQueryList>;

export const SavedQueryResponse = dataOf(SavedQuery);
export type SavedQueryResponse = Static<typeof SavedQueryResponse>;

export const CreateSavedQuery = Type.Object({
  name: SavedQueryFields.name,
  sql: SavedQueryFields.sql,
  description: Type.Optional(SavedQueryFields.description),
  chart: Type.Optional(SavedQueryFields.chart),
});
export type CreateSavedQuery = Static<typeof CreateSavedQuery>;

export const UpdateSavedQuery = Type.Partial(CreateSavedQuery, { minProperties: 1 });
export type UpdateSavedQuery = Static<typeof UpdateSavedQuery>;
