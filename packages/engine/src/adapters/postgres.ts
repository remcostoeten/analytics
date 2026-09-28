import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import type { Clock, EventStore, ProjectStore, RateLimiter } from "../ports";
import type { Transact } from "../query/runner";
import { drizzleLimiter, drizzleProjects, drizzleStore } from "./drizzle";
import { accessOn } from "./drizzle-access";
import type { Access } from "./drizzle-access";

/**
 * @name postgresAdapters
 * @description The `EventStore`, `ProjectStore` and `RateLimiter` on Neon Postgres over HTTP, which suits
 * serverless functions: no connection pool to keep warm.
 *
 * @example
 * const { store, projects, limiter } = postgresAdapters(process.env.DATABASE_URL ?? "", systemClock());
 */
export function postgresAdapters(
  url: string,
  clock: Clock,
): { store: EventStore; projects: ProjectStore; limiter: RateLimiter } {
  const db = drizzle(neon(url));
  return {
    store: drizzleStore(db),
    projects: drizzleProjects(db),
    limiter: drizzleLimiter(db, clock),
  };
}

/**
 * @name postgresAccess
 * @description The project, token and member stores on Neon over HTTP, plus the Drizzle database
 * itself for Better Auth.
 *
 * @example
 * const access = postgresAccess(process.env.DATABASE_URL);
 */
export function postgresAccess(url: string): Access {
  return accessOn(drizzle(neon(url)), neonTransact(url));
}

/**
 * @name neonTransact
 * @description Runs console statements as one read-only, non-interactive Neon transaction over
 * HTTP and returns the last one's columns and rows as arrays.
 *
 * @example
 * await neonTransact(process.env.DATABASE_URL ?? "")([{ text: "SELECT 1", params: [] }]);
 */
export function neonTransact(url: string): Transact {
  const client = neon(url, { arrayMode: true, fullResults: true });
  return async (statements) => {
    const results = await client.transaction(
      statements.map((statement) => client.query(statement.text, statement.params)),
      { readOnly: true, arrayMode: true, fullResults: true },
    );
    const last = results.at(-1);
    return { columns: last?.fields.map((field) => field.name) ?? [], rows: last?.rows ?? [] };
  };
}
