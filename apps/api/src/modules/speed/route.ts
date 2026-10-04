import { SpeedElementList, SpeedResponse, SpeedRouteList, SpeedTimeseries } from "@spoar/contract";
import type { EngineError, ProjectRecord, SpeedStore } from "@spoar/engine";
import type { Result } from "@spoar/shared/result";
import { Elysia } from "elysia";

import type { AccessDeps, Caller } from "../../access/types";
import { access } from "../../plugins/access";
import { errorResponses } from "../../plugins/error-responses";
import { readGate } from "../reads/guard";
import type { ReadsOptions, Set } from "../reads/guard";
import {
  readSpeedScope,
  speedElements,
  speedRoutes,
  speedSummary,
  speedTimeseries,
} from "./service";
import type { SpeedScoped } from "./service";
import { speedQuery } from "../reads/query";

const tags = ["Speed"];
const responses = { ...errorResponses, 429: errorResponses[400] };

type Route = { request: Request; caller: Caller; project: ProjectRecord | null; set: Set };

type Read<Value> = (
  store: SpeedStore,
  scoped: SpeedScoped,
  params: URLSearchParams,
) => Promise<Result<Value, EngineError>>;

/**
 * @name speedModule
 * @description Speed insights under `/v2/projects/:project` at the `project` level, so public
 * projects show speed publicly: `speed`, `speed/timeseries`, `speed/routes` and
 * `speed/elements`, each with `device`, `percentile`, the date range and the route, page and
 * country filters, over human traffic only.
 *
 * @example
 * app.use(speedModule(deps, reads, docsBase));
 */
export function speedModule(deps: AccessDeps, options: ReadsOptions, docsBase: string) {
  const gate = readGate(options, docsBase);

  function answer<Value>(read: Read<Value>) {
    return ({ request, caller, project, set }: Route) =>
      gate.answer(request, caller, project, set, "aggregate", async (params, id) => {
        const scoped = readSpeedScope(params, [id], options.clock());
        return scoped.ok ? read(options.speed, scoped.value, params) : scoped;
      });
  }

  return new Elysia({ name: "speed" })
    .use(access(deps, docsBase))
    .get("/projects/:project/speed", answer(speedSummary), {
      query: speedQuery,
      access: "project",
      response: { 200: SpeedResponse, ...responses },
      detail: {
        summary: "Speed and the Real Experience Score",
        description:
          "Per metric the chosen percentile, its rating and score, and the good, needs-improvement and poor shares; values under 20 samples are null.",
        tags,
      },
    })
    .get("/projects/:project/speed/timeseries", answer(speedTimeseries), {
      query: speedQuery,
      access: "project",
      response: { 200: SpeedTimeseries, ...responses },
      detail: { summary: "One metric per day", description: "`metric` is required.", tags },
    })
    .get("/projects/:project/speed/routes", answer(speedRoutes), {
      query: speedQuery,
      access: "project",
      response: { 200: SpeedRouteList, ...responses },
      detail: { summary: "Speed per route", description: "Worst score first.", tags },
    })
    .get("/projects/:project/speed/elements", answer(speedElements), {
      query: speedQuery,
      access: "project",
      response: { 200: SpeedElementList, ...responses },
      detail: {
        summary: "Elements behind slow values",
        description:
          "The selectors most often behind needs-improvement and poor values of `metric`.",
        tags,
      },
    });
}
