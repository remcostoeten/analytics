import { describe, test, expect } from "bun:test";
import { Hono } from "hono";

const insertedEvents: Record<string, unknown>[] = [];

const dbModule = {
	db: {
		insert: () => ({
			values: (value: Record<string, unknown>) => {
				if ("projectId" in value) insertedEvents.push(value);
				return {
					onConflictDoUpdate: () => Promise.resolve(),
					returning: () => Promise.resolve(),
				};
			},
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

	test("rejects origins outside configured allowlist", async () => {
		const previous = process.env.ORIGIN_ALLOWLIST;
		process.env.ORIGIN_ALLOWLIST = "https://allowed.example";

		try {
			const response = await app.request("/ingest", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Origin: "https://blocked.example",
				},
				body: JSON.stringify({
					projectId: "example.com",
					type: "pageview",
					path: "/home",
				}),
			});

			expect(response.status).toBe(403);

			const data = (await response.json()) as { ok: boolean; error: string };
			expect(data.ok).toBe(false);
			expect(data.error).toBe("Origin not allowed");
		} finally {
			if (previous) {
				process.env.ORIGIN_ALLOWLIST = previous;
			} else {
				delete process.env.ORIGIN_ALLOWLIST;
			}
		}
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

	test("marks feature branch vercel deployments as preview", async () => {
		insertedEvents.length = 0;

		const response = await app.request("/ingest", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				projectId: "example.com",
				type: "pageview",
				path: "/preview-vercel",
				host: "analytics-git-feature-remco.vercel.app",
			}),
		});

		expect(response.status).toBe(200);
		const event = insertedEvents.at(-1);
		expect(event).toBeDefined();
		if (!event) throw new Error("event missing");
		expect((event.meta as Record<string, unknown>).isPreview).toBe(true);
	});

	test("keeps production vercel deployments as public traffic", async () => {
		insertedEvents.length = 0;

		const response = await app.request("/ingest", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				projectId: "example.com",
				type: "pageview",
				path: "/production-vercel",
				host: "analytics.vercel.app",
			}),
		});

		expect(response.status).toBe(200);
		const event = insertedEvents.at(-1);
		expect(event).toBeDefined();
		if (!event) throw new Error("event missing");
		expect((event.meta as Record<string, unknown>).isPreview).toBe(false);
	});
});
