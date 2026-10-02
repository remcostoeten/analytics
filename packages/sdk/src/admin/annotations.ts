import type {
  Annotation,
  AnnotationKind,
  AnnotationList,
  AnnotationResponse,
  AnnotationsQuery,
} from "@remcostoeten/analytics-contract";
import type { Json } from "@remcostoeten/analytics-shared/http";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

import type { AdminResult, AdminSend } from "./types";

type CalendarDate = `${number}-${number}-${number}`;

export type AnnotationDate = Date | CalendarDate | `${CalendarDate}T${string}`;

export type WebUrl = `http://${string}` | `https://${string}`;

export type AnnotationInput = {
  title: string;
  date: AnnotationDate;
  endDate?: Nullable<AnnotationDate>;
  kind?: AnnotationKind;
  note?: Nullable<string>;
  url?: Nullable<WebUrl>;
};

export type AnnotationChanges = {
  [Key in keyof AnnotationInput]-?: Required<Pick<AnnotationInput, Key>> & Partial<AnnotationInput>;
}[keyof AnnotationInput];

export type AnnotationsAdmin<Projects extends string> = {
  list: (project: Projects, query?: AnnotationsQuery) => AdminResult<AnnotationList>;
  create: (project: Projects, annotation: AnnotationInput) => AdminResult<Annotation>;
  update: (project: Projects, id: string, changes: AnnotationChanges) => AdminResult<Annotation>;
  remove: (project: Projects, id: string) => AdminResult<null>;
};

function toWire(value: AnnotationDate) {
  return value instanceof Date ? value.toISOString() : value;
}

function annotationBody(fields: Partial<AnnotationInput>) {
  const body: { [key: string]: Json } = {};
  if (fields.title !== undefined) body.title = fields.title;
  if (fields.date !== undefined) body.date = toWire(fields.date);
  if (fields.endDate !== undefined) {
    body.endDate = fields.endDate === null ? null : toWire(fields.endDate);
  }
  if (fields.kind !== undefined) body.kind = fields.kind;
  if (fields.note !== undefined) body.note = fields.note;
  if (fields.url !== undefined) body.url = fields.url;
  return body;
}

/**
 * @name annotationsAdmin
 * @description The `admin.annotations` methods over the annotation routes of one API: `list` by
 * date range, and `create`, `update` and `remove` by id. Dates are `Date` objects, calendar dates
 * such as `"2026-10-01"` (the start of that day in UTC) or ISO 8601 timestamps.
 *
 * @example
 * const annotations = annotationsAdmin<"skriuw">(send);
 * await annotations.create("skriuw", { title: "v2.0 released", date: new Date(), kind: "release" });
 */
export function annotationsAdmin<Projects extends string>(
  send: AdminSend,
): AnnotationsAdmin<Projects> {
  function listPath(project: Projects) {
    return `/v2/projects/${encodeURIComponent(project)}/annotations`;
  }

  function onePath(project: Projects, id: string) {
    return `${listPath(project)}/${encodeURIComponent(id)}`;
  }

  async function data(answer: AdminResult<AnnotationResponse>): AdminResult<Annotation> {
    const result = await answer;
    return result.ok ? { ok: true, value: result.value.data } : result;
  }

  return {
    list: (project, query = {}) =>
      send<AnnotationList>({ method: "GET", path: listPath(project), query }),
    create: (project, annotation) =>
      data(
        send<AnnotationResponse>({
          method: "POST",
          path: listPath(project),
          body: annotationBody(annotation),
        }),
      ),
    update: (project, id, changes) =>
      data(
        send<AnnotationResponse>({
          method: "PATCH",
          path: onePath(project, id),
          body: annotationBody(changes),
        }),
      ),
    remove: async (project, id) => {
      const result = await send<Json>({ method: "DELETE", path: onePath(project, id) });
      return result.ok ? { ok: true, value: null } : result;
    },
  };
}
