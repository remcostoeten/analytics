import { builtInEvents } from "@remcostoeten/analytics-contract";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import { events, rateLimits } from "../db/schema";
import type { EventDraft } from "../draft";
import { engineError } from "../errors";
import type { EventStore, RateLimiter } from "../ports";

export type Database = PgDatabase<PgQueryResultHKT>;

type EventRow = typeof events.$inferInsert;

const legacyTypes = new Set(["pageview", "click", "error"]);
const builtIns = new Set<string>(builtInEvents);
const schemaVersion = 1;

function legacyType(name: string) {
  return legacyTypes.has(name) ? name : "event";
}

function toEventRow(draft: EventDraft): EventRow {
  const { event, enrichment } = draft;
  const geo = enrichment.geo;
  return {
    projectId: draft.projectId,
    type: legacyType(event.name),
    name: event.name,
    ts: new Date(draft.ts),
    receivedAt: new Date(draft.receivedAt),
    path: event.page.path,
    route: event.page.route ?? null,
    referrer: event.page.referrer ?? null,
    referrerDomain: enrichment.source?.referrerDomain ?? null,
    channel: enrichment.source?.channel ?? null,
    origin: draft.request.origin,
    ua: draft.request.userAgent,
    lang: event.context?.lang ?? null,
    deviceType: enrichment.device?.type ?? null,
    visitorId: event.visitor,
    sessionId: event.session,
    country: geo?.country ?? null,
    region: geo?.region ?? null,
    city: geo?.city ?? null,
    latitude: geo?.latitude ?? null,
    longitude: geo?.longitude ?? null,
    timezone: geo?.timezone ?? null,
    postalCode: geo?.postalCode ?? null,
    asn: enrichment.network?.asn ?? null,
    asOrg: enrichment.network?.asOrg ?? null,
    botScore: draft.bot.score,
    botReasons: draft.bot.reasons,
    botDetected: draft.bot.score >= 50,
    fingerprint: event.id,
    schemaVersion,
    meta: builtIns.has(event.name) ? event.props : { ...event.props, eventName: event.name },
  };
}

function describe(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * @name drizzleStore
 * @description An `EventStore` on any Drizzle Postgres database: one multi-row insert per batch
 * with `ON CONFLICT DO NOTHING` on the event id, returning which ids were new.
 *
 * @example
 * const store = drizzleStore(drizzle(new PGlite()));
 */
export function drizzleStore(db: Database): EventStore {
  return {
    insertEvents: async (drafts) => {
      try {
        const rows = await db
          .insert(events)
          .values(drafts.map(toEventRow))
          .onConflictDoNothing({ target: events.fingerprint })
          .returning({ id: events.fingerprint });
        const inserted = new Set(rows.map((row) => row.id));
        const ids = drafts.map((draft) => draft.event.id);
        return ok({
          inserted: ids.filter((id) => inserted.has(id)),
          duplicates: ids.filter((id) => !inserted.has(id)),
        });
      } catch (error) {
        return err({
          ...engineError("UNAVAILABLE", "Could not store events"),
          cause: new Error(describe(error)),
        });
      }
    },
  };
}

/**
 * @name drizzleLimiter
 * @description A fixed-window `RateLimiter` stored in `rate_limits`, so the count holds across
 * serverless instances. Each hit is one upsert that returns the new count.
 *
 * @example
 * const limiter = drizzleLimiter(db, systemClock());
 * const decision = await limiter.hit(`ingest:${ipHash}`, 600, 60);
 */
export function drizzleLimiter(db: Database, clock: { now: () => Date }): RateLimiter {
  return {
    hit: async (key, limit, windowSeconds) => {
      const windowMs = windowSeconds * 1000;
      const now = clock.now().getTime();
      const start = Math.floor(now / windowMs) * windowMs;
      const [row] = await db
        .insert(rateLimits)
        .values({ key, windowStart: new Date(start), hits: 1 })
        .onConflictDoUpdate({
          target: [rateLimits.key, rateLimits.windowStart],
          set: { hits: sql`${rateLimits.hits} + 1` },
        })
        .returning({ hits: rateLimits.hits });
      const hits = row?.hits ?? 1;
      const allowed = hits <= limit;
      return {
        allowed,
        hits,
        retryAfterSeconds: allowed ? 0 : Math.ceil((start + windowMs - now) / 1000),
      };
    },
  };
}
