import type { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import type { Clock, EventStore, RateLimiter } from "../ports";
import { drizzleLimiter, drizzleStore } from "./drizzle";

/**
 * @name pgliteAdapters
 * @description The `EventStore` and `RateLimiter` on an in-process PGlite database, for tests
 * and local runs. Migrate the database first.
 *
 * @example
 * const { store, limiter } = pgliteAdapters(new PGlite(), systemClock());
 */
export function pgliteAdapters(
  client: PGlite,
  clock: Clock,
): { store: EventStore; limiter: RateLimiter } {
  const db = drizzle(client);
  return { store: drizzleStore(db), limiter: drizzleLimiter(db, clock) };
}
