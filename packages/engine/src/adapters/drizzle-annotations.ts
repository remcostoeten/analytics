import { and, asc, count, eq, gte, lt, sql } from "drizzle-orm";

import { annotations } from "../db/schema";
import type { AnnotationRecord, AnnotationStore } from "../ports";
import type { Database } from "./drizzle";
import { attempt } from "./drizzle-rows";

function toRecord(row: typeof annotations.$inferSelect): AnnotationRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    date: row.date,
    endDate: row.endDate,
    kind: row.kind,
    note: row.note,
    url: row.url,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * @name drizzleAnnotations
 * @description The `AnnotationStore` on the `annotations` table. Every call is scoped to one
 * project; `list` answers the annotations that overlap `[from, to)`, by date, and new ids are
 * `ann_` plus a random UUID.
 *
 * @example
 * await drizzleAnnotations(db).create("skriuw", { title: "v2.0", date, endDate: null, kind: "release", note: null, url: null });
 */
export function drizzleAnnotations(db: Database): AnnotationStore {
  function scoped(project: string, id: string) {
    return and(eq(annotations.projectId, project), eq(annotations.id, id));
  }

  return {
    list: (project, window) =>
      attempt("Could not list the annotations", async () => {
        const overlaps = and(
          eq(annotations.projectId, project),
          lt(annotations.date, window.to),
          gte(sql`coalesce(${annotations.endDate}, ${annotations.date})`, window.from),
        );
        const [total] = await db.select({ total: count() }).from(annotations).where(overlaps);
        const rows = await db
          .select()
          .from(annotations)
          .where(overlaps)
          .orderBy(asc(annotations.date), asc(annotations.id))
          .limit(window.limit)
          .offset(window.offset);
        return { rows: rows.map(toRecord), total: total?.total ?? 0 };
      }),
    get: (project, id) =>
      attempt("Could not read the annotation", async () => {
        const [row] = await db.select().from(annotations).where(scoped(project, id));
        return row ? toRecord(row) : null;
      }),
    create: (project, annotation) =>
      attempt("Could not save the annotation", async () => {
        const [row] = await db
          .insert(annotations)
          .values({ id: `ann_${crypto.randomUUID()}`, projectId: project, ...annotation })
          .returning();
        if (!row) throw new Error("The annotation was not stored");
        return toRecord(row);
      }),
    update: (project, id, patch) =>
      attempt("Could not update the annotation", async () => {
        const [row] = await db
          .update(annotations)
          .set({ ...patch, updatedAt: sql`now()` })
          .where(scoped(project, id))
          .returning();
        return row ? toRecord(row) : null;
      }),
    remove: (project, id) =>
      attempt("Could not delete the annotation", async () => {
        const rows = await db
          .delete(annotations)
          .where(scoped(project, id))
          .returning({ id: annotations.id });
        return rows.length > 0;
      }),
  };
}
