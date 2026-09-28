import type {
  BotReason,
  Channel,
  DeviceType,
  EventRow,
  Person,
  PersonRow,
  Props,
  PropValue,
  SessionRow,
  Visit,
  VisitorRow,
} from "@remcostoeten/analytics-contract";
import { ok } from "@remcostoeten/analytics-shared/result";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";
import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import type { DetailStore, Keyset, Page } from "../ports";
import { scopeParts } from "../reads/scope";
import { defaultSignals } from "../signals";
import type { Database } from "./drizzle";
import { unavailable } from "./drizzle";

type Row = { [column: string]: unknown };

const dayMs = 24 * 60 * 60 * 1000;
const deviceTypes = new Set<string>(["desktop", "mobile", "tablet", "bot", "unknown"]);
const channels = new Set<string>([
  "direct",
  "search",
  "social",
  "referral",
  "email",
  "paid",
  "internal",
]);
const reasons = new Set<string>(defaultSignals.map((signal) => signal.name));
const contextKeys = new Set([
  "eventName",
  "screenSize",
  "viewport",
  "timezone",
  "connectionType",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmTerm",
  "utmContent",
  "browser",
  "browserVersion",
  "os",
  "osVersion",
  "release",
]);
const passiveEvents = ["pageview", "web_vital", "engagement", "scroll_depth"];
const recentSessions = 5;
const topPages = 5;

const eventColumns =
  sql.raw(`e.id AS row_id, e.fingerprint, e.name, e.type, e.meta, e.ts, e.visitor_id, e.session_id,
  e.path, e.route, e.referrer, e.referrer_domain, e.channel, e.country, e.region, e.city, e.postal_code, e.timezone,
  e.latitude, e.longitude, e.device_type, e.lang, e.bot_score, e.bot_reasons, e.is_internal, e.host`);

async function select(db: Database, query: SQL): Promise<Row[]> {
  const result: unknown = await db.execute(query);
  if (Array.isArray(result)) return result;
  if (
    typeof result === "object" &&
    result !== null &&
    "rows" in result &&
    Array.isArray(result.rows)
  ) {
    return result.rows;
  }
  return [];
}

async function attempt<Value>(message: string, run: () => Promise<Value>) {
  try {
    return ok(await run());
  } catch (error) {
    return unavailable(message, error);
  }
}

function text(value: unknown): Nullable<string> {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  return JSON.stringify(value);
}

function iso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

