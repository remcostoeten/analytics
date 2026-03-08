// Data retention policies for privacy and compliance
// Implements automatic cleanup of old data

import { eq, ne, and, lt, sql } from 'drizzle-orm'

// Lazy import to avoid requiring DATABASE_URL during tests
let db: any = null
let events: any = null

async function getDb() {
  if (!db) {
    const dbModule = await import('./db.js')
    db = dbModule.db
    events = dbModule.events
  }
  return { db, events }
}

export interface RetentionPolicy {
  // Default retention periods (in days)
  readonly pageviewRetentionDays: number
  readonly eventRetentionDays: number
  readonly localhostRetentionDays: number
  readonly botRetentionDays: number
}

export class DataRetainer {
  private policy: RetentionPolicy

  constructor(policy?: Partial<RetentionPolicy>) {
    this.policy = {
      pageviewRetentionDays: 90, // 3 months for pageviews
      eventRetentionDays: 30, // 1 month for custom events
      localhostRetentionDays: 7, // 1 week for localhost traffic
      botRetentionDays: 7, // 1 week for bot traffic
      ...policy,
    }
  }

  async cleanupOldData(): Promise<void> {
    const { db, events } = await getDb()
    const now = new Date()
    
    // Clean up old pageviews
    const pageviewCutoff = new Date(now)
    pageviewCutoff.setDate(pageviewCutoff.getDate() - this.policy.pageviewRetentionDays)
    
    // Clean up old custom events
    const eventCutoff = new Date(now)
    eventCutoff.setDate(eventCutoff.getDate() - this.policy.eventRetentionDays)
    
    // Clean up localhost traffic
    const localhostCutoff = new Date(now)
    localhostCutoff.setDate(localhostCutoff.getDate() - this.policy.localhostRetentionDays)
    
    // Clean up bot traffic
    const botCutoff = new Date(now)
    botCutoff.setDate(botCutoff.getDate() - this.policy.botRetentionDays)

    try {
      // Delete old pageviews
      await db
        .delete(events)
        .where(
          and(
            eq(events.type, 'pageview'),
            lt(events.ts, pageviewCutoff),
            eq(events.isLocalhost, false),
            sql`NOT (${events.meta}->>'botDetected') = 'true'`
          )
        )

      // Delete old custom events
      await db
        .delete(events)
        .where(
          and(
            ne(events.type, 'pageview'),
            lt(events.ts, eventCutoff),
            eq(events.isLocalhost, false),
            sql`NOT (${events.meta}->>'botDetected') = 'true'`
          )
        )

      // Delete old localhost traffic
      await db
        .delete(events)
        .where(
          and(
            eq(events.isLocalhost, true),
            lt(events.ts, localhostCutoff)
          )
        )

      // Delete old bot traffic
      await db
        .delete(events)
        .where(
          and(
            sql`(${events.meta}->>'botDetected') = 'true'`,
            lt(events.ts, botCutoff)
          )
        )

      console.log('Data retention cleanup completed', {
        pageviewCutoff,
        eventCutoff,
        localhostCutoff,
        botCutoff,
      })
    } catch (error) {
      console.error('Data retention cleanup failed:', error)
      throw error
    }
  }

  async getRetentionStats(): Promise<{
    totalEvents: number
    eventsByType: Record<string, number>
    oldestEvent: Date | null
    newestEvent: Date | null
  }> {
    const { db, events } = await getDb()
    
    try {
      // Get total count
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(events)
      
      const totalEvents = totalResult[0]?.count || 0

      // Get counts by type
      const typeResults = await db
        .select({ type: events.type, count: sql<number>`count(*)` })
        .from(events)
        .groupBy(events.type)
      
      const eventsByType = typeResults.reduce((acc: Record<string, number>, row: any) => {
        acc[row.type || 'unknown'] = row.count
        return acc
      }, {} as Record<string, number>)

      // Get date range
      const dateResult = await db
        .select({
          oldest: sql<Date>`min(${events.ts})`,
          newest: sql<Date>`max(${events.ts})`,
        })
        .from(events)

      return {
        totalEvents,
        eventsByType,
        oldestEvent: dateResult[0]?.oldest || null,
        newestEvent: dateResult[0]?.newest || null,
      }
    } catch (error) {
      console.error('Failed to get retention stats:', error)
      throw error
    }
  }

  getPolicy(): RetentionPolicy {
    return { ...this.policy }
  }
}

// Default retainer with standard policies
export const dataRetainer = new DataRetainer()

// Run cleanup daily (86400000 ms)
if (process.env.NODE_ENV === 'production') {
  setInterval(async () => {
    try {
      await dataRetainer.cleanupOldData()
    } catch (error) {
      console.error('Scheduled data cleanup failed:', error)
    }
  }, 86400000) // 24 hours
}
