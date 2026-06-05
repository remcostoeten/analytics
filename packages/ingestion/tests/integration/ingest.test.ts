import { describe, test, expect, mock } from "bun:test";
import { setupTestDb } from "../setup";
import { mockPageView } from "../fixtures/events";
import { Hono } from "hono";

describe("POST /ingest integration", async () => {
	async function setup() {
		const { db, cleanup } = await setupTestDb();
		const { events, visitors } = await import("../../src/db/index.js");

		mock.module("../../src/db/index.js", () => ({
			db,
			events,
			visitors,
		}));

		const { handleIngest } = await import("../../src/handlers/ingest");

		const { __setDbModule } = await import("../../src/handlers/ingest");
		__setDbModule({ db, events, visitors } as any);

		const { dedupeCache, metrics } = await import("../../src/utilities/dedupe");
		dedupeCache.clear();
		metrics.reset();

		const app = new Hono();
		app.post("/ingest", handleIngest);

		return { app, db, cleanup, events };
	}

	test("actually persists event to database", async () => {
		const { app, db, cleanup, events } = await setup();

		try {
			const response = await app.request("/ingest", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Vercel-IP-Country": "US",
					"X-Vercel-IP-City": "San Francisco",
				},
				body: JSON.stringify(mockPageView),
			});

			expect(response.status).toBe(200);
			const data = (await response.json()) as any;
			expect(data.ok).toBe(true);

			const savedEvents = await db.select().from(events);

			expect(savedEvents).toHaveLength(1);
			expect(savedEvents[0].projectId).toBe(mockPageView.projectId);
			expect(savedEvents[0].country).toBe("US");
			expect(savedEvents[0].city).toBe("San Francisco");
		} finally {
			await cleanup();
		}
	});

	test("deduplicates fast repeated events", async () => {
		const { app, db, cleanup, events } = await setup();

		try {
			await app.request("/ingest", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(mockPageView),
			});

			const response = await app.request("/ingest", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(mockPageView),
			});

			const data = (await response.json()) as any;
			expect(data.ok).toBe(true);
			expect(data.deduped).toBe(true);

			const savedEvents = await db.select().from(events);
			expect(savedEvents).toHaveLength(1);
		} finally {
			await cleanup();
		}
	});

	test("rejects invalid payload", async () => {
		const { app, cleanup } = await setup();

		try {
			const payload = {
				type: "pageview",
			};

			const response = await app.request("/ingest", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			expect(response.status).toBe(400);

			const data = (await response.json()) as { ok: boolean; error: string };
			expect(data.ok).toBe(false);
			expect(data.error).toBe("Invalid payload");
		} finally {
			await cleanup();
		}
	});
});
