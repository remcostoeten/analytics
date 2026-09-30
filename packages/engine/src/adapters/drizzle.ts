import type { Props } from "@remcostoeten/analytics-contract";
import { hasKeys, orNull } from "@remcostoeten/analytics-shared/records";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";
import { eq, inArray, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import {
  errorRules,
  events,
  projects,
  rateLimits,
  sessions,
  visitors,
  webVitals,
} from "../db/schema";
import type { EventDraft } from "../draft";
import { groupsKey } from "../groups";
import { engineError } from "../errors";
import type { EventStore, ProjectStore, RateLimiter } from "../ports";
import { vitalRow } from "../speed/vitals";
import type { VitalRow } from "../speed/vitals";

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
      release: context?.release,
      utmSource: context?.utm?.source,
      utmMedium: context?.utm?.medium,
      utmCampaign: context?.utm?.campaign,
      utmTerm: context?.utm?.term,
      utmContent: context?.utm?.content,
      browser: enrichment.device?.browser,
      browserVersion: enrichment.device?.browserVersion,
      os: enrichment.device?.os,
      osVersion: enrichment.device?.osVersion,
      [groupsKey]: event.groups ? orNull(event.groups) : null,
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
    identity: orNull(identity),
    experiments: orNull(experiments),
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
        exitPath: sql`CASE WHEN ${lastEventAt} >= ${sessions.lastEventAt} THEN ${last.event.page.path} ELSE ${sessions.exitPath} END`,
        exitRoute: sql`CASE WHEN ${lastEventAt} >= ${sessions.lastEventAt} THEN ${last.event.page.route ?? null} ELSE ${sessions.exitRoute} END`,
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
      meta: orNull(patch),
    })
    .onConflictDoUpdate({
      target: [visitors.projectId, visitors.fingerprint],
      set: {
        ...details,
        lastSeen: sql`now()`,
        visitCount: sql`${visitors.visitCount} + ${newSession ? 1 : 0}`,
        isInternal: sql`${visitors.isInternal} OR ${internal}`,
        ...(hasKeys(patch) ? { meta: mergedMeta(patch) } : {}),
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

/**
 * @name unavailable
 * @description An `UNAVAILABLE` engine error for a failed database call, keeping the driver's
 * message as the cause for the logs.
 *
 * @example
 * return unavailable("Could not read projects", error);
 */
export function unavailable(message: string, error: unknown) {
  return err({ ...engineError("UNAVAILABLE", message), cause: new Error(describe(error)) });
}

const sampleAfter = 100;

function issueGroups(drafts: EventDraft[]) {
  const groups = new Map<string, EventDraft[]>();
  for (const draft of drafts) {
    const key = `${draft.projectId}\u0000${draft.issue?.fingerprint ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), draft]);
  }
  return [...groups.values()].map((group) =>
    [...group].sort((left, right) => Date.parse(left.ts) - Date.parse(right.ts)),
  );
}

async function groupIssue(db: Database, group: EventDraft[]) {
  const first = group[0];
  const last = group.at(-1);
  if (!first?.issue || !last?.issue) return;
  const releases = group.map((draft) => draft.issue?.release).filter((release) => release);
  const result: unknown = await db.execute(
    sql`
    INSERT INTO issues (project_id, fingerprint, title, culprit, level, count, visitors, first_seen, last_seen,
      first_release, last_release, minute_start, minute_count)
    VALUES (${first.projectId}, ${first.issue.fingerprint}, ${last.issue.title}, ${last.issue.culprit},
      ${last.issue.level}, ${group.length}, 0, ${timestamp(first.ts)}, ${timestamp(last.ts)},
      ${releases[0] ?? null}, ${releases.at(-1) ?? null}, date_trunc('minute', now()), ${group.length})
    ON CONFLICT (project_id, fingerprint) DO UPDATE SET
      count = issues.count + excluded.count,
      first_seen = LEAST(issues.first_seen, excluded.first_seen),
      last_seen = GREATEST(issues.last_seen, excluded.last_seen),
      first_release = COALESCE(issues.first_release, excluded.first_release),
      last_release = COALESCE(excluded.last_release, issues.last_release),
      title = excluded.title,
      culprit = excluded.culprit,
      status = CASE
        WHEN issues.status = 'resolved' THEN 'open'
        WHEN issues.status = 'ignored' AND (issues.muted_until <= now()
          OR issues.mute_remaining <= excluded.count) THEN 'open'
        ELSE issues.status END,
      is_regression = issues.is_regression OR issues.status = 'resolved',
      regressed_at = CASE WHEN issues.status = 'resolved' THEN now() ELSE issues.regressed_at END,
      resolved_at = CASE WHEN issues.status = 'resolved' THEN NULL ELSE issues.resolved_at END,
      mute_remaining = CASE WHEN issues.mute_remaining IS NULL OR issues.mute_remaining <= excluded.count
        OR issues.muted_until <= now() THEN NULL ELSE issues.mute_remaining - excluded.count END,
      muted_until = CASE WHEN issues.muted_until <= now() OR issues.mute_remaining <= excluded.count
        THEN NULL ELSE issues.muted_until END,
      minute_count = CASE WHEN issues.minute_start = excluded.minute_start
        THEN issues.minute_count + excluded.minute_count ELSE excluded.minute_count END,
      minute_start = excluded.minute_start,
      updated_at = now()
    RETURNING id, minute_count`,
  );
  const rows =
    typeof result === "object" && result !== null && "rows" in result && Array.isArray(result.rows)
      ? (result.rows as { id: unknown; minute_count: unknown }[])
      : [];
  const [row] = rows;
  if (!row) return;
  const issueId = BigInt(String(row.id));
  const before = Number(row.minute_count) - group.length;
  const keep = Math.max(0, sampleAfter - before);
  const kept = group.slice(0, keep).map((draft) => draft.event.id);
  const dropped = group.slice(keep).map((draft) => draft.event.id);
  if (kept.length > 0) {
    await db.update(events).set({ issueId }).where(inArray(events.fingerprint, kept));
  }
  if (dropped.length > 0) await db.delete(events).where(inArray(events.fingerprint, dropped));
  await db.execute(
    sql`UPDATE issues SET visitors = (SELECT count(DISTINCT visitor_id) FROM events WHERE issue_id = ${issueId}) WHERE id = ${issueId}`,
  );
}

function propText(draft: EventDraft, field: "message" | "stack") {
  const value = draft.event.props[field];
  return typeof value === "string" ? value.toLowerCase() : "";
}

async function withoutIgnored(db: Database, drafts: EventDraft[]) {
  const projectIds = [...new Set(drafts.map((draft) => draft.projectId))];
  if (projectIds.length === 0) return drafts;
  const rules = await db
    .select({
      projectId: errorRules.projectId,
      field: errorRules.field,
      pattern: errorRules.pattern,
    })
    .from(errorRules)
    .where(inArray(errorRules.projectId, projectIds));
  if (rules.length === 0) return drafts;
  const ignored = drafts.filter((draft) =>
    rules.some(
      (rule) =>
        rule.projectId === draft.projectId &&
        propText(draft, rule.field).includes(rule.pattern.toLowerCase()),
    ),
  );
  if (ignored.length > 0) {
    await db.delete(events).where(
      inArray(
        events.fingerprint,
        ignored.map((draft) => draft.event.id),
      ),
    );
  }
  return drafts.filter((draft) => !ignored.includes(draft));
}

async function groupIssues(db: Database, drafts: EventDraft[]) {
  const counted = await withoutIgnored(db, drafts);
  for (const group of issueGroups(counted)) await groupIssue(db, group);
}

async function upsertVitals(db: Database, drafts: EventDraft[]) {
  const latest = new Map<string, VitalRow>();
  for (const row of drafts.map(vitalRow)) {
    if (!row) continue;
    const seen = latest.get(row.id);
    if (!seen || seen.ts <= row.ts) latest.set(row.id, row);
  }
  if (latest.size === 0) return;
  await db
    .insert(webVitals)
    .values([...latest.values()])
    .onConflictDoUpdate({
      target: webVitals.id,
      set: {
        value: sql`excluded.value`,
        rating: sql`excluded.rating`,
        ts: sql`excluded.ts`,
        selector: sql`excluded.selector`,
      },
      setWhere: sql`${webVitals.ts} <= excluded.ts`,
    });
}

/**
 * @name drizzleStore
 * @description An `EventStore` on any Drizzle Postgres database. Events go in one multi-row insert
 * per batch with `ON CONFLICT DO NOTHING` on the event id, writing the v2 columns plus the legacy
 * `type`, `meta` and `device_type` values the v1 dashboard reads. Sessions and visitors are
 * upserted once per session; a visitor marked internal makes that session's new events internal.
 * Human `web_vital` events also go to `web_vitals`, one row per metric id with its latest value.
 * Newly stored `error` events are grouped into `issues` by fingerprint: counts, visitors, releases
 * and a resolved issue reopening as a regression; a muted issue reopens once its date passes or
 * its count runs out; events matching a project's ignore rule are dropped uncounted; past 100 of
 * one issue in a minute, only the count is kept and the events are dropped.
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
        await groupIssues(
          db,
          drafts.filter((draft) => draft.issue && inserted.has(draft.event.id)),
        );
        await upsertVitals(
          db,
          drafts.filter((draft) => inserted.has(draft.event.id)),
        );
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
