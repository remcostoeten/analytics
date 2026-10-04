import type { Result } from "@spoar/shared/result";
import type { ProjectID } from "@spoar/shared/semantic";

import type { EngineError } from "../errors";
import type { PreparedQuery } from "../query/guard";

export type Cell = string | number | boolean | null;

export type QueryOutput = { columns: string[]; rows: Cell[][]; truncated: boolean };

export type QueryPlan = { totalCost: number; estimatedRows: number; plan: unknown };

export type QueryActor = { kind: "user" | "token"; id: string };

export type QueryRun = {
  actor: QueryActor;
  projectIds: ProjectID[];
  statement: string;
  durationMs: number | null;
  rowCount: number | null;
  blocked: boolean;
  error: string | null;
};

export type QueryRunRecord = QueryRun & { id: string; createdAt: Date };

type Reply<Value> = Promise<Result<Value, EngineError>>;

export type QueryRunner = {
  run: (query: PreparedQuery, projectIds: ProjectID[]) => Reply<QueryOutput>;
  explain: (query: PreparedQuery, projectIds: ProjectID[]) => Reply<QueryPlan>;
};

export type QueryLog = {
  record: (run: QueryRun) => Reply<null>;
  history: (actor: QueryActor | null, limit: number) => Reply<QueryRunRecord[]>;
};

export type Chart = "table" | "line" | "bar";

export type SavedQuery = {
  id: string;
  name: string;
  sql: string;
  description: string | null;
  chart: Chart | null;
  createdBy: QueryActor;
  createdAt: Date;
  updatedAt: Date;
};

export type NewSavedQuery = Pick<
  SavedQuery,
  "name" | "sql" | "description" | "chart" | "createdBy"
>;

export type SavedQueryPatch = Partial<Pick<SavedQuery, "name" | "sql" | "description" | "chart">>;

export type SavedQueryStore = {
  list: () => Reply<SavedQuery[]>;
  get: (id: string) => Reply<SavedQuery | null>;
  create: (query: NewSavedQuery) => Reply<SavedQuery>;
  update: (id: string, patch: SavedQueryPatch) => Reply<SavedQuery | null>;
  remove: (id: string) => Reply<boolean>;
};
