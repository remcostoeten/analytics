import {
  BreakdownResponse,
  RealtimeResponse,
  StatsResponse,
  TimeseriesResponse,
} from "@remcostoeten/analytics-contract";
import type { EngineError, ProjectRecord } from "@remcostoeten/analytics-engine";
import type { Result } from "@remcostoeten/analytics-shared/result";
import { Elysia, t } from "elysia";

import type { AccessDeps, Caller } from "../../access/types";
import { access } from "../../plugins/access";
import { errorResponses } from "../../plugins/error-responses";
import { readGate } from "./guard";
import type { ReadsOptions, Set } from "./guard";
import { breakdown, breakdownCsv, readScope, realtime, stats, timeseries } from "./service";

const tags = ["Reads"];
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
  const gate = readGate(options, docsBase);

  function answer<Value>(
    request: Request,
    caller: Caller,
    project: ProjectRecord | null,
    set: Set,
    run: (params: URLSearchParams, projectId: string) => Promise<Result<Value, EngineError>>,
  ) {
    return gate.answer(request, caller, project, set, "aggregate", run);
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
