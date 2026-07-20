import { describe, test, expect } from "bun:test";
import { validateEventPayload, resolveClientTimestamp } from "../../src/utilities/validation";

describe("validateEventPayload", () => {
	test("accepts valid minimal payload", () => {
		const payload = {
			projectId: "example.com",
			type: "pageview",
		};

		const result = validateEventPayload(payload);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.projectId).toBe("example.com");
			expect(result.data.type).toBe("pageview");
		}
	});

	test("accepts payload with all fields", () => {
		const payload = {
			projectId: "example.com",
			type: "button_click",
			path: "/signup",
			referrer: "https://google.com",
			origin: "https://example.com",
			host: "example.com",
			ua: "Mozilla/5.0",
			lang: "en-US",
			visitorId: "visitor-123",
			sessionId: "session-456",
			meta: { button: "signup" },
		};

		const result = validateEventPayload(payload);

		expect(result.success).toBe(true);
	});

	test("rejects payload without projectId", () => {
		const payload = {
			type: "pageview",
		};

		const result = validateEventPayload(payload);

		expect(result.success).toBe(false);
	});

	test("defaults type to pageview", () => {
		const payload = {
			projectId: "example.com",
		};

		const result = validateEventPayload(payload);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.type).toBe("pageview");
		}
	});

	test("accepts and preserves client ts", () => {
		const payload = {
			projectId: "example.com",
			ts: "2026-07-20T12:00:00.000Z",
		};

		const result = validateEventPayload(payload);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.ts).toBe("2026-07-20T12:00:00.000Z");
		}
	});

	test("defaults ts to null when absent", () => {
		const result = validateEventPayload({ projectId: "example.com" });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.ts).toBe(null);
		}
	});
});

describe("resolveClientTimestamp", () => {
	test("returns null for null or undefined", () => {
		expect(resolveClientTimestamp(null)).toBe(null);
		expect(resolveClientTimestamp(undefined)).toBe(null);
	});

	test("returns null for unparseable strings", () => {
		expect(resolveClientTimestamp("not-a-date")).toBe(null);
	});

	test("parses a recent ISO timestamp", () => {
		const ts = new Date(Date.now() - 5000).toISOString();
		const resolved = resolveClientTimestamp(ts);

		expect(resolved).not.toBe(null);
		expect(resolved?.toISOString()).toBe(ts);
	});

	test("accepts offline-queued timestamps hours old", () => {
		const ts = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

		expect(resolveClientTimestamp(ts)).not.toBe(null);
	});

	test("rejects timestamps beyond future clock skew", () => {
		const ts = new Date(Date.now() + 10 * 60 * 1000).toISOString();

		expect(resolveClientTimestamp(ts)).toBe(null);
	});

	test("rejects timestamps older than seven days", () => {
		const ts = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

		expect(resolveClientTimestamp(ts)).toBe(null);
	});
});
