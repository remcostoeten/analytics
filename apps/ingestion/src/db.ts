import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import {
  bigserial,
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

export const events = pgTable(
  'events',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    projectId: text('project_id').notNull(),
    type: text('type').notNull().default('pageview'),
    ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
    path: text('path'),
    referrer: text('referrer'),
    origin: text('origin'),
    host: text('host'),
    isLocalhost: boolean('is_localhost').default(false),
    ua: text('ua'),
    lang: text('lang'),
    deviceType: text('device_type'),
    ipHash: text('ip_hash'),
    visitorId: text('visitor_id'),
    sessionId: text('session_id'),
    country: text('country'),
    region: text('region'),
    city: text('city'),
    meta: jsonb('meta'),
  },
  function (table) {
    return {
      projectTsIdx: index('events_project_ts_idx').on(table.projectId, table.ts),
      projectTypeIdx: index('events_project_type_idx').on(table.projectId, table.type),
      visitorIdx: index('events_visitor_idx').on(table.visitorId),
      sessionIdx: index('events_session_idx').on(table.sessionId),
      pathIdx: index('events_path_idx').on(table.path),
      hostIdx: index('events_host_idx').on(table.host),
      countryIdx: index('events_country_idx').on(table.country),
      projectTsTypeIdx: index('events_project_ts_type_idx').on(
        table.projectId,
        table.ts,
        table.type
      ),
    }
  }
)

function getDbClient() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  const sql = neon(databaseUrl)
  return drizzle(sql, { schema: { events } })
}

export const db = getDbClient()
