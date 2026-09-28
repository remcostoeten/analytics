import type { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import type { Clock, EventStore, ProjectStore, RateLimiter } from "../ports";
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
  return accessOn(drizzle(client));
}
