import { sql } from "drizzle-orm";

/**
 * @name serverVisitor
 * @description The visitor and session id the server SDK sends when an event has no visitor or
 * session of its own. Every such event shares it, so reads keep these events in event counts and
 * breakdowns but never count it as a visitor or a session.
 *
 * @example
 * sql`SELECT count(*) FROM events WHERE visitor_id <> ${serverVisitor}`;
 */
export const serverVisitor = "server";

/**
 * @name countedVisitor
 * @description An event's `visitor_id` for counting visitors: null for the shared server visitor,
 * so `count(DISTINCT ...)` and per-visitor grouping skip it. Reads events aliased `e`.
 *
 * @example
 * sql`SELECT count(DISTINCT ${countedVisitor}) FROM events e`;
 */
export const countedVisitor = sql`CASE WHEN e.visitor_id = ${serverVisitor} THEN NULL ELSE e.visitor_id END`;

/**
 * @name countedSession
 * @description An event's `session_id` for counting sessions: null when the visitor or the session
 * is the shared server id, so session counts, bounce rate, duration and paths skip it. Reads
 * events aliased `e`.
 *
 * @example
 * sql`SELECT count(DISTINCT ${countedSession}) FROM events e`;
 */
export const countedSession = sql`CASE WHEN e.visitor_id = ${serverVisitor} OR e.session_id = ${serverVisitor} THEN NULL ELSE e.session_id END`;

/**
 * @name notServer
 * @description A condition that leaves out events of the shared server visitor or session, for
 * reads that list visitors or sessions. Reads events aliased `e`.
 *
 * @example
 * sql`SELECT DISTINCT e.session_id FROM events e WHERE ${notServer}`;
 */
export const notServer = sql`e.visitor_id IS DISTINCT FROM ${serverVisitor} AND e.session_id IS DISTINCT FROM ${serverVisitor}`;
