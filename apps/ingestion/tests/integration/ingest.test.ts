import { describe, test, expect, mock } from "bun:test";
import { setupTestDb } from "../setup";
import { mockPageView } from "../fixtures/events";
import { Hono } from "hono";

// This test file is self-contained to avoid module caching issues in Bun.
describe("POST /ingest integration", async () => {
	// Each test gets its own DB and App
	async function setup() {
		const { db, pg } = await setupTestDb();
		const { events, visitors } = await import("../../src/db/index.js");

		// Mock the DB module for this specific import chain
		mock.module("../../src/db/index.js", () => ({
			db,
			events,
			visitors,
		}));

		const { handleIngest } = await import("../../src/handlers/ingest");

		// Force reset the internal dbModule cache for tests
		const { __setDbModule } = await import("../../src/handlers/ingest");
		__setDbModule({ db, events, visitors } as any);

		// Reset global singletons for isolation
		const { dedupeCache, metrics } = await import("../../src/utilities/dedupe");
		dedupeCache.clear();
		metrics.reset();

		const app = new Hono();
		app.post("/ingest", handleIngest);

		return { app, db, pg, events };
	}

	test("actually persists event to database", async () => {
		const { app, db, events } = await setup();

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
	});

	test("deduplicates fast repeated events", async () => {
		const { app, db, events } = await setup();

		// First request
		await app.request("/ingest", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(mockPageView),
		});

		// Immediate second request
		const response = await app.request("/ingest", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(mockPageView),
		});

		const data = (await response.json()) as any;
		expect(data.ok).toBe(true);
		expect(data.deduped).toBe(true);

		// Only one record in DB
		const savedEvents = await db.select().from(events);
		expect(savedEvents).toHaveLength(1);
	});

	test("rejects invalid payload", async () => {
		const { app } = await setup();
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
	});
});
