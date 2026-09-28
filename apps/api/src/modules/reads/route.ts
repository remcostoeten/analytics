import {
  BreakdownResponse,
  HeatmapResponse,
  LiveEvents,
  MapResponse,
  PathsResponse,
  RealtimeResponse,
  RetentionResponse,
  StatsResponse,
  TimeseriesResponse,
} from "@remcostoeten/analytics-contract";
import type { EngineError, ProjectRecord } from "@remcostoeten/analytics-engine";
import { ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";
import { Elysia, t } from "elysia";

import { canReadDetail } from "../../access/rules";
import type { AccessDeps, Caller } from "../../access/types";
import { access } from "../../plugins/access";
import { errorResponses } from "../../plugins/error-responses";
import { heatmap, paths, places, retention } from "./explore";
import { readGate } from "./guard";
import type { ReadsOptions, Set } from "./guard";
import { eventStream, liveEvents, liveQuery, liveStream } from "./live";
import { breakdown, breakdownCsv, readScope, realtime, stats, timeseries } from "./service";

const tags = ["Reads"];

type Route = { request: Request; caller: Caller; project: ProjectRecord | null; set: Set };
const readResponses = { ...errorResponses, 429: errorResponses[400] };

/**
 * @name readsModule
 * @description The aggregate reads under `/v2/projects/:project`: `stats`, `timeseries`,
 * `breakdown/:dimension`, `paths`, `retention`, `heatmap`, `map`, `realtime` and the live feed
 * `realtime/events`, all at the `project` level; the feed adds visitor and session ids only with
 * `detail` access. Public projects answer with
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

  function explore<Value>(
    read: (
      store: ReadsOptions["store"],
      scope: Parameters<typeof paths>[1],
      params: URLSearchParams,
    ) => Promise<Result<Value, EngineError>>,
  ) {
    return ({ request, caller, project, set }: Route) =>
      answer(request, caller, project, set, async (params, id) => {
        const scope = scoped(params, id);
        return scope.ok ? read(options.store, scope.value, params) : scope;
      });
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
    )
    .get("/projects/:project/paths", explore(paths), {
      access: "project",
      response: { 200: PathsResponse, ...readResponses },
      detail: {
        summary: "Where visitors went next",
        description:
          "The pages viewed right after `page` in the same session, or right before it with `direction=previous`, with counts and drop-off.",
        tags,
      },
    })
    .get("/projects/:project/retention", explore(retention), {
      access: "project",
      response: { 200: RetentionResponse, ...readResponses },
      detail: {
        summary: "Returning visitors by cohort",
        description:
          "Cohorts by the `week` or `month` of the first visit in the range, with the share returning in each later period.",
        tags,
      },
    })
    .get("/projects/:project/heatmap", explore(heatmap), {
      access: "project",
      response: { 200: HeatmapResponse, ...readResponses },
      detail: {
        summary: "Weekday and hour heatmap",
        description:
          "`visitors` or `pageviews` per weekday (1 is Monday) and hour in `timezone`, default UTC.",
        tags,
      },
    })
    .get("/projects/:project/map", explore(places), {
      access: "project",
      response: { 200: MapResponse, ...readResponses },
      detail: {
        summary: "Visitors per place",
        description: "Per `country`, `region` or `city`, with coordinates for a map.",
        tags,
      },
    })
    .get(
      "/projects/:project/realtime/events",
      ({ request, caller, project, set }) =>
        gate.answer(
          request,
          caller,
          project,
          set,
          "private",
          async (params, id): Promise<Result<LiveEvents | Response, EngineError>> => {
            const query = liveQuery(params, [id], request.headers.get("last-event-id"));
            if (!query.ok) return query;
            const detailed = new Set(project && canReadDetail(caller, project) ? [id] : []);
            if (request.headers.get("accept")?.includes("text/event-stream")) {
              return ok(
                liveStream(options.feed, query.value, detailed, options.live, request.signal),
              );
            }
            return liveEvents(options.feed, query.value, detailed, {
              ms: options.live.waitMs,
              signal: request.signal,
            });
          },
        ),
      {
        access: "project",
        response: { 200: t.Union([LiveEvents, eventStream]), ...readResponses },
        detail: {
          summary: "Live events",
          description:
            "Long-polls: without `after` the last five minutes at once, with it the newer events as soon as they arrive or an empty page after 25 seconds. `Accept: text/event-stream` streams the same pages as server-sent events. Visitor and session ids need `detail` access.",
          tags,
        },
      },
    );
}
