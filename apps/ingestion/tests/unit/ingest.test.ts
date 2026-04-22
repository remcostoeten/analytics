import { describe, test, expect } from "bun:test";
import { Hono } from "hono";

const dbModule = {
	db: {
		insert: () => ({
			values: () => ({
				onConflictDoUpdate: () => Promise.resolve(),
				returning: () => Promise.resolve(),
			}),
		}),
	},
	events: {},
	visitors: {
		fingerprint: "fingerprint",
		visitCount: "visit_count",
	},
};

const { handleIngest, __setDbModule } = await import("../../src/handlers/ingest");
__setDbModule(dbModule);

const app = new Hono();
app.post("/ingest", handleIngest);

describe("POST /ingest", () => {
	test("accepts valid pageview event", async () => {
		const payload = {
			projectId: "example.com",
			type: "pageview",
			path: "/home",
			visitorId: "visitor-123",
			sessionId: "session-456",
		};

		const response = await app.request("/ingest", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		expect(response.status).toBe(200);

		const data = (await response.json()) as { ok: boolean; deduped?: boolean };
		expect(data.ok).toBe(true);
	});

	test("rejects invalid payload", async () => {
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
