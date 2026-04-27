import { sql } from "../db";
import { publicTraffic, getRange } from "./filters";

export type EventCount = {
  eventName: string;
  count: number;
};

export type EventTrend = {
  date: string;
  eventName: string;
  count: number;
};

export type AuthMetric = {
  method: string;
  count: number;
};

export async function getSkriuwEventCounts(projectId: string, from?: Date, to?: Date): Promise<EventCount[]> {
  const range = getRange(from, to);
  const results =
    await sql`SELECT meta->>'eventName' as event_name, COUNT(*) as count 
     FROM events 
     WHERE ${publicTraffic()} 
       AND type = 'event' 
       AND ts >= ${range.from} 
       AND ts <= ${range.to}
       AND project_id = ${projectId}
       AND meta->>'eventName' IS NOT NULL
     GROUP BY event_name 
     ORDER BY count DESC`;
  return results.map((r) => ({
    eventName: r.event_name as string,
    count: Number(r.count),
  }));
}

export async function getSkriuwEventTrend(projectId: string, from?: Date, to?: Date): Promise<EventTrend[]> {
  const range = getRange(from, to);
  const results =
    await sql`SELECT date_trunc('day', ts)::date as day, meta->>'eventName' as event_name, COUNT(*) as count 
     FROM events 
     WHERE ${publicTraffic()} 
       AND type = 'event' 
       AND ts >= ${range.from} 
       AND ts <= ${range.to}
       AND project_id = ${projectId}
       AND meta->>'eventName' IS NOT NULL
     GROUP BY day, event_name 
     ORDER BY day DESC, count DESC`;
  return results.map((r) => ({
    date: r.day instanceof Date ? r.day.toISOString().split("T")[0] : String(r.day),
    eventName: r.event_name as string,
    count: Number(r.count),
  }));
}

export async function getSkriuwNotesActivity(projectId: string, from?: Date, to?: Date): Promise<EventCount[]> {
  const range = getRange(from, to);
  const results =
    await sql`SELECT meta->>'eventName' as event_name, COUNT(*) as count 
     FROM events 
     WHERE ${publicTraffic()} 
       AND type = 'event' 
       AND ts >= ${range.from} 
       AND ts <= ${range.to}
       AND project_id = ${projectId}
       AND meta->>'eventName' IN ('note_created', 'note_deleted', 'note_updated')
     GROUP BY event_name 
     ORDER BY count DESC`;
  return results.map((r) => ({
    eventName: r.event_name as string,
    count: Number(r.count),
  }));
}

export async function getSkriuwJournalActivity(projectId: string, from?: Date, to?: Date): Promise<EventCount[]> {
  const range = getRange(from, to);
  const results =
    await sql`SELECT meta->>'eventName' as event_name, COUNT(*) as count 
     FROM events 
     WHERE ${publicTraffic()} 
       AND type = 'event' 
       AND ts >= ${range.from} 
       AND ts <= ${range.to}
       AND project_id = ${projectId}
       AND meta->>'eventName' IN ('journal_entry_created', 'journal_entry_deleted', 'journal_entry_updated', 'mood_logged', 'tag_created', 'tag_deleted')
     GROUP BY event_name 
     ORDER BY count DESC`;
  return results.map((r) => ({
    eventName: r.event_name as string,
    count: Number(r.count),
  }));
}

export async function getSkriuwAuthMetrics(projectId: string, from?: Date, to?: Date): Promise<AuthMetric[]> {
  const range = getRange(from, to);
  const results =
    await sql`SELECT meta->>'method' as method, COUNT(*) as count 
     FROM events 
     WHERE ${publicTraffic()} 
       AND type = 'event' 
       AND ts >= ${range.from} 
       AND ts <= ${range.to}
       AND project_id = ${projectId}
       AND meta->>'eventName' IN ('user_signed_in', 'user_signed_up')
     GROUP BY method 
     ORDER BY count DESC`;
  return results.map((r) => ({
    method: (r.method as string) || "unknown",
    count: Number(r.count),
  }));
}

export async function getSkriuwRecentEvents(projectId: string, limit: number = 50, from?: Date, to?: Date): Promise<Record<string, unknown>[]> {
  const range = getRange(from, to);
  const results =
    await sql`SELECT ts, path, meta->>'eventName' as event_name, meta, visitor_id, session_id 
     FROM events 
     WHERE ${publicTraffic()} 
       AND type = 'event' 
       AND ts >= ${range.from} 
       AND ts <= ${range.to}
       AND project_id = ${projectId}
       AND meta->>'eventName' IS NOT NULL
     ORDER BY ts DESC 
     LIMIT ${limit}`;
  return results.map((r) => ({
    ts: r.ts,
    path: r.path,
    eventName: r.event_name,
    meta: r.meta,
    visitorId: r.visitor_id,
    sessionId: r.session_id,
  }));
}

export async function getSkriuwTopSearches(projectId: string, limit: number = 20, from?: Date, to?: Date): Promise<{ query: string; count: number }[]> {
  const range = getRange(from, to);
  const results =
    await sql`SELECT meta->>'query' as query, COUNT(*) as count 
     FROM events 
     WHERE ${publicTraffic()} 
       AND type = 'event' 
       AND ts >= ${range.from} 
       AND ts <= ${range.to}
       AND project_id = ${projectId}
       AND meta->>'eventName' = 'site_search'
       AND meta->>'query' IS NOT NULL
     GROUP BY query 
     ORDER BY count DESC 
     LIMIT ${limit}`;
  return results.map((r) => ({
    query: r.query as string,
    count: Number(r.count),
  }));
}