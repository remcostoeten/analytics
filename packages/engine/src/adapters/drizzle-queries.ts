import { and, desc, eq } from "drizzle-orm";

import { queryRuns, querySecret } from "../db/schema";
import type { QueryLog } from "../ports";
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
