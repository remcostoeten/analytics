import {
  IssueList,
  SpeedElementList,
  SpeedResponse,
  SpeedRouteList,
  SpeedTimeseries,
  BreakdownResponse,
  EventList,
  HeatmapResponse,
  LiveEvents,
  MapResponse,
  PathsResponse,
  RetentionResponse,
  PeopleList,
  PersonResponse,
  RealtimeResponse,
  SessionList,
  StatsResponse,
  TimeseriesResponse,
  VisitorList,
} from "@remcostoeten/analytics-contract";
import { engineError } from "@remcostoeten/analytics-engine";
import type { EngineError } from "@remcostoeten/analytics-engine";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";
import { Elysia, t } from "elysia";

import { canRead, canReadDetail } from "../../access/rules";
import type { AccessDeps, Caller } from "../../access/types";
import { access } from "../../plugins/access";
import { errorResponses } from "../../plugins/error-responses";
import {
  listEvents,
  listPeople,
  listSessions,
  listVisitors,
  personDetail,
} from "../details/service";
import { heatmap, paths, places, retention } from "../reads/explore";
import { readGate } from "../reads/guard";
import type { ReadsOptions } from "../reads/guard";
import { eventStream, liveEvents, liveQuery, liveStream } from "../reads/live";
import { listIssues } from "../issues/service";
import { download } from "../reads/export";
import {
  readSpeedScope,
  speedElements,
  speedRoutes,
  speedSummary,
  speedTimeseries,
} from "../speed/service";
import type { SpeedScoped } from "../speed/service";
import type { Listing } from "../reads/export";
import { breakdown, readScope, realtime, stats, timeseries } from "../reads/service";
import type { Scoped as ReadScoped } from "../reads/service";

type Scoped = { params: URLSearchParams; projects: string[] };

const tags = ["All projects"];
const responses = { ...errorResponses, 429: errorResponses[400] };
const projectFilter = "filter[project]";

/**
 * @name readableProjects
 * @description The projects a caller may read at the aggregate or the detail level, narrowed by
 * `filter[project]=a,b`. The filter is taken out of the parameters, since the project list
 * replaces it.
 *
 * @example
 * await readableProjects(deps, caller, params, false);
 */
async function readableProjects(
  deps: AccessDeps,
  caller: Caller,
  params: URLSearchParams,
  detail: boolean,
): Promise<Result<Scoped, EngineError>> {
  const listed = await deps.projects.list(null);
  if (!listed.ok) return listed;
  const allowed = listed.value
    .filter((project) => (detail ? canReadDetail(caller, project) : canRead(caller, project)))
    .map((project) => project.id);
  const rest = new URLSearchParams(params);
  const wanted = rest.get(projectFilter);
  rest.delete(projectFilter);
  if (!wanted) return ok({ params: rest, projects: allowed });
  const names = new Set(wanted.split(",").map((name) => name.trim()));
  return ok({ params: rest, projects: allowed.filter((id) => names.has(id)) });
}

/**
 * @name combinedModule
 * @description Every read route without the `/projects/:project` prefix: stats, timeseries,
 * breakdowns (with `project` as a dimension), paths, retention, heatmap, map, realtime, the
 * live feed and speed over the projects the caller may read,
 * and events, visitors and sessions over the projects whose visitor-level data the caller may see.
 * `/people` and `/people/:userId` link identified users across projects and need a signed-in
 * member or a token.
 *
 * @example
 * app.use(combinedModule(deps, reads, docsBase));
 */
