import type { Result } from "@remcostoeten/analytics-shared/result";
import type { ProjectID } from "@remcostoeten/analytics-shared/semantic";

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
