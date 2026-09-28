import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { Count, Milliseconds } from "./schema";

export const QueryRequest = Type.Object({ sql: Type.String({ minLength: 1, maxLength: 20000 }) });
export type QueryRequest = Static<typeof QueryRequest>;

export const Cell = Type.Union([Type.String(), Type.Number(), Type.Boolean(), Type.Null()]);
export type Cell = Static<typeof Cell>;

export const QueryResult = Type.Object({
  columns: Type.Array(Type.String()),
  rows: Type.Array(Type.Array(Cell)),
  rowCount: Count,
  durationMs: Milliseconds,
});
export type QueryResult = Static<typeof QueryResult>;
