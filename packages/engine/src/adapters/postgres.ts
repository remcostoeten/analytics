import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import type { Clock, EventStore, RateLimiter } from "../ports";
import { drizzleLimiter, drizzleStore } from "./drizzle";

/**
 * @name postgresAdapters
 * @description The `EventStore` and `RateLimiter` on Neon Postgres over HTTP, which suits
 * serverless functions: no connection pool to keep warm.
 *
 * @example
 * const { store, limiter } = postgresAdapters(process.env.DATABASE_URL ?? "", systemClock());
 */
export function postgresAdapters(
  url: string,
  clock: Clock,
): { store: EventStore; limiter: RateLimiter } {
  const db = drizzle(neon(url));
  return { store: drizzleStore(db), limiter: drizzleLimiter(db, clock) };
}
