import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import type { Clock, EventStore, ProjectStore, RateLimiter } from "../ports";
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
  return accessOn(drizzle(neon(url)));
}