export function combinedModule(deps: AccessDeps, options: ReadsOptions, docsBase: string) {
  const gate = readGate(options, docsBase);

  function aggregate<Value>(
    request: Request,
    caller: Caller,
    set: Parameters<typeof gate.answerMany>[2],
    run: (scoped: Scoped) => Promise<Result<Value, EngineError>>,
  ) {
    return gate.answerMany(request, caller, set, "aggregate", async (params) => {
      const scoped = await readableProjects(deps, caller, params, false);
      return scoped.ok ? run(scoped.value) : scoped;
    });
  }

  function detailed<Value>(
    request: Request,
    caller: Caller,
    set: Parameters<typeof gate.answerMany>[2],
    run: (scoped: Scoped) => Promise<Result<Value, EngineError>>,
  ) {
    return gate.answerMany(request, caller, set, "private", async (params) => {
      const scoped = await readableProjects(deps, caller, params, true);
      return scoped.ok ? run(scoped.value) : scoped;
    });
  }

  function aggregateList<Page extends Listing>(
    request: Request,
    caller: Caller,
    set: Parameters<typeof gate.answerMany>[2],
    name: string,
    run: (scoped: Scoped) => Promise<Result<Page, EngineError>>,
  ) {
    return gate.listMany(request, caller, set, "aggregate", name, async (params) => {
      const scoped = await readableProjects(deps, caller, params, false);
      return scoped.ok ? run(scoped.value) : scoped;
    });
  }

  function detailedList<Page extends Listing>(
    request: Request,
    caller: Caller,
    set: Parameters<typeof gate.answerMany>[2],
    name: string,
    run: (scoped: Scoped) => Promise<Result<Page, EngineError>>,
  ) {
    return gate.listMany(request, caller, set, "private", name, async (params) => {
      const scoped = await readableProjects(deps, caller, params, true);
      return scoped.ok ? run(scoped.value) : scoped;
    });
  }

  function exploreList<Page extends Listing>(
    name: string,
    read: (
      store: ReadsOptions["store"],
      scope: ReadScoped,
      params: URLSearchParams,
    ) => Promise<Result<Page, EngineError>>,
  ) {
    return ({
      request,
      caller,
      set,
    }: {
      request: Request;
      caller: Caller;
      set: Parameters<typeof gate.answerMany>[2];
    }) =>
      aggregateList(request, caller, set, name, async ({ params, projects }) => {
        const scope = readScope(params, projects, options.clock());
        return scope.ok ? read(options.store, scope.value, params) : scope;
      });
  }

  function speedRead<Value>(
    read: (
      store: ReadsOptions["speed"],
      scoped: SpeedScoped,
      params: URLSearchParams,
    ) => Promise<Result<Value, EngineError>>,
  ) {
    return ({
      request,
      caller,
      set,
    }: {
      request: Request;
      caller: Caller;
      set: Parameters<typeof gate.answerMany>[2];
    }) =>
      aggregate(request, caller, set, async ({ params, projects }) => {
        const scoped = readSpeedScope(params, projects, options.clock());
        return scoped.ok ? read(options.speed, scoped.value, params) : scoped;
      });
  }

  function explore<Value>(
    read: (
      store: ReadsOptions["store"],
      scope: ReadScoped,
      params: URLSearchParams,
    ) => Promise<Result<Value, EngineError>>,
  ) {
    return ({
      request,
      caller,
      set,
    }: {
      request: Request;
      caller: Caller;
      set: Parameters<typeof gate.answerMany>[2];
    }) =>
      aggregate(request, caller, set, async ({ params, projects }) => {
        const scope = readScope(params, projects, options.clock());
        return scope.ok ? read(options.store, scope.value, params) : scope;
      });
  }

  function signedIn(caller: Caller): Result<null, EngineError> {
    return caller.kind === "anonymous"
      ? err(engineError("UNAUTHORIZED", "Sign in or send an API token"))
      : ok(null);
  }

  return new Elysia({ name: "combined" })
    .use(access(deps, docsBase))
    .get(
      "/stats",
      ({ request, caller, set }) =>
        aggregate(request, caller, set, async ({ params, projects }) => {
          const scope = readScope(params, projects, options.clock());
          return scope.ok ? stats(options.store, scope.value) : scope;
        }),
      {
        access: "public",
        response: { 200: StatsResponse, ...responses },
        detail: {
          summary: "Headline numbers across projects",
          description: "Summed over every readable project.",
          tags,
        },
      },
    )
    .get(
      "/timeseries",
      ({ request, caller, set }) =>
        aggregate(request, caller, set, async ({ params, projects }) => {
          const scope = readScope(params, projects, options.clock());
          return scope.ok ? timeseries(options.store, scope.value, params) : scope;
        }),
      {
        access: "public",
        response: { 200: TimeseriesResponse, ...responses },
        detail: {
          summary: "One metric over time across projects",
          description: "As the per-project route.",
          tags,
        },
      },
    )
    .get(
      "/breakdown/:dimension",
      ({ request, caller, params: path, set }) =>
        aggregateList(
          request,
          caller,
          set,
          `breakdown_${path.dimension}`,
          async ({ params, projects }) => {
            const scope = readScope(params, projects, options.clock());
            return scope.ok ? breakdown(options.store, scope.value, path.dimension, params) : scope;
          },
        ),
      {
        access: "public",
        response: { 200: t.Union([BreakdownResponse, download]), ...responses },
        detail: {
          summary: "Top values of a dimension across projects",
          description: "`breakdown/project` gives one row per project.",
          tags,
        },
      },
    )
    .get(
      "/realtime",
      ({ request, caller, set }) =>
        aggregate(request, caller, set, ({ projects }) =>
          realtime(options.store, projects, options.clock()),
        ),
      {
        access: "public",
        response: { 200: RealtimeResponse, ...responses },
        detail: {
          summary: "The last five minutes across projects",
          description: "As the per-project route.",
          tags,
        },
      },
    )
    .get(
      "/events",
      ({ request, caller, set }) =>
        detailedList(request, caller, set, "events", ({ params, projects }) =>
          listEvents(options.details, params, projects, options.clock()),
        ),
      {
        access: "public",
        response: { 200: t.Union([EventList, download]), ...responses },
        detail: {
          summary: "Raw events across projects",
          description: "Projects whose visitor-level data you may see.",
          tags,
        },
      },
    )
    .get(
      "/visitors",
      ({ request, caller, set }) =>
        detailedList(request, caller, set, "visitors", ({ params, projects }) =>
          listVisitors(options.details, params, projects, options.clock()),
        ),
      {
        access: "public",
        response: { 200: t.Union([VisitorList, download]), ...responses },
        detail: {
          summary: "Visitors across projects",
          description: "Each project's visitors counted separately.",
          tags,
        },
      },
    )
    .get(
      "/sessions",
      ({ request, caller, set }) =>
        detailedList(request, caller, set, "sessions", ({ params, projects }) =>
          listSessions(options.details, params, projects, options.clock()),
        ),
      {
        access: "public",
        response: { 200: t.Union([SessionList, download]), ...responses },
        detail: { summary: "Sessions across projects", description: "Newest first.", tags },
      },
    )
    .get(
      "/people",
      ({ request, caller, set }) =>
        detailedList(request, caller, set, "people", async ({ params, projects }) => {
          const allowed = signedIn(caller);
          return allowed.ok ? listPeople(options.details, params, projects) : allowed;
        }),
      {
        access: "public",
        response: { 200: t.Union([PeopleList, download]), ...responses },
        detail: {
          summary: "Identified people",
          description: "One row per `userId` from `identify`, linked across projects.",
          tags,
        },
      },
    )
    .get(
      "/people/:userId",
      ({ request, caller, params: path, set }) =>
        detailed(request, caller, set, async ({ projects }) => {
          const allowed = signedIn(caller);
          return allowed.ok ? personDetail(options.details, projects, path.userId) : allowed;
        }),
      {
        access: "public",
        response: { 200: PersonResponse, ...responses },
        detail: {
          summary: "One person across projects",
          description:
            "Which project they came in through, from where, and every visit in time order.",
          tags,
        },
      },
    )
    .get("/paths", exploreList("paths", paths), {
      access: "public",
      response: { 200: t.Union([PathsResponse, download]), ...responses },
      detail: {
        summary: "Where visitors went next, across projects",
        description: "As the per-project route.",
        tags,
      },
    })
    .get("/retention", explore(retention), {
      access: "public",
      response: { 200: RetentionResponse, ...responses },
      detail: {
        summary: "Returning visitors by cohort, across projects",
        description: "Each project's visitors counted separately.",
        tags,
      },
    })
    .get("/heatmap", explore(heatmap), {
      access: "public",
      response: { 200: HeatmapResponse, ...responses },
      detail: {
        summary: "Weekday and hour heatmap across projects",
        description: "As the per-project route.",
        tags,
      },
    })
    .get("/map", exploreList("map", places), {
      access: "public",
      response: { 200: t.Union([MapResponse, download]), ...responses },
      detail: {
        summary: "Visitors per place across projects",
        description: "As the per-project route.",
        tags,
      },
    })
    .get(
      "/realtime/events",
      ({ request, caller, set }) =>
        gate.answerMany(
          request,
          caller,
          set,
          "private",
          async (params): Promise<Result<LiveEvents | Response, EngineError>> => {
            const [readable, detailed] = await Promise.all([
              readableProjects(deps, caller, params, false),
              readableProjects(deps, caller, params, true),
            ]);
            if (!readable.ok) return readable;
            if (!detailed.ok) return detailed;
            const query = liveQuery(
              readable.value.params,
              readable.value.projects,
              request.headers.get("last-event-id"),
            );
            if (!query.ok) return query;
            const visible = new Set(detailed.value.projects);
            if (request.headers.get("accept")?.includes("text/event-stream")) {
              return ok(
                liveStream(options.feed, query.value, visible, options.live, request.signal),
              );
            }
            return liveEvents(options.feed, query.value, visible, {
              ms: options.live.waitMs,
              signal: request.signal,
            });
          },
        ),
      {
        access: "public",
        response: { 200: t.Union([LiveEvents, eventStream]), ...responses },
        detail: {
          summary: "Live events across projects",
          description:
            "As the per-project route; visitor and session ids only for projects with `detail` access.",
          tags,
        },
      },
    )
    .get("/speed", speedRead(speedSummary), {
      access: "public",
      response: { 200: SpeedResponse, ...responses },
      detail: { summary: "Speed across projects", description: "As the per-project route.", tags },
    })
    .get("/speed/timeseries", speedRead(speedTimeseries), {
      access: "public",
      response: { 200: SpeedTimeseries, ...responses },
      detail: {
        summary: "One metric per day across projects",
        description: "As the per-project route.",
        tags,
      },
    })
    .get("/speed/routes", speedRead(speedRoutes), {
      access: "public",
      response: { 200: SpeedRouteList, ...responses },
      detail: {
        summary: "Speed per route across projects",
        description: "As the per-project route.",
        tags,
      },
    })
    .get("/speed/elements", speedRead(speedElements), {
      access: "public",
      response: { 200: SpeedElementList, ...responses },
      detail: {
        summary: "Elements behind slow values across projects",
        description: "As the per-project route.",
        tags,
      },
    })
    .get(
      "/issues",
      ({ request, caller, set }) =>
        detailed(request, caller, set, ({ params, projects }) =>
          listIssues(options.issues, params, projects),
        ),
      {
        access: "public",
        response: { 200: IssueList, ...responses },
        detail: {
          summary: "Issues across projects",
          description: "Projects whose visitor-level data you may see, most recently seen first.",
          tags,
        },
      },
    );
}
