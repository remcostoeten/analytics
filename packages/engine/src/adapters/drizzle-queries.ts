import { and, desc, eq, sql } from "drizzle-orm";

import { queryRuns, querySecret, savedQueries } from "../db/schema";
import type { QueryLog, SavedQuery, SavedQueryStore } from "../ports";
import type { Database } from "./drizzle";
import { attempt } from "./drizzle-rows";

/**
 * @name drizzleQueryLog
 * @description The `QueryLog` on the `query_runs` table: every console run, blocked or not, and
 * the latest runs of one actor, or of everyone when the actor is null.
 *
 * @example
 * await drizzleQueryLog(db).history({ kind: "user", id: "user_1" }, 100);
 */
export function drizzleQueryLog(db: Database): QueryLog {
  return {
    record: (run) =>
      attempt("Could not log the query", async () => {
        await db.insert(queryRuns).values({
          actorKind: run.actor.kind,
          actorId: run.actor.id,
          projectIds: run.projectIds,
          statement: run.statement,
          durationMs: run.durationMs,
          rowCount: run.rowCount,
          blocked: run.blocked,
          error: run.error,
        });
        return null;
      }),
    history: (actor, limit) =>
      attempt("Could not read the query history", async () => {
        const rows = await db
          .select()
          .from(queryRuns)
          .where(
            actor
              ? and(eq(queryRuns.actorKind, actor.kind), eq(queryRuns.actorId, actor.id))
              : undefined,
          )
          .orderBy(desc(queryRuns.createdAt), desc(queryRuns.id))
          .limit(limit);
        return rows.map((row) => ({
          id: row.id.toString(),
          actor: { kind: row.actorKind, id: row.actorId },
          projectIds: row.projectIds,
          statement: row.statement,
          durationMs: row.durationMs,
          rowCount: row.rowCount,
          blocked: row.blocked,
          error: row.error,
          createdAt: row.createdAt,
        }));
      }),
  };
}

/**
 * @name readQuerySecret
 * @description The secret migration 0024 generated, which signs the project ids a console query
 * may read.
 *
 * @example
 * const secret = await readQuerySecret(db);
 */
export async function readQuerySecret(db: Database): Promise<string> {
  const [row] = await db.select({ secret: querySecret.secret }).from(querySecret).limit(1);
  if (!row) throw new Error("query_secret is empty; run migration 0024");
  return row.secret;
}

function toSaved(row: typeof savedQueries.$inferSelect): SavedQuery {
  return {
    id: row.id,
    name: row.name,
    sql: row.sql,
    description: row.description,
    chart: row.chart,
    createdBy: { kind: row.createdByKind, id: row.createdById },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * @name drizzleSavedQueries
 * @description The `SavedQueryStore` on the `saved_queries` table, listed by name; new ids are
 * `sq_` plus a random UUID.
 *
 * @example
 * await drizzleSavedQueries(db).create({ name: "Top routes", sql: "select 1", description: null, chart: null, createdBy });
 */
export function drizzleSavedQueries(db: Database): SavedQueryStore {
  return {
    list: () =>
      attempt("Could not list the saved queries", async () => {
        const rows = await db
          .select()
          .from(savedQueries)
          .orderBy(sql`lower(${savedQueries.name})`, savedQueries.id);
        return rows.map(toSaved);
      }),
    get: (id) =>
      attempt("Could not read the saved query", async () => {
        const [row] = await db.select().from(savedQueries).where(eq(savedQueries.id, id));
        return row ? toSaved(row) : null;
      }),
    create: (query) =>
      attempt("Could not save the query", async () => {
        const [row] = await db
          .insert(savedQueries)
          .values({
            id: `sq_${crypto.randomUUID()}`,
            name: query.name,
            sql: query.sql,
            description: query.description,
            chart: query.chart,
            createdByKind: query.createdBy.kind,
            createdById: query.createdBy.id,
          })
          .returning();
        if (!row) throw new Error("The saved query was not stored");
        return toSaved(row);
      }),
    update: (id, patch) =>
      attempt("Could not update the saved query", async () => {
        const [row] = await db
          .update(savedQueries)
          .set({ ...patch, updatedAt: sql`now()` })
          .where(eq(savedQueries.id, id))
          .returning();
        return row ? toSaved(row) : null;
      }),
    remove: (id) =>
      attempt("Could not delete the saved query", async () => {
        const rows = await db
          .delete(savedQueries)
          .where(eq(savedQueries.id, id))
          .returning({ id: savedQueries.id });
        return rows.length > 0;
      }),
  };
}
