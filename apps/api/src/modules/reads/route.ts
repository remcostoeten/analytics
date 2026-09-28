import {
  BreakdownResponse,
  RealtimeResponse,
  StatsResponse,
  TimeseriesResponse,
} from "@remcostoeten/analytics-contract";
import { clientIp, engineError, hashIp } from "@remcostoeten/analytics-engine";
import type {
  EngineError,
  Hasher,
  ProjectRecord,
  RateLimiter,
  ReadStore,
} from "@remcostoeten/analytics-engine";
import type { Result } from "@remcostoeten/analytics-shared/result";
import { Elysia, t } from "elysia";

import type { AccessDeps, Caller } from "../../access/types";
import { access } from "../../plugins/access";
import { failure } from "../../plugins/error-handler";
import { errorResponses } from "../../plugins/error-responses";
import { breakdown, breakdownCsv, readScope, realtime, stats, timeseries } from "./service";

export type ReadsOptions = {
  store: ReadStore;
  limiter: RateLimiter;
  hasher: Hasher;
  ipSecret: string;
  publicLimit: number;
  clock: () => Date;
};

type Set = { status?: unknown; headers: { [name: string]: unknown } };

const tags = ["Reads"];
const windowSeconds = 60;
const readResponses = { ...errorResponses, 429: errorResponses[400] };

/**
 * @name readsModule
 * @description The aggregate reads under `/v2/projects/:project`: `stats`, `timeseries`,
 * `breakdown/:dimension` and `realtime`, all at the `project` level. Public projects answer with
 * `Cache-Control: public, s-maxage=60`, private ones with `private, no-store`, and anonymous
 * callers are rate limited per daily IP hash. `breakdown` also answers CSV for
 * `Accept: text/csv` or `format=csv`.
 *
 * @example
 * app.use(readsModule(deps, reads, docsBase));
 */
export function readsModule(deps: AccessDeps, options: ReadsOptions, docsBase: string) {
  function reject(error: EngineError, set: Set) {
    const failed = failure(error, set.headers, docsBase);
    set.status = failed.status;
    return failed.body;
  }

  async function admit(request: Request, caller: Caller, project: ProjectRecord | null, set: Set) {
    if (!project) return engineError("NOT_FOUND", "Project not found");
    set.headers["cache-control"] =
      project.visibility === "public" ? "public, s-maxage=60" : "private, no-store";
    if (caller.kind !== "anonymous") return null;
    const now = options.clock();
    const ipHash = await hashIp(
      options.hasher,
      options.ipSecret,
      clientIp(request.headers),
      now.toISOString(),
    );
    const decision = await options.limiter.hit(
      `read:${ipHash ?? "unknown"}`,
      options.publicLimit,
      windowSeconds,
    );
    if (decision.allowed) return null;
    return {
      ...engineError("RATE_LIMITED", "Too many reads; try again shortly"),
      details: { retryAfterSeconds: decision.retryAfterSeconds },
    };
  }

  async function answer<Value>(
    request: Request,
    caller: Caller,
    project: ProjectRecord | null,
    set: Set,
    run: (params: URLSearchParams, projectId: string) => Promise<Result<Value, EngineError>>,
  ) {
    const refused = await admit(request, caller, project, set);
    if (refused || !project)
      return reject(refused ?? engineError("NOT_FOUND", "Project not found"), set);
    const result = await run(new URL(request.url).searchParams, project.id);
    return result.ok ? result.value : reject(result.error, set);
  }

  function scoped(params: URLSearchParams, projectId: string) {
    return readScope(params, [projectId], options.clock());
  }

  return new Elysia({ name: "reads" })
    .use(access(deps, docsBase))
    .get(
      "/projects/:project/stats",
      ({ request, caller, project, set }) =>
        answer(request, caller, project, set, async (params, id) => {
          const scope = scoped(params, id);
          return scope.ok ? stats(options.store, scope.value) : scope;
        }),
      {
        access: "project",
        response: { 200: StatsResponse, ...readResponses },
        detail: {
          summary: "Headline numbers",
          description:
            "Visitors, sessions, pageviews, pages per session, bounce rate and session duration, each with the previous period.",
          tags,
        },
      },
    )
    .get(
      "/projects/:project/timeseries",
      ({ request, caller, project, set }) =>
        answer(request, caller, project, set, async (params, id) => {
          const scope = scoped(params, id);
          return scope.ok ? timeseries(options.store, scope.value, params) : scope;
        }),
      {
        access: "project",
        response: { 200: TimeseriesResponse, ...readResponses },
        detail: {
          summary: "One metric over time",
          description:
            "Buckets by `interval` (hour, day, week, month) in UTC; `compare=previous` adds the previous period.",
          tags,
        },
      },
    )
    .get(
      "/projects/:project/breakdown/:dimension",
      async ({ request, caller, project, params: path, set }) => {
        const result = await answer(request, caller, project, set, async (params, id) => {
          const scope = scoped(params, id);
          return scope.ok ? breakdown(options.store, scope.value, path.dimension, params) : scope;
        });
        const url = new URL(request.url);
        const csv =
          url.searchParams.get("format") === "csv" ||
          request.headers.get("accept")?.includes("text/csv");
        if (!csv || !("dimension" in result)) return result;
        set.headers["content-type"] = "text/csv; charset=utf-8";
        return breakdownCsv(result);
      },
      {
        access: "project",
        response: { 200: t.Union([BreakdownResponse, t.String()]), ...readResponses },
        detail: {
          summary: "Top values of a dimension",
          description:
            "Any dimension from the registry, `prop:<key>` or `trait:<key>`, with the `metrics` list and each value's share of visitors.",
          tags,
        },
      },
    )
    .get(
      "/projects/:project/realtime",
      ({ request, caller, project, set }) =>
        answer(request, caller, project, set, (_, id) =>
          realtime(options.store, [id], options.clock()),
        ),
      {
        access: "project",
        response: { 200: RealtimeResponse, ...readResponses },
        detail: {
          summary: "The last five minutes",
          description: "Human visitors, pageviews per minute, top pages and countries.",
          tags,
        },
      },
    );
}
