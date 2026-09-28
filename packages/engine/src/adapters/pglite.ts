import type { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import type { Clock, EventStore, ProjectStore, RateLimiter } from "../ports";
import type { Answer, Statement, Transact } from "../query/runner";
import { drizzleLimiter, drizzleProjects, drizzleStore } from "./drizzle";
import { accessOn } from "./drizzle-access";
import type { Access } from "./drizzle-access";

/**
 * @name pgliteAdapters
 * @description The `EventStore`, `ProjectStore` and `RateLimiter` on an in-process PGlite database, for tests
 * and local runs. Migrate the database first.
 *
 * @example
 * const { store, projects, limiter } = pgliteAdapters(new PGlite(), systemClock());
 */
export function pgliteAdapters(
  client: PGlite,
  clock: Clock,
): { store: EventStore; projects: ProjectStore; limiter: RateLimiter } {
  const db = drizzle(client);
  return {
    store: drizzleStore(db),
    projects: drizzleProjects(db),
    limiter: drizzleLimiter(db, clock),
  };
}

/**
 * @name pgliteAccess
 * @description The project, token and member stores on an in-process PGlite database, plus the
 * Drizzle database itself for Better Auth. Migrate the database first.
 *
 * @example
 * const access = pgliteAccess(new PGlite());
 */
export function pgliteAccess(client: PGlite): Access {
  return accessOn(drizzle(client), pgliteTransact(client));
}

/**
 * @name pgliteTransact
 * @description Runs console statements in one read-only PGlite transaction and returns the last
 * one's columns and rows as arrays.
 *
 * @example
 * await pgliteTransact(client)([{ text: "SELECT 1", params: [] }]);
 */
export function pgliteTransact(client: PGlite): Transact {
  return (statements) =>
    client.transaction(async (tx) => {
      await tx.query("SET TRANSACTION READ ONLY");
      async function each(rest: Statement[], last: Answer): Promise<Answer> {
        const [statement, ...remaining] = rest;
        if (!statement) return last;
        const result = await tx.query<unknown[]>(statement.text, statement.params, {
          rowMode: "array",
        });
        return each(remaining, {
          columns: result.fields.map((field) => field.name),
          rows: result.rows,
        });
      }
      return each(statements, { columns: [], rows: [] });
    });
}
