import { describe, test, expect } from "bun:test";
import { setupTestDb } from "../setup";
import { sql } from "drizzle-orm";

describe("rollupDays integration", async () => {
	async function setup() {
		const { db, cleanup } = await setupTestDb();
		const { events, visitors, sessions, rollupDaily } = await import("../../src/db/index.js");

		const { rollupDays, __setDbModule } = await import("../../src/utilities/rollup");
		__setDbModule({ db, events, visitors, sessions, rollupDaily } as any);

		return { db, cleanup, events, rollupDays };
	}

	async function seedEvents(db: any, events: any) {
		await db.insert(events).values([
			{
				projectId: "example.com",
				type: "pageview",
				path: "/home",
				visitorId: "v1",
				sessionId: "s1",
				country: "Netherlands",
			},
			{
				projectId: "example.com",
				type: "pageview",
				path: "/pricing",
				visitorId: "v1",
				sessionId: "s1",
				country: "Netherlands",
			},
			{
				projectId: "example.com",
				type: "event",
				path: "/home",
				visitorId: "v2",
				sessionId: "s2",
				country: "Germany",
			},
			{
				projectId: "example.com",
				type: "pageview",
				path: "/bot-hit",
				visitorId: "bot",
				sessionId: "bot",
				botDetected: true,
			},
			{
				projectId: "example.com",
				type: "pageview",
				path: "/internal",
				visitorId: "me",
				sessionId: "me",
				isInternal: true,
			},
		]);
	}

	test("aggregates totals, paths, and countries excluding dirty traffic", async () => {
		const { db, cleanup, events, rollupDays } = await setup();

		try {
			await seedEvents(db, events);

			const result = await rollupDays(2);
			expect(result.rowsWritten).toBeGreaterThan(0);

			const rows = (await db.execute(
				sql`SELECT dimension, dim_value, pageviews, events, visitors, sessions FROM rollup_daily ORDER BY dimension, dim_value`,
			)) as { rows: any[] };

			const total = rows.rows.find((r) => r.dimension === "total");
			expect(total.pageviews).toBe(2);
			expect(total.events).toBe(3);
			expect(total.visitors).toBe(2);
			expect(total.sessions).toBe(2);

			const home = rows.rows.find((r) => r.dimension === "path" && r.dim_value === "/home");
			expect(home.pageviews).toBe(1);
			expect(home.events).toBe(2);

			const nl = rows.rows.find((r) => r.dimension === "country" && r.dim_value === "Netherlands");
			expect(nl.pageviews).toBe(2);

			expect(rows.rows.find((r) => r.dim_value === "/bot-hit")).toBeUndefined();
			expect(rows.rows.find((r) => r.dim_value === "/internal")).toBeUndefined();
		} finally {
			await cleanup();
		}
	});

	test("is idempotent across repeated runs", async () => {
		const { db, cleanup, events, rollupDays } = await setup();

		try {
			await seedEvents(db, events);

			await rollupDays(2);
			await rollupDays(2);

			const rows = (await db.execute(
				sql`SELECT COUNT(*)::int AS count FROM rollup_daily WHERE dimension = 'total'`,
			)) as { rows: { count: number }[] };

			expect(rows.rows[0].count).toBe(1);
		} finally {
			await cleanup();
		}
	});
});
