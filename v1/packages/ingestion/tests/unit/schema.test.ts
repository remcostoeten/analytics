import { describe, test, expect } from "bun:test";
import { events, visitors } from "../../src/db/schema";

describe("events schema", () => {
	test("has all required columns", () => {
		const columns = Object.keys(events);

		expect(columns).toContain("id");
		expect(columns).toContain("projectId");
		expect(columns).toContain("type");
		expect(columns).toContain("ts");
		expect(columns).toContain("path");
		expect(columns).toContain("visitorId");
		expect(columns).toContain("sessionId");
		expect(columns).toContain("country");
		expect(columns).toContain("meta");
	});

	test("exports Event type", () => {
		const event: typeof events.$inferSelect = {
			id: BigInt(1),
			projectId: "test",
			type: "pageview",
			ts: new Date(),
			path: "/",
			referrer: null,
			origin: null,
			host: null,
			isLocalhost: false,
			ua: null,
			lang: null,
			deviceType: null,
			ipHash: null,
			visitorId: null,
			sessionId: null,
			country: null,
			region: null,
			city: null,
			meta: null,
		};

		expect(event.projectId).toBe("test");
	});
});

describe("visitors schema", () => {
	test("exports visitors table columns", () => {
		const columns = Object.keys(visitors);

		expect(columns).toContain("id");
		expect(columns).toContain("fingerprint");
		expect(columns).toContain("firstSeen");
		expect(columns).toContain("lastSeen");
	});
});
