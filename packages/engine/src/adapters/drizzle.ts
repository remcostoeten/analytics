import type { Props } from "@remcostoeten/analytics-contract";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";
import { eq, inArray, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import { events, projects, rateLimits, sessions, visitors } from "../db/schema";
import type { EventDraft } from "../draft";
import { engineError } from "../errors";
import type { EventStore, ProjectStore, RateLimiter } from "../ports";

export type Database = PgDatabase<PgQueryResultHKT>;

type EventRow = typeof events.$inferInsert;
type Meta = { [key: string]: unknown };

const legacyTypes = new Set(["pageview", "click", "error"]);
const schemaVersion = 1;
const botThreshold = 50;

function legacyType(name: string) {
  return legacyTypes.has(name) ? name : "event";
}

function isBot(draft: EventDraft) {
  return draft.bot.score >= botThreshold;
}

function legacyDevice(draft: EventDraft) {
  if (!draft.enrichment.client.userAgent) return "unknown";
  if (isBot(draft)) return "bot";
  return draft.enrichment.device?.type ?? "unknown";
}

function present(values: Meta): Meta {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== null && value !== undefined),
  );
}

function legacyMeta(draft: EventDraft): Meta {
  const { event, enrichment } = draft;
  const context = event.context;
  return {
    ...event.props,
    ...present({
      eventName: legacyTypes.has(event.name) ? null : event.name,
      screenSize: context?.screen,
      viewport: context?.viewport,
      timezone: context?.tz,
      connectionType: context?.connection,
      utmSource: context?.utm?.source,
      utmMedium: context?.utm?.medium,
      utmCampaign: context?.utm?.campaign,
      utmTerm: context?.utm?.term,
      utmContent: context?.utm?.content,
      browser: enrichment.device?.browser,
      browserVersion: enrichment.device?.browserVersion,
      os: enrichment.device?.os,
      osVersion: enrichment.device?.osVersion,
    }),
  };
}

function toEventRow(draft: EventDraft): EventRow {
  const { event, enrichment, flags } = draft;
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
    origin: draft.origin,
    host: draft.host,
    ua: enrichment.client.userAgent,
    lang: event.context?.lang ?? null,
    deviceType: legacyDevice(draft),
    ipHash: enrichment.client.ipHash,
    visitorId: event.visitor,
    sessionId: event.session,
    country: geo?.country ?? null,
    region: geo?.region ?? null,
    city: geo?.city ?? null,
    latitude: geo?.latitude ?? null,
    longitude: geo?.longitude ?? null,
    timezone: geo?.timezone ?? null,
    postalCode: geo?.postalCode ?? null,
    continent: geo?.continent ?? null,
    asn: enrichment.network?.asn ?? null,
    asOrg: enrichment.network?.asOrg ?? null,
    isLocalhost: flags.localhost,
    isPreview: flags.preview,
    isInternal: flags.internal,
    botScore: draft.bot.score,
    botReasons: draft.bot.reasons,
    botDetected: isBot(draft),
    fingerprint: event.id,
    schemaVersion,
    meta: legacyMeta(draft),
  };
}

function groupBySession(drafts: EventDraft[]) {
  const groups = new Map<string, EventDraft[]>();
  for (const draft of drafts) {
    const key = `${draft.projectId}\u0000${draft.event.session}`;
    groups.set(key, [...(groups.get(key) ?? []), draft]);
  }
  return [...groups.values()].map((group) =>
    [...group].sort((left, right) => Date.parse(left.ts) - Date.parse(right.ts)),
  );
}

function timestamp(value: string) {
  return sql`${value}::timestamptz`;
}

function experiment(props: Props): Nullable<Meta> {
  const { experiment: name, variant } = props;
  return typeof name === "string" && typeof variant === "string" ? { [name]: variant } : null;
}

function visitorPatch(group: EventDraft[]): Meta {
  const identity: Meta = {};
  const experiments: Meta = {};
  for (const { event } of group) {
    if (event.name === "identify") Object.assign(identity, event.props);
    if (event.name === "experiment_exposure") Object.assign(experiments, experiment(event.props));
  }
  return present({
    identity: Object.keys(identity).length > 0 ? identity : null,
    experiments: Object.keys(experiments).length > 0 ? experiments : null,
  });
}

function mergedMeta(patch: Meta): SQL {
  let merged: SQL = sql`COALESCE(${visitors.meta}, '{}'::jsonb)`;
  for (const [path, value] of Object.entries(patch)) {
    merged = sql`jsonb_set(${merged}, ARRAY[${path}]::text[], COALESCE(${visitors.meta}->${path}, '{}'::jsonb) || ${JSON.stringify(value)}::jsonb, true)`;
  }
  return merged;
}

