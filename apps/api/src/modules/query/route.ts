import {
  QueryHistory,
  QueryPlan,
  QueryRequest,
  QueryResult,
  QuerySchema,
} from "@remcostoeten/analytics-contract";
import { engineError } from "@remcostoeten/analytics-engine";
import type { EngineError, ProjectRecord, QueryActor } from "@remcostoeten/analytics-engine";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";
import { Elysia, t } from "elysia";

import { canQuery } from "../../access/rules";
import type { AccessDeps, Caller } from "../../access/types";
import { access } from "../../plugins/access";
import { failure } from "../../plugins/error-handler";
import { errorResponses } from "../../plugins/error-responses";
import type { Set } from "../reads/guard";
import { explainQuery, queryActor, queryCsv, queryHistory, querySchema, runQuery } from "./service";
import type { QueryOptions } from "./service";

const tags = ["SQL"];
const responses = { ...errorResponses, 429: errorResponses[400] };

function wantsCsv(request: Request) {
  return (
    new URL(request.url).searchParams.get("format") === "csv" ||
    Boolean(request.headers.get("accept")?.includes("text/csv"))
  );
}

function signedIn(caller: Caller): Result<QueryActor, EngineError> {
  const actor = queryActor(caller);
  return actor ? ok(actor) : err(engineError("UNAUTHORIZED", "Sign in or send an API token"));
}

/**
 * @name queryModule
 * @description The SQL console: `POST /projects/:project/query` and `POST /query` run one
 * read-only `SELECT` against the documented views, for one project or every project the caller
 * may query; `POST /query/explain` estimates its cost; `GET /query/schema` lists the views and
 * `GET /queries/history` the latest runs. SQL needs an owner, an admin or analyst who lists the
 * project, or a `sql` token, and the project's `sqlEnabled` switch. Results answer CSV for
 * `Accept: text/csv` or `format=csv`.
 *
 * @example
 * app.use(queryModule(deps, query, docsBase));
 */
export function queryModule(deps: AccessDeps, options: QueryOptions, docsBase: string) {
  function reject(set: Set, error: EngineError) {
    const failed = failure(error, set.headers, docsBase);
    set.status = failed.status;
    return failed.body;
  }

  function answer<Value>(set: Set, result: Result<Value, EngineError>) {
    return result.ok ? result.value : reject(set, result.error);
  }

  async function queryable(caller: Caller): Promise<Result<string[], EngineError>> {
    const listed = await deps.projects.list(null);
    if (!listed.ok) return listed;
    const allowed = listed.value.filter((project) => canQuery(caller, project));
    return allowed.length > 0
      ? ok(allowed.map((project) => project.id))
      : err(engineError("FORBIDDEN", "No project allows you to run SQL"));
  }

  function onProject(caller: Caller, project: ProjectRecord | null) {
    if (!project) return err(engineError("NOT_FOUND", "Project not found"));
    const actor = signedIn(caller);
    if (!actor.ok) return actor;
    return canQuery(caller, project)
      ? ok({ actor: actor.value, projectIds: [project.id] })
      : err(engineError("FORBIDDEN", "You may not run SQL on this project"));
  }

  async function everywhere(caller: Caller) {
    const actor = signedIn(caller);
    if (!actor.ok) return actor;
    const projects = await queryable(caller);
    return projects.ok ? ok({ actor: actor.value, projectIds: projects.value }) : projects;
  }

  function reply(request: Request, set: Set, result: Result<QueryResult, EngineError>) {
    if (!result.ok || !wantsCsv(request)) return answer(set, result);
    set.headers["content-type"] = "text/csv; charset=utf-8";
    return queryCsv(result.value);
  }

  return new Elysia({ name: "query" })
    .use(access(deps, docsBase))
    .post(
      "/projects/:project/query",
      async ({ request, caller, project, body, set }) => {
        set.headers["cache-control"] = "private, no-store";
        const scope = onProject(caller, project);
        if (!scope.ok) return reject(set, scope.error);
        const result = await runQuery(options, scope.value.actor, scope.value.projectIds, body);
        return reply(request, set, result);
      },
      {
        access: "project",
        body: QueryRequest,
        response: { 200: t.Union([QueryResult, t.String()]), ...responses },
        detail: {
          summary: "Run SQL on one project",
          description:
            "One `SELECT` or `WITH` against the views in `/v2/query/schema`, limited to this project, as a read-only role with a 10-second timeout and 10,000 rows. `:from`, `:to` and `:project` come from `params` as bound values.",
          tags,
        },
      },
    )
    .post(
      "/query",
      async ({ request, caller, body, set }) => {
        set.headers["cache-control"] = "private, no-store";
        const scope = await everywhere(caller);
        if (!scope.ok) return reject(set, scope.error);
        const result = await runQuery(options, scope.value.actor, scope.value.projectIds, body);
        return reply(request, set, result);
      },
      {
        access: "public",
        body: QueryRequest,
        response: { 200: t.Union([QueryResult, t.String()]), ...responses },
        detail: {
          summary: "Run SQL across projects",
          description: "As the per-project route, over every project you may run SQL on.",
          tags,
        },
      },
    )
    .post(
      "/query/explain",
      async ({ caller, body, set }) => {
        set.headers["cache-control"] = "private, no-store";
        const scope = await everywhere(caller);
        if (!scope.ok) return reject(set, scope.error);
        return answer(
          set,
          await explainQuery(options, scope.value.actor, scope.value.projectIds, body),
        );
      },
      {
        access: "public",
        body: QueryRequest,
        response: { 200: QueryPlan, ...responses },
        detail: {
          summary: "Estimate a query's cost",
          description: "Postgres' plan with its total cost and estimated rows, without running it.",
          tags,
        },
      },
    )
    .get(
      "/query/schema",
      ({ caller, set }) => {
        const actor = signedIn(caller);
        return actor.ok ? querySchema() : reject(set, actor.error);
      },
      {
        access: "public",
        response: { 200: QuerySchema, ...errorResponses },
        detail: {
          summary: "The queryable views",
          description: "Every view with its columns, types and a one-line description.",
          tags,
        },
      },
    )
    .get(
      "/queries/history",
      async ({ caller, set }) => {
        set.headers["cache-control"] = "private, no-store";
        const actor = signedIn(caller);
        if (!actor.ok) return reject(set, actor.error);
        const owner = caller.kind === "user" && caller.role === "owner";
        return answer(set, await queryHistory(options.log, actor.value, owner));
      },
      {
        access: "public",
        response: { 200: QueryHistory, ...errorResponses },
        detail: {
          summary: "Latest query runs",
          description:
            "Your last 100 runs with duration, rows and whether they were blocked; the owner sees everyone's.",
          tags,
        },
      },
    );
}
