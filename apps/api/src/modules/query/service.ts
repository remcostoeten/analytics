import type {
  CreateSavedQuery,
  QueryHistory,
  QueryPlan,
  QueryRequest,
  QueryResult,
  QuerySchema,
  SavedQueryList,
  SavedQueryResponse,
  UpdateSavedQuery,
} from "@spoar/contract";
import { engineError, prepareQuery, queryViews } from "@spoar/engine";
import type {
  EngineError,
  QueryActor,
  QueryLog,
  QueryRunner,
  RateLimiter,
  SavedQuery,
  SavedQueryStore,
} from "@spoar/engine";
import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";

import type { Caller } from "../../access/types";
import { toCsv } from "../reads/csv";

export type QueryOptions = {
  runner: QueryRunner;
  log: QueryLog;
  saved: SavedQueryStore;
  limiter: RateLimiter;
  perMinute: number;
};

type Reply<Value> = Promise<Result<Value, EngineError>>;

const historyLimit = 100;

/**
 * @name queryActor
 * @description Who is running a query, for the rate limit and the `query_runs` log: the signed-in
 * user or the token, and null for anyone else.
 *
 * @example
 * queryActor(caller); // { kind: "user", id: "user_1" }
 */
export function queryActor(caller: Caller): QueryActor | null {
  if (caller.kind === "user") return { kind: "user", id: caller.signedIn.userId };
  if (caller.kind === "token") return { kind: "token", id: caller.tokenId };
  return null;
}

async function limited(options: QueryOptions, actor: QueryActor): Promise<EngineError | null> {
  const decision = await options.limiter.hit(
    `query:${actor.kind}:${actor.id}`,
    options.perMinute,
    60,
  );
  if (decision.allowed) return null;
  return {
    ...engineError("RATE_LIMITED", `At most ${options.perMinute} queries a minute`),
    details: { retryAfterSeconds: decision.retryAfterSeconds },
  };
}

/**
 * @name runQuery
 * @description Runs one console query for an actor over a set of projects: rate limited per
 * actor, checked by `prepareQuery`, run by the engine's read-only runner, and logged in
 * `query_runs` whether it ran, failed or was blocked.
 *
 * @example
 * await runQuery(options, { kind: "user", id: "user_1" }, ["remcostoeten.nl"], { sql: "select 1" });
 */
export async function runQuery(
  options: QueryOptions,
  actor: QueryActor,
  projectIds: string[],
  request: QueryRequest,
): Reply<QueryResult> {
  const refused = await limited(options, actor);
  if (refused) return err(refused);
  const base = { actor, projectIds, statement: request.sql };
  const prepared = prepareQuery(request.sql, request.params ?? {});
  if (!prepared.ok) {
    const logged = await options.log.record({
      ...base,
      durationMs: null,
      rowCount: null,
      blocked: true,
      error: prepared.error.message,
    });
    return logged.ok ? prepared : logged;
  }
  const started = performance.now();
  const result = await options.runner.run(prepared.value, projectIds);
  const durationMs = Math.round(performance.now() - started);
  const logged = await options.log.record({
    ...base,
    durationMs,
    rowCount: result.ok ? result.value.rows.length : null,
    blocked: false,
    error: result.ok ? null : result.error.message,
  });
  if (!logged.ok) return logged;
  if (!result.ok) return result;
  return ok({
    columns: result.value.columns,
    rows: result.value.rows,
    rowCount: result.value.rows.length,
    truncated: result.value.truncated,
    durationMs,
  });
}

/**
 * @name explainQuery
 * @description Postgres' plan and cost estimate for a console query, checked and scoped the same
 * way as a run, so the console can warn before running something heavy.
 *
 * @example
 * await explainQuery(options, actor, ["remcostoeten.nl"], { sql: "select * from events" });
 */
export async function explainQuery(
  options: QueryOptions,
  actor: QueryActor,
  projectIds: string[],
  request: QueryRequest,
): Reply<QueryPlan> {
  const refused = await limited(options, actor);
  if (refused) return err(refused);
  const prepared = prepareQuery(request.sql, request.params ?? {});
  if (!prepared.ok) return prepared;
  const plan = await options.runner.explain(prepared.value, projectIds);
  return plan.ok ? ok({ data: plan.value }) : plan;
}

/**
 * @name queryHistory
 * @description The latest 100 runs: everyone's for the owner, the caller's own for anyone else.
 *
 * @example
 * await queryHistory(options.log, actor, false);
 */