async function upsertSession(db: Database, group: EventDraft[]) {
  const first = group[0];
  const last = group.at(-1);
  if (!first || !last) return { inserted: false, internal: false };
  const internal = group.some((draft) => draft.flags.internal);
  const pageviews = group.filter((draft) => draft.event.name === "pageview").length;
  const lastEventAt = timestamp(last.ts);
  const latest = sql`GREATEST(${sessions.lastEventAt}, ${lastEventAt})`;
  const [row] = await db
    .insert(sessions)
    .values({
      projectId: first.projectId,
      sessionId: first.event.session,
      visitorId: first.event.visitor,
      startedAt: timestamp(first.ts),
      lastEventAt,
      entryPath: first.event.page.path,
      exitPath: last.event.page.path,
      entryRoute: first.event.page.route ?? null,
      exitRoute: last.event.page.route ?? null,
      referrer: first.event.page.referrer ?? null,
      channel: first.enrichment.source?.channel ?? null,
      utmSource: first.enrichment.source?.utm.source ?? null,
      utmCampaign: first.enrichment.source?.utm.campaign ?? null,
      pageviews,
      events: group.length,
      durationMs: Date.parse(last.ts) - Date.parse(first.ts),
      country: first.enrichment.geo?.country ?? null,
      deviceType: legacyDevice(first),
      isInternal: internal,
    })
    .onConflictDoUpdate({
      target: [sessions.projectId, sessions.sessionId],
      set: {
        lastEventAt: latest,
        exitPath: last.event.page.path,
        exitRoute: last.event.page.route ?? null,
        events: sql`${sessions.events} + ${group.length}`,
        pageviews: sql`${sessions.pageviews} + ${pageviews}`,
        durationMs: sql`(EXTRACT(EPOCH FROM (${latest} - ${sessions.startedAt})) * 1000)::integer`,
        isInternal: sql`${sessions.isInternal} OR ${internal}`,
      },
    })
    .returning({ inserted: sql<boolean>`xmax = 0`, internal: sessions.isInternal });
  return { inserted: row?.inserted ?? false, internal };
}

async function upsertVisitor(db: Database, group: EventDraft[], newSession: boolean) {
  const last = group.at(-1);
  if (!last) return false;
  const { client, device, geo } = last.enrichment;
  const internal = group.some((draft) => draft.flags.internal);
  const patch = visitorPatch(group);
  const details = {
    ipHash: client.ipHash,
    deviceType: legacyDevice(last),
    browser: device?.browser ?? null,
    browserVersion: device?.browserVersion ?? null,
    os: device?.os ?? null,
    osVersion: device?.osVersion ?? null,
    language: last.event.context?.lang ?? null,
    country: geo?.country ?? null,
    region: geo?.region ?? null,
    city: geo?.city ?? null,
    timezone: geo?.timezone ?? null,
    ua: client.userAgent,
    screenResolution: last.event.context?.screen ?? null,
  };
  const [row] = await db
    .insert(visitors)
    .values({
      ...details,
      projectId: last.projectId,
      fingerprint: last.event.visitor,
      isInternal: internal,
      meta: Object.keys(patch).length > 0 ? patch : null,
    })
    .onConflictDoUpdate({
      target: [visitors.projectId, visitors.fingerprint],
      set: {
        ...details,
        lastSeen: sql`now()`,
        visitCount: sql`${visitors.visitCount} + ${newSession ? 1 : 0}`,
        isInternal: sql`${visitors.isInternal} OR ${internal}`,
        ...(Object.keys(patch).length > 0 ? { meta: mergedMeta(patch) } : {}),
      },
    })
    .returning({ isInternal: visitors.isInternal });
  return row?.isInternal ?? internal;
}

async function markInternal(db: Database, group: EventDraft[]) {
  const first = group[0];
  if (!first) return;
  await db
    .update(events)
    .set({ isInternal: true })
    .where(
      inArray(
        events.fingerprint,
        group.map((draft) => draft.event.id),
      ),
    );
  await db
    .update(sessions)
    .set({ isInternal: true })
    .where(
      sql`${sessions.projectId} = ${first.projectId} AND ${sessions.sessionId} = ${first.event.session}`,
    );
}

function describe(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function unavailable(message: string, error: unknown) {
  return err({ ...engineError("UNAVAILABLE", message), cause: new Error(describe(error)) });
}

/**
 * @name drizzleStore
 * @description An `EventStore` on any Drizzle Postgres database. Events go in one multi-row insert
 * per batch with `ON CONFLICT DO NOTHING` on the event id, writing the v2 columns plus the legacy
 * `type`, `meta` and `device_type` values the v1 dashboard reads. Sessions and visitors are
 * upserted once per session; a visitor marked internal makes that session's new events internal.
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
        return unavailable("Could not store events", error);
      }
    },
    upsertSessions: async (drafts) => {
      try {
        for (const group of groupBySession(drafts)) {
          const session = await upsertSession(db, group);
          const visitorInternal = await upsertVisitor(db, group, session.inserted);
          if (visitorInternal && !session.internal) await markInternal(db, group);
        }
        return ok(undefined);
      } catch (error) {
        return unavailable("Could not store sessions", error);
      }
    },
  };
}

/**
 * @name drizzleProjects
 * @description A `ProjectStore` on the `projects` table.
 *
 * @example
 * const projects = drizzleProjects(db);
 * await projects.byPublicKey("pk_live_3f9c2a7d");
 */
export function drizzleProjects(db: Database): ProjectStore {
  async function find(where: SQL) {
    try {
      const [row] = await db
        .select({ id: projects.id, allowedOrigins: projects.allowedOrigins })
        .from(projects)
        .where(where)
        .limit(1);
      return ok(row ?? null);
    } catch (error) {
      return unavailable("Could not read projects", error);
    }
  }
  return {
    byPublicKey: (key) => find(eq(projects.publicKey, key)),
    bySecretHash: (hash) => find(eq(projects.secretKeyHash, hash)),
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