function count(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function decimal(value: unknown): Nullable<number> {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function record(value: unknown): { [key: string]: unknown } {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {};
}

function propValue(value: unknown): PropValue {
  return value === null || ["string", "number", "boolean"].includes(typeof value)
    ? (value as PropValue)
    : JSON.stringify(value);
}

function props(meta: unknown): Props {
  return Object.fromEntries(
    Object.entries(record(meta))
      .filter(([key]) => !contextKeys.has(key))
      .map(([key, value]) => [key, propValue(value)]),
  );
}

function device(value: unknown): DeviceType {
  const type = text(value) ?? "unknown";
  return deviceTypes.has(type) ? (type as DeviceType) : "unknown";
}

function channel(value: unknown): Channel {
  const name = text(value) ?? "direct";
  return channels.has(name) ? (name as Channel) : "direct";
}

function botReasons(value: unknown): BotReason[] {
  return Array.isArray(value)
    ? value.filter(
        (reason): reason is BotReason => typeof reason === "string" && reasons.has(reason),
      )
    : [];
}

function eventName(row: Row): string {
  return text(row.name) ?? text(record(row.meta).eventName) ?? text(row.type) ?? "event";
}

function geoOf(row: Row) {
  return {
    country: text(row.country),
    region: text(row.region),
    city: text(row.city),
    postalCode: text(row.postal_code),
    timezone: text(row.timezone),
    latitude: decimal(row.latitude),
    longitude: decimal(row.longitude),
  };
}

function deviceOf(row: Row) {
  const meta = record(row.meta);
  return {
    type: device(row.device_type),
    browser: text(meta.browser),
    browserVersion: text(meta.browserVersion),
    os: text(meta.os),
    osVersion: text(meta.osVersion),
    screen: text(meta.screenSize),
    viewport: text(meta.viewport),
    language: text(row.lang),
    connection: text(meta.connectionType),
  };
}

function sourceOf(row: Row) {
  const meta = record(row.meta);
  return {
    referrer: text(row.referrer),
    referrerDomain: text(row.referrer_domain),
    channel: channel(row.channel),
    utm: {
      source: text(meta.utmSource),
      medium: text(meta.utmMedium),
      campaign: text(meta.utmCampaign),
      term: text(meta.utmTerm),
      content: text(meta.utmContent),
    },
  };
}

function pageOf(row: Row) {
  return {
    path: text(row.path) ?? "/",
    route: text(row.route),
    title: null,
    referrer: text(row.referrer),
  };
}

function eventRow(row: Row): EventRow {
  return {
    id: text(row.fingerprint) ?? String(row.row_id),
    name: eventName(row),
    ts: iso(row.ts),
    visitor: text(row.visitor_id) ?? "unknown",
    session: text(row.session_id) ?? "unknown",
    page: pageOf(row),
    props: props(row.meta),
    geo: geoOf(row),
    device: deviceOf(row),
    bot: { score: count(row.bot_score), reasons: botReasons(row.bot_reasons) },
    isInternal: row.is_internal === true,
  };
}

function keysetAfter(rows: Row[], limit: number): Nullable<Keyset> {
  const last = rows.at(limit - 1);
  return rows.length > limit && last ? { ts: iso(last.ts), id: String(last.row_id) } : null;
}

function median(values: number[]): Nullable<number> {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const value =
    sorted.length % 2 === 0
      ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
      : (sorted[middle] ?? 0);
  return Math.round(value * 10) / 10;
}

function returnedWithin(starts: number[]) {
  const [first, ...later] = starts;
  function within(days: number) {
    return first !== undefined && later.some((start) => start - first <= days * dayMs);
  }
  return { day: within(1), week: within(7), month: within(30) };
}

function projectList(projects: string[]): SQL {
  return projects.length > 0
    ? sql`(${sql.join(
        projects.map((id) => sql`${id}`),
        sql`, `,
      )})`
    : sql`(NULL)`;
}

function traitsOf(identity: unknown): Props {
  return Object.fromEntries(
    Object.entries(record(identity))
      .filter(([key]) => key !== "userId")
      .map(([key, value]) => [key, propValue(value)]),
  );
}

/**
 * @name drizzleDetails
 * @description The `DetailStore` for visitor-level reads: raw events newest first with a keyset
 * cursor, visitors and sessions active in a scope, one visitor in full, marking a visitor as
 * internal everywhere, a session's events in order, and a visitor's numbered visits. Rows are
 * shaped as the contract's DTOs; values outside the contract's enums from older rows fall back to
 * `unknown`, `direct` or are left out.
 *
 * @example
 * const details = drizzleDetails(db);
 * const page = await details.events(scope, "signup", 20, null);
 */
export function drizzleDetails(db: Database): DetailStore {
  return {
    events: (scope, name, limit, after) =>
      attempt("Could not read events", async (): Promise<Page<EventRow>> => {
        const { joins, where } = scopeParts(scope, []);
        const named = name
          ? sql` AND COALESCE(e.name, e.meta->>'eventName', e.type) = ${name}`
          : sql``;
        const keyset = after
          ? sql` AND (e.ts, e.id) < (${after.ts}::timestamptz, ${Number(after.id)})`
          : sql``;
        const rows = await select(
          db,
          sql`SELECT ${eventColumns} FROM events e ${joins} WHERE ${where}${named}${keyset}
            ORDER BY e.ts DESC, e.id DESC LIMIT ${limit + 1}`,
        );
        return {
          rows: rows.slice(0, limit).map(eventRow),
          next: keysetAfter(rows, limit),
          total: null,
        };
      }),
    visitors: (scope, page) =>
      attempt("Could not read visitors", async (): Promise<Page<VisitorRow>> => {
        const { joins, where } = scopeParts(scope, []);
        const scoped = sql`WITH per AS (
            SELECT e.project_id, e.visitor_id, count(DISTINCT e.session_id) AS sessions,
              count(*) FILTER (WHERE e.type = 'pageview') AS pageviews, max(e.ts) AS last_ts,
              min(e.ts) AS first_ts
            FROM events e ${joins} WHERE ${where} AND e.visitor_id IS NOT NULL
            GROUP BY e.project_id, e.visitor_id
          )`;
        const [totals] = await select(db, sql`${scoped} SELECT count(*) AS total FROM per`);
        const rows = await select(
          db,
          sql`${scoped} SELECT per.*, v.first_seen, v.last_seen, v.is_internal, v.device_type, v.browser, v.country, v.meta
            FROM per LEFT JOIN visitors v ON v.project_id = per.project_id AND v.fingerprint = per.visitor_id
            ORDER BY per.last_ts DESC, per.visitor_id ASC LIMIT ${page.limit} OFFSET ${page.offset}`,
        );
        return {
          rows: rows.map((row) => ({
            id: String(row.visitor_id),
            firstSeen: iso(row.first_seen ?? row.first_ts),
            lastSeen: iso(row.last_ts),
            sessions: count(row.sessions),
            pageviews: count(row.pageviews),
            country: text(row.country),
            device: device(row.device_type),
            browser: text(row.browser),
            isInternal: row.is_internal === true,
            identified: typeof record(record(row.meta).identity).userId === "string",
          })),
          next: null,
          total: count(totals?.total),
        };
      }),
    visitor: (project, visitor) =>
      attempt("Could not read the visitor", async () => {
        const [person] = await select(
          db,
          sql`SELECT first_seen, last_seen, is_internal, meta FROM visitors WHERE project_id = ${project} AND fingerprint = ${visitor}`,
        );
        const [totals] = await select(
          db,
          sql`SELECT count(DISTINCT session_id) AS sessions, count(*) FILTER (WHERE type = 'pageview') AS pageviews,
              count(*) FILTER (WHERE type <> 'pageview') AS events, count(DISTINCT (ts AT TIME ZONE 'UTC')::date) AS days,
              min(ts) AS first_ts, max(ts) AS last_ts
            FROM events WHERE project_id = ${project} AND visitor_id = ${visitor}`,
        );
        if (
          !person &&
          count(totals?.sessions) === 0 &&
          count(totals?.pageviews) + count(totals?.events) === 0
        ) {
          return null;
        }
        const [latest] = await select(
          db,
          sql`SELECT ${eventColumns} FROM events e WHERE e.project_id = ${project} AND e.visitor_id = ${visitor}
            ORDER BY e.ts DESC, e.id DESC LIMIT 1`,
        );
        const sessions = await select(
          db,
          sql`SELECT session_id, min(ts) AS started_at, max(ts) AS ended_at,
              count(*) FILTER (WHERE type = 'pageview') AS pageviews,
              (array_agg(path ORDER BY ts ASC))[1] AS entry_page, (array_agg(path ORDER BY ts DESC))[1] AS exit_page,
              (array_agg(referrer ORDER BY ts ASC))[1] AS referrer
            FROM events WHERE project_id = ${project} AND visitor_id = ${visitor} AND session_id IS NOT NULL
            GROUP BY session_id ORDER BY min(ts) ASC`,
        );
        const pages = await select(
          db,
          sql`SELECT path AS value, count(*) AS pageviews FROM events
            WHERE project_id = ${project} AND visitor_id = ${visitor} AND type = 'pageview' AND path IS NOT NULL
            GROUP BY path ORDER BY 2 DESC, 1 ASC LIMIT ${topPages}`,
        );
        const meta = record(person?.meta);
        const identity = record(meta.identity);
        const { userId, ...traits } = identity;
        const starts = sessions.map((row) => new Date(iso(row.started_at)).getTime());
        const gaps = starts
          .slice(1)
          .map((start, index) => (start - (starts[index] ?? start)) / dayMs);
        const experiments = Object.fromEntries(
          Object.entries(record(meta.experiments)).map(([key, value]) => [key, String(value)]),
        );
        return {
          id: visitor,
          firstSeen: iso(person?.first_seen ?? totals?.first_ts),
          lastSeen: iso(totals?.last_ts ?? person?.last_seen),
          sessions: count(totals?.sessions),
          pageviews: count(totals?.pageviews),
          events: count(totals?.events),
          visitCount: sessions.length,
          daysActive: count(totals?.days),
          medianDaysBetweenVisits: median(gaps),
          returnedWithin: returnedWithin(starts),
          isInternal: person?.is_internal === true,
          identity:
            typeof userId === "string"
              ? {
                  userId,
                  traits: Object.fromEntries(
                    Object.entries(traits).map(([key, value]) => [key, propValue(value)]),
                  ),
                }
              : null,
          experiments,
          geo: latest ? geoOf(latest) : geoOf({}),
          device: latest ? deviceOf(latest) : deviceOf({}),
          topPages: pages.map((row) => ({
            value: String(row.value),
            pageviews: count(row.pageviews),
          })),
          recentSessions: sessions
            .slice(-recentSessions)
            .reverse()
            .map((row) => ({
              id: String(row.session_id),
              startedAt: iso(row.started_at),
              durationMs:
                new Date(iso(row.ended_at)).getTime() - new Date(iso(row.started_at)).getTime(),
              pageviews: count(row.pageviews),
              entryPage: text(row.entry_page) ?? "",
              exitPage: text(row.exit_page) ?? "",
              referrer: text(row.referrer),
            })),
        };
      }),
    markVisitor: (project, visitor, internal) =>
      attempt("Could not update the visitor", async () => {
        const found = await select(
          db,
          sql`UPDATE visitors SET is_internal = ${internal} WHERE project_id = ${project} AND fingerprint = ${visitor} RETURNING id`,
        );
        const events = await select(
          db,
          sql`UPDATE events SET is_internal = ${internal} WHERE project_id = ${project} AND visitor_id = ${visitor} RETURNING id`,
        );
        if (found.length === 0 && events.length === 0) return null;
        const sessions = await select(
          db,
          sql`UPDATE sessions SET is_internal = ${internal} WHERE project_id = ${project} AND visitor_id = ${visitor} RETURNING id`,
        );
        return { eventsUpdated: events.length, sessionsUpdated: sessions.length };
      }),
    sessions: (scope, page) =>
      attempt("Could not read sessions", async (): Promise<Page<SessionRow>> => {
        const { joins, where } = scopeParts(scope, []);
        const scoped = sql`WITH ids AS (
            SELECT DISTINCT e.project_id, e.session_id FROM events e ${joins} WHERE ${where} AND e.session_id IS NOT NULL
          ),
          per AS (
            SELECT e.project_id, e.session_id, min(e.ts) AS started_at, max(e.ts) AS last_event_at,
              count(*) FILTER (WHERE e.type = 'pageview') AS pageviews, count(*) AS events,
              max(e.bot_score) AS bot_score, bool_or(COALESCE(e.is_internal, false)) AS is_internal,
              (array_agg(e.path ORDER BY e.ts ASC))[1] AS entry_path, (array_agg(e.path ORDER BY e.ts DESC))[1] AS exit_path,
              (array_agg(e.route ORDER BY e.ts ASC))[1] AS entry_route, (array_agg(e.route ORDER BY e.ts DESC))[1] AS exit_route,
              (array_agg(e.id ORDER BY e.ts ASC))[1] AS first_id
            FROM events e JOIN ids ON ids.project_id = e.project_id AND ids.session_id = e.session_id
            GROUP BY e.project_id, e.session_id
          )`;
        const [totals] = await select(db, sql`${scoped} SELECT count(*) AS total FROM per`);
        const rows = await select(
          db,
          sql`${scoped} SELECT per.*, ${eventColumns}, per.bot_score AS session_bot_score, per.is_internal AS session_internal
            FROM per JOIN events e ON e.id = per.first_id
            ORDER BY per.started_at DESC, per.session_id ASC LIMIT ${page.limit} OFFSET ${page.offset}`,
        );
        return {
          rows: rows.map((row) => {
            const startedAt = iso(row.started_at);
            const lastEventAt = iso(row.last_event_at);
            return {
              id: String(row.session_id),
              visitorId: text(row.visitor_id) ?? "unknown",
              startedAt,
              lastEventAt,
              durationMs: new Date(lastEventAt).getTime() - new Date(startedAt).getTime(),
              pageviews: count(row.pageviews),
              events: count(row.events),
              isBounce: count(row.pageviews) <= 1,
              entryPath: text(row.entry_path) ?? "",
              exitPath: text(row.exit_path) ?? "",
              entryRoute: text(row.entry_route),
              exitRoute: text(row.exit_route),
              source: sourceOf(row),
              geo: geoOf(row),
              device: deviceOf(row),
              bot: { score: count(row.session_bot_score), reasons: botReasons(row.bot_reasons) },
              isInternal: row.session_internal === true,
            };
          }),
          next: null,
          total: count(totals?.total),
        };
      }),
    sessionEvents: (project, session, limit, after) =>
      attempt("Could not read the session", async () => {
        const [summary] = await select(
          db,
          sql`SELECT min(ts) AS started_at, max(ts) AS ended_at, max(bot_score) AS bot_score,
              (array_agg(visitor_id ORDER BY ts ASC))[1] AS visitor_id,
              (SELECT array_agg(DISTINCT reason) FROM events r, unnest(r.bot_reasons) AS reason
                WHERE r.project_id = ${project} AND r.session_id = ${session}) AS bot_reasons
            FROM events WHERE project_id = ${project} AND session_id = ${session}`,
        );
        if (!summary?.started_at) return null;
        const keyset = after
          ? sql` AND (e.ts, e.id) > (${after.ts}::timestamptz, ${Number(after.id)})`
          : sql``;
        const rows = await select(
          db,
          sql`SELECT ${eventColumns} FROM events e WHERE e.project_id = ${project} AND e.session_id = ${session}${keyset}
            ORDER BY e.ts ASC, e.id ASC LIMIT ${limit + 1}`,
        );
        const startedAt = iso(summary.started_at);
        return {
          session: {
            id: session,
            visitor: text(summary.visitor_id) ?? "unknown",
            startedAt,
            durationMs: new Date(iso(summary.ended_at)).getTime() - new Date(startedAt).getTime(),
            bot: { score: count(summary.bot_score), reasons: botReasons(summary.bot_reasons) },
          },
          page: {
            rows: rows.slice(0, limit).map((row) => {
              const event = eventRow(row);
              return {
                id: event.id,
                name: event.name,
                ts: event.ts,
                page: event.page,
                props: event.props,
              };
            }),
            next: keysetAfter(rows, limit),
            total: null,
          },
        };
      }),
    visits: (project, visitor, page) =>
      attempt("Could not read the visits", async (): Promise<Page<Visit>> => {
        const sessions = await select(
          db,
          sql`SELECT session_id, min(ts) AS started_at, max(ts) AS ended_at,
              row_number() OVER (ORDER BY min(ts) ASC) AS visit_number,
              count(*) OVER () AS total
            FROM events WHERE project_id = ${project} AND visitor_id = ${visitor} AND session_id IS NOT NULL
            GROUP BY session_id ORDER BY min(ts) ASC LIMIT ${page.limit + 1} OFFSET ${Math.max(page.offset - 1, 0)}`,
        );
        const previousStart = page.offset > 0 ? sessions.shift() : undefined;
        const [domain] = await select(db, sql`SELECT domain FROM projects WHERE id = ${project}`);
        const visits: Visit[] = [];
        let before = previousStart ? new Date(iso(previousStart.started_at)).getTime() : null;
        for (const summary of sessions.slice(0, page.limit)) {
          const events = await select(
            db,
            sql`SELECT ${eventColumns},
                EXTRACT(EPOCH FROM lead(e.ts) OVER (PARTITION BY e.type = 'pageview' ORDER BY e.ts) - e.ts) * 1000 AS stay
              FROM events e WHERE e.project_id = ${project} AND e.session_id = ${String(summary.session_id)}
              ORDER BY e.ts ASC, e.id ASC`,
          );
          const first = events[0] ?? {};
          const start = new Date(iso(summary.started_at)).getTime();
          const depths = new Map<string, number>();
          for (const event of events) {
            if (eventName(event) !== "scroll_depth") continue;
            const depth = decimal(record(event.meta).depth);
            if (depth !== null)
              depths.set(
                text(event.path) ?? "/",
                Math.max(depths.get(text(event.path) ?? "/") ?? 0, depth),
              );
          }
          visits.push({
            visitNumber: count(summary.visit_number),
            sessionId: String(summary.session_id),
            startedAt: iso(summary.started_at),
            endedAt: iso(summary.ended_at),
            sincePreviousVisitMs: before === null ? null : start - before,
            entryUrl: `https://${text(first.host) ?? text(domain?.domain) ?? "localhost"}${text(first.path) ?? "/"}`,
            exitPath: text(events.at(-1)?.path) ?? "/",
            source: sourceOf(first),
            pages: events
              .filter((event) => event.type === "pageview")
              .map((event) => {
                const path = text(event.path) ?? "/";
                const depth = depths.get(path);
                return {
                  path,
                  at: iso(event.ts),
                  timeOnPageMs: Math.max(Math.round(count(event.stay)), 0),
                  scrollDepth: depth === undefined ? null : Math.min(depth / 100, 1),
                };
              }),
            actions: events
              .filter((event) => !passiveEvents.includes(eventName(event)))
              .map((event) => ({
                at: iso(event.ts),
                name: eventName(event),
                props: props(event.meta),
              })),
          });
          before = start;
        }
        const total = count(sessions[0]?.total ?? previousStart?.total);
        return { rows: visits, next: null, total };
      }),
    people: (projects, page) =>
      attempt("Could not read people", async (): Promise<Page<PersonRow>> => {
        const identified = sql`WITH identified AS (
            SELECT v.project_id, v.fingerprint, v.first_seen, v.last_seen, v.meta->'identity' AS identity,
              v.meta->'identity'->>'userId' AS user_id
            FROM visitors v
            WHERE v.project_id IN ${projectList(projects)} AND v.meta->'identity'->>'userId' IS NOT NULL
          ),
          per AS (
            SELECT user_id, min(first_seen) AS first_seen, max(last_seen) AS last_seen,
              count(DISTINCT project_id) AS projects,
              (array_agg(project_id ORDER BY first_seen ASC))[1] AS first_project,
              (array_agg(identity ORDER BY last_seen DESC))[1] AS identity
            FROM identified GROUP BY user_id
          )`;
        const [totals] = await select(db, sql`${identified} SELECT count(*) AS total FROM per`);
        const rows = await select(
          db,
          sql`${identified} SELECT per.*, (
              SELECT count(DISTINCT e.project_id || ':' || e.session_id) FROM events e
              JOIN identified i ON i.project_id = e.project_id AND i.fingerprint = e.visitor_id
              WHERE i.user_id = per.user_id AND e.session_id IS NOT NULL
            ) AS visits
            FROM per ORDER BY per.last_seen DESC, per.user_id ASC LIMIT ${page.limit} OFFSET ${page.offset}`,
        );
        return {
          rows: rows.map((row) => ({
            userId: String(row.user_id),
            traits: traitsOf(row.identity),
            firstSeen: iso(row.first_seen),
            lastSeen: iso(row.last_seen),
            firstProject: String(row.first_project),
            projects: count(row.projects),
            visits: count(row.visits),
          })),
          next: null,
          total: count(totals?.total),
        };
      }),
    person: (projects, userId) =>
      attempt("Could not read the person", async (): Promise<Nullable<Person>> => {
        const visitors = await select(
          db,
          sql`SELECT project_id, fingerprint, first_seen, last_seen, meta FROM visitors
            WHERE project_id IN ${projectList(projects)} AND meta->'identity'->>'userId' = ${userId}
            ORDER BY first_seen ASC, project_id ASC`,
        );
        const [first] = visitors;
        if (!first) return null;
        const pairs = sql.join(
          visitors.map((row) => sql`(${String(row.project_id)}, ${String(row.fingerprint)})`),
          sql`, `,
        );
        const visits = await select(
          db,
          sql`SELECT e.project_id, e.visitor_id, e.session_id, min(e.ts) AS started_at,
              count(*) FILTER (WHERE e.type = 'pageview') AS pages,
              (array_agg(e.path ORDER BY e.ts ASC))[1] AS entry_path,
              (array_agg(COALESCE(e.host, p.domain) ORDER BY e.ts ASC))[1] AS host,
              row_number() OVER (PARTITION BY e.project_id, e.visitor_id ORDER BY min(e.ts) ASC) AS visit_number
            FROM events e JOIN projects p ON p.id = e.project_id
            WHERE (e.project_id, e.visitor_id) IN (${pairs}) AND e.session_id IS NOT NULL
            GROUP BY e.project_id, e.visitor_id, e.session_id
            ORDER BY min(e.ts) ASC`,
        );
        const [source] = await select(
          db,
          sql`SELECT ${eventColumns} FROM events e
            WHERE e.project_id = ${String(first.project_id)} AND e.visitor_id = ${String(first.fingerprint)}
            ORDER BY e.ts ASC, e.id ASC LIMIT 1`,
        );
        const latest = visitors.reduce((newest, row) =>
          new Date(iso(row.last_seen)) > new Date(iso(newest.last_seen)) ? row : newest,
        );
        return {
          userId,
          traits: traitsOf(record(latest.meta).identity),
          firstSeen: iso(first.first_seen),
          lastSeen: iso(latest.last_seen),
          firstProject: String(first.project_id),
          firstSource: sourceOf(source ?? {}),
          projects: visitors.map((row) => ({
            projectId: String(row.project_id),
            visitorId: String(row.fingerprint),
            firstSeen: iso(row.first_seen),
            visits: visits.filter(
              (visit) =>
                visit.project_id === row.project_id && visit.visitor_id === row.fingerprint,
            ).length,
          })),
          visits: visits.map((visit) => ({
            projectId: String(visit.project_id),
            visitNumber: count(visit.visit_number),
            startedAt: iso(visit.started_at),
            entryUrl: `https://${text(visit.host) ?? "localhost"}${text(visit.entry_path) ?? "/"}`,
            pages: count(visit.pages),
          })),
        };
      }),
  };
}
