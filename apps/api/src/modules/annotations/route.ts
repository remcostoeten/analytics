import {
  AnnotationList,
  AnnotationResponse,
  CreateAnnotation,
  ProjectParams,
  UpdateAnnotation,
} from "@spoar/contract";
import type { AnnotationStore } from "@spoar/engine";
import { Elysia, t } from "elysia";

import type { AccessDeps } from "../../access/types";
import { access } from "../../plugins/access";
import { errorResponses } from "../../plugins/error-responses";
import { readGate } from "../reads/guard";
import type { ReadsOptions } from "../reads/guard";
import { annotationsQuery } from "../reads/query";
import { createAnnotation, deleteAnnotation, listAnnotations, updateAnnotation } from "./service";

const tags = ["Annotations"];
const responses = { ...errorResponses, 429: errorResponses[400] };
const named = t.Composite([
  ProjectParams,
  t.Object({ annotation: t.String({ description: "The annotation id (`ann_...`)." }) }),
]);

/**
 * @name annotationsModule
 * @description Dated labels on a project's time series under `/v2/projects/:project/annotations`:
 * the list by date range for anyone who may read the project, and create, update and delete for
 * its admins.
 *
 * @example
 * app.use(annotationsModule(deps, reads, store, docsBase));
 */
export function annotationsModule(
  deps: AccessDeps,
  options: ReadsOptions,
  store: AnnotationStore,
  docsBase: string,
) {
  const gate = readGate(options, docsBase);

  return new Elysia({ name: "annotations" })
    .use(access(deps, docsBase))
    .get(
      "/projects/:project/annotations",
      ({ request, caller, project, set }) =>
        gate.answer(request, caller, project, set, "private", (params, id) =>
          listAnnotations(store, id, params, options.clock()),
        ),
      {
        params: ProjectParams,
        access: "project",
        query: annotationsQuery,
        response: { 200: AnnotationList, ...responses },
        detail: {
          summary: "Annotations",
          description:
            "The annotations that overlap the range (`from` and `to`, or `period`, default `30d`), by date. One with an `endDate` is listed when any part of it falls in the range. Anyone who may read the project's numbers may read its annotations.",
          tags,
        },
      },
    )
    .post(
      "/projects/:project/annotations",
      async ({ request, caller, project, body, set }) => {
        const created = await gate.answer(request, caller, project, set, "private", (_, id) =>
          createAnnotation(store, id, body),
        );
        if (set.status === 200) set.status = 201;
        return created;
      },
      {
        params: ProjectParams,
        access: "admin",
        body: CreateAnnotation,
        response: { 201: AnnotationResponse, ...responses },
        detail: {
          summary: "Add an annotation",
          description:
            "A `title` and a `date`, with an optional `endDate` for a range, `kind` (`release`, `post`, `content`, `incident` or `other`, the default), `note` and `url`. A calendar date means its start in UTC. `endDate` may not be before `date`.",
          tags,
        },
      },
    )
    .patch(
      "/projects/:project/annotations/:annotation",
      ({ request, caller, project, params, body, set }) =>
        gate.answer(request, caller, project, set, "private", (_, id) =>
          updateAnnotation(store, id, params.annotation, body),
        ),
      {
        access: "admin",
        params: named,
        body: UpdateAnnotation,
        response: { 200: AnnotationResponse, ...responses },
        detail: {
          summary: "Change an annotation",
          description:
            "Changes the fields sent and leaves the rest; `null` clears `endDate`, `note` or `url`.",
          tags,
        },
      },
    )
    .delete(
      "/projects/:project/annotations/:annotation",
      async ({ request, caller, project, params, set, status }) => {
        const removed = await gate.answer(request, caller, project, set, "private", (_, id) =>
          deleteAnnotation(store, id, params.annotation),
        );
        return removed === null ? status(204, undefined) : removed;
      },
      {
        access: "admin",
        params: named,
        response: { 204: t.Void(), ...responses },
        detail: { summary: "Delete an annotation", description: "By its `ann_` id.", tags },
      },
    );
}
