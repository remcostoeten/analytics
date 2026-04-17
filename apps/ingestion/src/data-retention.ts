import { eq, ne, and, lt, sql } from "drizzle-orm";

type DbModule = typeof import("./db.js");

let cached: DbModule | null = null;

async function getDb(): Promise<DbModule> {
	if (!cached) {
		cached = await import("./db.js");
	}
	return cached;
}

export type RetentionPolicy = {
	readonly pageviewRetentionDays: number;
	readonly eventRetentionDays: number;
	readonly localhostRetentionDays: number;
	readonly botRetentionDays: number;
};

const DEFAULT_POLICY: RetentionPolicy = {
	pageviewRetentionDays: 90,
	eventRetentionDays: 30,
	localhostRetentionDays: 7,
	botRetentionDays: 7,
};

export function createRetainer(overrides?: Partial<RetentionPolicy>) {
	const policy: RetentionPolicy = { ...DEFAULT_POLICY, ...overrides };

	async function cleanupOldData(): Promise<void> {
		const { db, events } = await getDb();
		const now = new Date();

		const pageviewCutoff = new Date(now);
		pageviewCutoff.setDate(pageviewCutoff.getDate() - policy.pageviewRetentionDays);

		const eventCutoff = new Date(now);
		eventCutoff.setDate(eventCutoff.getDate() - policy.eventRetentionDays);

		const localhostCutoff = new Date(now);
		localhostCutoff.setDate(localhostCutoff.getDate() - policy.localhostRetentionDays);

		const botCutoff = new Date(now);
		botCutoff.setDate(botCutoff.getDate() - policy.botRetentionDays);

		try {
			await db
				.delete(events)
				.where(
					and(
						eq(events.type, "pageview"),
						lt(events.ts, pageviewCutoff),
						eq(events.isLocalhost, false),
						sql`NOT (${events.meta}->>'botDetected') = 'true'`,
					),
				);

			await db
				.delete(events)
				.where(
					and(
						ne(events.type, "pageview"),
						lt(events.ts, eventCutoff),
						eq(events.isLocalhost, false),
						sql`NOT (${events.meta}->>'botDetected') = 'true'`,
					),
				);

			await db
				.delete(events)
				.where(and(eq(events.isLocalhost, true), lt(events.ts, localhostCutoff)));

			await db
				.delete(events)
				.where(and(sql`(${events.meta}->>'botDetected') = 'true'`, lt(events.ts, botCutoff)));

			console.log("Data retention cleanup completed", {
				pageviewCutoff,
				eventCutoff,
				localhostCutoff,
				botCutoff,
			});
		} catch (error) {
			console.error("Data retention cleanup failed:", error);
			throw error;
		}
	}

	async function getRetentionStats() {
		const { db, events } = await getDb();

		try {
			const totalResult = await db.select({ count: sql<number>`count(*)` }).from(events);
			const totalEvents = totalResult[0]?.count || 0;

			const typeResults = await db
				.select({ type: events.type, count: sql<number>`count(*)` })
				.from(events)
				.groupBy(events.type);

			const eventsByType = typeResults.reduce(
				function (acc: Record<string, number>, row: { type: string; count: number }) {
					acc[row.type || "unknown"] = row.count;
					return acc;
				},
				{} as Record<string, number>,
			);

			const dateResult = await db
				.select({
					oldest: sql<Date>`min(${events.ts})`,
					newest: sql<Date>`max(${events.ts})`,
				})
				.from(events);

			return {
				totalEvents,
				eventsByType,
				oldestEvent: dateResult[0]?.oldest || null,
				newestEvent: dateResult[0]?.newest || null,
			};
		} catch (error) {
			console.error("Failed to get retention stats:", error);
			throw error;
		}
	}

	function getPolicy(): RetentionPolicy {
		return { ...policy };
	}

	return { cleanupOldData, getRetentionStats, getPolicy };
}

export const dataRetainer = createRetainer();

if (process.env.NODE_ENV === "production") {
	setInterval(async function () {
		try {
			await dataRetainer.cleanupOldData();
		} catch (error) {
			console.error("Scheduled data cleanup failed:", error);
		}
	}, 86400000);
}