export async function queryHistory(
  log: QueryLog,
  actor: QueryActor,
  everyone: boolean,
): Reply<QueryHistory> {
  const runs = await log.history(everyone ? null : actor, historyLimit);
  if (!runs.ok) return runs;
  return ok({
    data: runs.value.map((run) => ({
      id: run.id,
      actor: run.actor,
      projectIds: run.projectIds,
      sql: run.statement,
      durationMs: run.durationMs,
      rowCount: run.rowCount,
      blocked: run.blocked,
      error: run.error,
      createdAt: run.createdAt.toISOString(),
    })),
    nextCursor: null,
  });
}

/**
 * @name querySchema
 * @description Every view the console can read, with its columns, types and descriptions, and
 * the bound parameters a query may use.
 *
 * @example
 * querySchema().data.map((view) => view.name);
 */
export function querySchema(): QuerySchema {
  return {
    data: queryViews,
    params: [
      { name: "from", type: "timestamptz" },
      { name: "to", type: "timestamptz" },
      { name: "project", type: "text" },
    ],
  };
}

/**
 * @name queryCsv
 * @description A query result as CSV with a header row.
 *
 * @example
 * queryCsv(result);
 */
export function queryCsv(result: QueryResult): string {
  return toCsv(result.columns, result.rows);
}

const sampleParams = {
  from: "2026-01-01T00:00:00.000Z",
  to: "2026-01-02T00:00:00.000Z",
  project: "example",
};

function shapeSaved(query: SavedQuery) {
  return {
    id: query.id,
    name: query.name,
    sql: query.sql,
    description: query.description,
    chart: query.chart,
    createdBy: query.createdBy,
    createdAt: query.createdAt.toISOString(),
    updatedAt: query.updatedAt.toISOString(),
  };
}

function checkable(sql: string | undefined): Result<null, EngineError> {
  if (sql === undefined) return ok(null);
  const prepared = prepareQuery(sql, sampleParams);
  return prepared.ok ? ok(null) : prepared;
}

function missing() {
  return err(engineError("NOT_FOUND", "Saved query not found"));
}

/**
 * @name listSaved
 * @description Every saved query, by name; they are shared by everyone who may run SQL.
 *
 * @example
 * await listSaved(options.saved);
 */
export async function listSaved(store: SavedQueryStore): Reply<SavedQueryList> {
  const found = await store.list();
  return found.ok ? ok({ data: found.value.map(shapeSaved), nextCursor: null }) : found;
}

/**
 * @name getSaved
 * @description One saved query, or `NOT_FOUND`.
 *
 * @example
 * await getSaved(options.saved, "sq_1");
 */
export async function getSaved(store: SavedQueryStore, id: string): Reply<SavedQueryResponse> {
  const found = await store.get(id);
  if (!found.ok) return found;
  return found.value ? ok({ data: shapeSaved(found.value) }) : missing();
}

/**
 * @name createSaved
 * @description Saves a query after the same checks a run gets, so a saved query always passes
 * `prepareQuery`.
 *
 * @example
 * await createSaved(options.saved, actor, { name: "Signups", sql: "select 1" });
 */
export async function createSaved(
  store: SavedQueryStore,
  actor: QueryActor,
  body: CreateSavedQuery,
): Reply<SavedQueryResponse> {
  const checked = checkable(body.sql);
  if (!checked.ok) return checked;
  const created = await store.create({
    name: body.name,
    sql: body.sql,
    description: body.description ?? null,
    chart: body.chart ?? null,
    createdBy: actor,
  });
  return created.ok ? ok({ data: shapeSaved(created.value) }) : created;
}

/**
 * @name changeSaved
 * @description Changes or deletes a saved query: its creator and the owner may, anyone else gets
 * `FORBIDDEN`. `patch` null deletes.
 *
 * @example
 * await changeSaved(options.saved, actor, false, "sq_1", { name: "Renamed" });
 */
export async function changeSaved(
  store: SavedQueryStore,
  actor: QueryActor,
  owner: boolean,
  id: string,
  patch: UpdateSavedQuery | null,
): Reply<SavedQueryResponse | null> {
  const found = await store.get(id);
  if (!found.ok) return found;
  if (!found.value) return missing();
  const creator = found.value.createdBy;
  if (!owner && (creator.kind !== actor.kind || creator.id !== actor.id)) {
    return err(engineError("FORBIDDEN", "Only its creator or the owner may change a saved query"));
  }
  if (!patch) {
    const removed = await store.remove(id);
    return removed.ok ? ok(null) : removed;
  }
  const checked = checkable(patch.sql);
  if (!checked.ok) return checked;
  const updated = await store.update(id, patch);
  if (!updated.ok) return updated;
  return updated.value ? ok({ data: shapeSaved(updated.value) }) : missing();
}
