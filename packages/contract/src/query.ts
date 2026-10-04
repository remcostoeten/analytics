import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { Count, dataOf, Id, listOf, Milliseconds, nullable, oneOf, Timestamp } from "./schema";
import createSavedQuery from "../fixtures/CreateSavedQuery/valid/minimal.json";
import queryHistory from "../fixtures/QueryHistory/valid/runs.json";
import queryPlan from "../fixtures/QueryPlan/valid/limit.json";
import queryRequest from "../fixtures/QueryRequest/valid/top-routes.json";
import queryResult from "../fixtures/QueryResult/valid/top-routes.json";
import querySchema from "../fixtures/QuerySchema/valid/people.json";
import savedQueryList from "../fixtures/SavedQueryList/valid/one.json";
import savedQueryResponse from "../fixtures/SavedQueryResponse/valid/bar-chart.json";
import updateSavedQuery from "../fixtures/UpdateSavedQuery/valid/rename.json";

const Statement = Type.String({
  minLength: 1,
  maxLength: 20000,
  description:
    "One `SELECT` or `WITH` statement against the views in `GET /v2/query/schema`. Use `:from`, `:to` and `:project` for bound values.",
});
const Actor = Type.Object(
  { kind: oneOf(["user", "token"]), id: Id },
  { description: "The signed-in user or API token." },
);

export const QueryParams = Type.Object(
  {
    from: Type.Optional(Type.String({ format: "date-time", description: "Bound as `:from`." })),
    to: Type.Optional(Type.String({ format: "date-time", description: "Bound as `:to`." })),
    project: Type.Optional(
      Type.String({ minLength: 1, maxLength: 64, description: "Bound as `:project`." }),
    ),
  },
  { description: "Values for the named parameters in `sql`." },
);
export type QueryParams = Static<typeof QueryParams>;

export const QueryRequest = Type.Object(
  {
    sql: Statement,
    params: Type.Optional(QueryParams),
  },
  { examples: [queryRequest] },
);
export type QueryRequest = Static<typeof QueryRequest>;

export const Cell = Type.Union([Type.String(), Type.Number(), Type.Boolean(), Type.Null()]);
export type Cell = Static<typeof Cell>;

export const QueryResult = Type.Object(
  {
    columns: Type.Array(Type.String(), { description: "Column names, in order." }),
    rows: Type.Array(Type.Array(Cell), {
      description: "One array per row, with values in the order of `columns`.",
    }),
    rowCount: Type.Integer({ minimum: 0, description: "Rows returned." }),
    truncated: Type.Boolean({
      description: "True when the query had more than the 10,000 rows returned.",
    }),
    durationMs: Type.Number({ minimum: 0, description: "Time the query took, in milliseconds." }),
  },
  { examples: [queryResult] },
);
export type QueryResult = Static<typeof QueryResult>;

export const QueryPlan = Type.Object(
  {
    data: Type.Object({
      totalCost: Type.Number({ minimum: 0, description: "Postgres' estimated total cost." }),
      estimatedRows: Type.Number({ minimum: 0, description: "Postgres' estimated row count." }),
      plan: Type.Unknown({
        description: "The plan as Postgres' `EXPLAIN (FORMAT JSON)` gives it.",
      }),
    }),
  },
  { examples: [queryPlan] },
);
export type QueryPlan = Static<typeof QueryPlan>;

export const ViewColumn = Type.Object({
  name: Type.String({ minLength: 1 }),
  type: Type.String({ minLength: 1, description: "The Postgres type." }),
  description: Type.String({ description: "What the column holds." }),
});
export type ViewColumn = Static<typeof ViewColumn>;

export const QuerySchema = Type.Object(
  {
    data: Type.Array(
      Type.Object({
        name: Type.String({ minLength: 1, description: "The view name to select from." }),
        description: Type.String({ description: "What one row of the view is." }),
        columns: Type.Array(ViewColumn),
      }),
    ),
    params: Type.Array(Type.Object({ name: Type.String(), type: Type.String() }), {
      description: "The named parameters a query may use.",
    }),
  },
  { description: "The views SQL can read, with their columns.", examples: [querySchema] },
);
export type QuerySchema = Static<typeof QuerySchema>;

export const QueryRun = Type.Object({
  id: Id,
  actor: Actor,
  projectIds: Type.Array(Type.String(), { description: "The projects the query could read." }),
  sql: Type.String(),
  durationMs: nullable(Milliseconds),
  rowCount: nullable(Count),
  blocked: Type.Boolean({
    description:
      "True when the statement was refused before it ran, such as a write or a blocked function.",
  }),
  error: nullable(Type.String({ description: "Why it was blocked or failed." })),
  createdAt: Timestamp,
});
export type QueryRun = Static<typeof QueryRun>;

export const QueryHistory = listOf(QueryRun, {
  examples: [queryHistory],
});
export type QueryHistory = Static<typeof QueryHistory>;

export const ChartType = oneOf(["table", "line", "bar"], {
  description: "How the query page draws the result.",
});
export type ChartType = Static<typeof ChartType>;

const SavedQueryFields = {
  name: Type.String({ minLength: 1, maxLength: 100 }),
  sql: Statement,
  description: nullable(Type.String({ maxLength: 500, description: "What the query answers." })),
  chart: nullable(ChartType),
};

export const SavedQuery = Type.Object(
  {
    id: Type.String({
      minLength: 1,
      maxLength: 128,
      description: "The saved query id (`sq_...`).",
    }),
    ...SavedQueryFields,
    createdBy: Actor,
    createdAt: Timestamp,
    updatedAt: Timestamp,
  },
  { description: "A query saved for everyone who may run SQL." },
);
export type SavedQuery = Static<typeof SavedQuery>;

export const SavedQueryList = listOf(SavedQuery, {
  examples: [savedQueryList],
});
export type SavedQueryList = Static<typeof SavedQueryList>;

export const SavedQueryResponse = Type.Object(dataOf(SavedQuery).properties, {
  examples: [savedQueryResponse],
});
export type SavedQueryResponse = Static<typeof SavedQueryResponse>;

export const CreateSavedQuery = Type.Object(
  {
    name: SavedQueryFields.name,
    sql: SavedQueryFields.sql,
    description: Type.Optional(SavedQueryFields.description),
    chart: Type.Optional(SavedQueryFields.chart),
  },
  { examples: [createSavedQuery] },
);
export type CreateSavedQuery = Static<typeof CreateSavedQuery>;

export const UpdateSavedQuery = Type.Partial(CreateSavedQuery, {
  minProperties: 1,
  description: "Only the fields sent are changed; send at least one.",
  examples: [updateSavedQuery],
});
export type UpdateSavedQuery = Static<typeof UpdateSavedQuery>;
