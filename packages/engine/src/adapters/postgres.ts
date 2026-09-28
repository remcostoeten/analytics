import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import type { Clock, EventStore, ProjectStore, RateLimiter } from "../ports";
import { drizzleLimiter, drizzleProjects, drizzleStore } from "./drizzle";

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
