import type {
  Annotation,
  AnnotationList,
  AnnotationResponse,
  CreateAnnotation,
  UpdateAnnotation,
} from "@spoar/contract";
import { engineError } from "@spoar/engine";
import type {
  AnnotationPatch,
  AnnotationRecord,
  AnnotationStore,
  EngineError,
} from "@spoar/engine";
import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";
import type { Nullable, ProjectID } from "@spoar/shared/semantic";

import { nextCursor, readPage, readRange } from "../reads/params";

type Reply<Value> = Promise<Result<Value, EngineError>>;

function shape(record: AnnotationRecord): Annotation {
  return {
    id: record.id,
    project: record.projectId,
    title: record.title,
    date: record.date.toISOString(),
    endDate: record.endDate?.toISOString() ?? null,
    kind: record.kind,
    note: record.note,
    url: record.url,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toDate(value: string) {
  return new Date(value);
}

function toEndDate(value: Nullable<string> | undefined) {
  return value === undefined || value === null ? null : toDate(value);
}

function checkSpan(date: Date, endDate: Nullable<Date>): Result<null, EngineError> {
  if (endDate === null || endDate >= date) return ok(null);
  const message = "endDate must not be before date";
  return err<EngineError>({
    code: "VALIDATION_FAILED",
    message,
    details: { fields: [{ path: "/endDate", message }] },
  });
}

function missing(id: string) {
  return err(engineError("NOT_FOUND", `No annotation ${id} in this project`));
}

/**
 * @name listAnnotations
 * @description A project's annotations that overlap the read range (`from` and `to`, or
 * `period`, as on every read), by date, paged with `limit` and `cursor`. A range annotation counts
 * when any part of it falls inside.
 *
 * @example
 * await listAnnotations(store, "skriuw", new URLSearchParams("period=30d"), new Date());
 */
export async function listAnnotations(
  store: AnnotationStore,
  project: ProjectID,
  params: URLSearchParams,
  now: Date,
): Reply<AnnotationList> {
  const range = readRange(params, now);
  if (!range.ok) return range;
  const page = readPage(params);
  if (!page.ok) return page;
  const listed = await store.list(project, { ...range.value, ...page.value });
  if (!listed.ok) return listed;
  return ok({
    data: listed.value.rows.map(shape),
    nextCursor: nextCursor(page.value.offset, listed.value.rows.length, listed.value.total),
  });
}

/**
 * @name createAnnotation
 * @description Adds an annotation to a project. A calendar date means its start in UTC; `kind`
 * defaults to `other`. An `endDate` before `date` answers `VALIDATION_FAILED` at `/endDate`.
 *
 * @example
 * await createAnnotation(store, "skriuw", { title: "v2.0 released", date: "2026-10-01", kind: "release" });
 */
export async function createAnnotation(
  store: AnnotationStore,
  project: ProjectID,
  body: CreateAnnotation,
): Reply<AnnotationResponse> {
  const date = toDate(body.date);
  const endDate = toEndDate(body.endDate);
  const span = checkSpan(date, endDate);
  if (!span.ok) return span;
  const created = await store.create(project, {
    title: body.title,
    date,
    endDate,
    kind: body.kind ?? "other",
    note: body.note ?? null,
    url: body.url ?? null,
  });
  return created.ok ? ok({ data: shape(created.value) }) : created;
}

/**
 * @name updateAnnotation
 * @description Changes the fields sent and leaves the rest; `null` clears `endDate`, `note` or
 * `url`. The resulting span is checked like on create. `NOT_FOUND` when the project has no
 * annotation with this id.
 *
 * @example
 * await updateAnnotation(store, "skriuw", "ann_...", { endDate: null });
 */
export async function updateAnnotation(
  store: AnnotationStore,
  project: ProjectID,
  id: string,
  body: UpdateAnnotation,
): Reply<AnnotationResponse> {
  const current = await store.get(project, id);
  if (!current.ok) return current;
  if (!current.value) return missing(id);
  const patch: AnnotationPatch = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.date !== undefined) patch.date = toDate(body.date);
  if (body.endDate !== undefined) patch.endDate = toEndDate(body.endDate);
  if (body.kind !== undefined) patch.kind = body.kind;
  if (body.note !== undefined) patch.note = body.note;
  if (body.url !== undefined) patch.url = body.url;
  const span = checkSpan(
    patch.date ?? current.value.date,
    patch.endDate === undefined ? current.value.endDate : patch.endDate,
  );
  if (!span.ok) return span;
  const updated = await store.update(project, id, patch);
  if (!updated.ok) return updated;
  return updated.value ? ok({ data: shape(updated.value) }) : missing(id);
}

/**
 * @name deleteAnnotation
 * @description Removes one annotation; `NOT_FOUND` when the project has none with this id.
 *
 * @example
 * await deleteAnnotation(store, "skriuw", "ann_...");
 */
export async function deleteAnnotation(
  store: AnnotationStore,
  project: ProjectID,
  id: string,
): Reply<null> {
  const removed = await store.remove(project, id);
  if (!removed.ok) return removed;
  return removed.value ? ok(null) : missing(id);
}
