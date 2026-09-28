import type {
  EventList,
  SessionEvents,
  SessionList,
  UpdatedVisitor,
  VisitList,
  VisitorDetail,
  VisitorList,
} from "@remcostoeten/analytics-contract";
import { engineError } from "@remcostoeten/analytics-engine";
import type { DetailStore, EngineError, Keyset } from "@remcostoeten/analytics-engine";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

import { nextCursor, readPage } from "../reads/params";
import { readScope } from "../reads/service";

const defaultLimit = 20;
const maxLimit = 100;

function invalid<Value>(message: string): Result<Value, EngineError> {
  return err(engineError("VALIDATION_FAILED", message));
}

function readLimit(params: URLSearchParams): Result<number, EngineError> {
  const limit = Number(params.get("limit") ?? defaultLimit);
  return Number.isInteger(limit) && limit >= 1 && limit <= maxLimit
    ? ok(limit)
    : invalid(`limit must be a whole number from 1 to ${maxLimit}`);
}

/**
 * @name readKeyset
 * @description The position in a time-ordered list from an opaque `cursor`, or null without one.
 *
 * @example
 * readKeyset(params); // ok({ ts: "2026-09-27T16:39:59.901Z", id: "42" })
 */
function readKeyset(params: URLSearchParams): Result<Nullable<Keyset>, EngineError> {
  const cursor = params.get("cursor");
  if (!cursor) return ok(null);
  try {
    const decoded: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (typeof decoded === "object" && decoded !== null && "ts" in decoded && "id" in decoded) {
      const { ts, id } = decoded;
      if (
        typeof ts === "string" &&
        typeof id === "string" &&
        !Number.isNaN(Date.parse(ts)) &&
        /^\d+$/.test(id)
      ) {
        return ok({ ts, id });
      }
    }
  } catch {
    return invalid("cursor is not valid");
  }
  return invalid("cursor is not valid");
}

function keysetCursor(next: Nullable<Keyset>) {
  return next ? Buffer.from(JSON.stringify(next)).toString("base64url") : null;
}

/**
 * @name listEvents
 * @description Raw events in the scope, newest first, optionally one `name` only.
 *
 * @example
 * await listEvents(store, params, "remcostoeten.nl", new Date());
 */
export async function listEvents(
  store: DetailStore,
  params: URLSearchParams,
  project: string,
  now: Date,
): Promise<Result<EventList, EngineError>> {
  const scoped = readScope(params, [project], now);
  if (!scoped.ok) return scoped;
  const limit = readLimit(params);
  if (!limit.ok) return limit;
  const after = readKeyset(params);
  if (!after.ok) return after;
  const page = await store.events(scoped.value.scope, params.get("name"), limit.value, after.value);
  if (!page.ok) return page;
  return ok({ data: page.value.rows, nextCursor: keysetCursor(page.value.next) });
}

/**
 * @name listVisitors
 * @description Visitors active in the scope, most recently seen first.
 *
 * @example
 * await listVisitors(store, params, "remcostoeten.nl", new Date());
 */
export async function listVisitors(
  store: DetailStore,
  params: URLSearchParams,
  project: string,
  now: Date,
): Promise<Result<VisitorList, EngineError>> {
  const scoped = readScope(params, [project], now);
  if (!scoped.ok) return scoped;
  const page = readPage(params);
  if (!page.ok) return page;
  const found = await store.visitors(scoped.value.scope, page.value);
  if (!found.ok) return found;
  const { rows, total } = found.value;
  return ok({ data: rows, nextCursor: nextCursor(page.value.offset, rows.length, total ?? 0) });
}

/**
 * @name listSessions
 * @description Sessions with events in the scope, newest first.
 *
 * @example
 * await listSessions(store, params, "remcostoeten.nl", new Date());
 */
export async function listSessions(
  store: DetailStore,
  params: URLSearchParams,
  project: string,
  now: Date,
): Promise<Result<SessionList, EngineError>> {
  const scoped = readScope(params, [project], now);
  if (!scoped.ok) return scoped;
  const page = readPage(params);
  if (!page.ok) return page;
  const found = await store.sessions(scoped.value.scope, page.value);
  if (!found.ok) return found;
  const { rows, total } = found.value;
  return ok({ data: rows, nextCursor: nextCursor(page.value.offset, rows.length, total ?? 0) });
}

/**
 * @name visitorDetail
 * @description One visitor in full, or `NOT_FOUND`.
 *
 * @example
 * await visitorDetail(store, "remcostoeten.nl", "8c4e1f0a", new Date());
 */
export async function visitorDetail(
  store: DetailStore,
  project: string,
  visitor: string,
  now: Date,
): Promise<Result<VisitorDetail, EngineError>> {
  const found = await store.visitor(project, visitor, now);
  if (!found.ok) return found;
  return found.value
    ? ok({ data: found.value })
    : err(engineError("NOT_FOUND", "Visitor not found"));
}

/**
 * @name markVisitor
 * @description Marks a visitor, their events and their sessions as internal traffic, or unmarks
 * them, and reports how many rows changed.
 *
 * @example
 * await markVisitor(store, "remcostoeten.nl", "8c4e1f0a", true);
 */
export async function markVisitor(
  store: DetailStore,
  project: string,
  visitor: string,
  internal: boolean,
): Promise<Result<UpdatedVisitor, EngineError>> {
  const marked = await store.markVisitor(project, visitor, internal);
  if (!marked.ok) return marked;
  if (!marked.value) return err(engineError("NOT_FOUND", "Visitor not found"));
  return ok({ data: { id: visitor, isInternal: internal, ...marked.value } });
}

/**
 * @name sessionTrail
 * @description Every event in one session in order, paged with a cursor, or `NOT_FOUND`.
 *
 * @example
 * await sessionTrail(store, params, "remcostoeten.nl", "f1a2b3c4");
 */
export async function sessionTrail(
  store: DetailStore,
  params: URLSearchParams,
  project: string,
  session: string,
): Promise<Result<SessionEvents, EngineError>> {
  const limit = readLimit(params);
  if (!limit.ok) return limit;
  const after = readKeyset(params);
  if (!after.ok) return after;
  const found = await store.sessionEvents(project, session, limit.value, after.value);
  if (!found.ok) return found;
  if (!found.value) return err(engineError("NOT_FOUND", "Session not found"));
  return ok({
    session: found.value.session,
    data: found.value.page.rows,
    nextCursor: keysetCursor(found.value.page.next),
  });
}

/**
 * @name visitorVisits
 * @description A visitor's visits, oldest first and numbered, each with its pages and actions.
 *
 * @example
 * await visitorVisits(store, params, "remcostoeten.nl", "8c4e1f0a");
 */
export async function visitorVisits(
  store: DetailStore,
  params: URLSearchParams,
  project: string,
  visitor: string,
): Promise<Result<VisitList, EngineError>> {
  const page = readPage(params);
  if (!page.ok) return page;
  const found = await store.visits(project, visitor, page.value);
  if (!found.ok) return found;
  const { rows, total } = found.value;
  return ok({ data: rows, nextCursor: nextCursor(page.value.offset, rows.length, total ?? 0) });
}
