import { describe, test, expect, afterEach } from "bun:test";
import { isInternalTraffic } from "../../src/handlers/ingest";

const ENV_KEYS = ["INTERNAL_IPS", "INTERNAL_IP_HASHES", "INTERNAL_VISITOR_IDS"] as const;

afterEach(() => {
	for (const key of ENV_KEYS) {
		delete process.env[key];
	}
});

describe("isInternalTraffic", () => {
	test("treats localhost as internal", () => {
		expect(isInternalTraffic({ localhost: true })).toBe(true);
	});

	test("treats unconfigured public traffic as external", () => {
		expect(isInternalTraffic({ localhost: false, ip: "203.0.113.5", visitorId: "visitor-1" })).toBe(
			false,
		);
	});

	test("matches a raw IP from INTERNAL_IPS", () => {
		process.env.INTERNAL_IPS = "203.0.113.5, 198.51.100.7";
		expect(isInternalTraffic({ localhost: false, ip: "203.0.113.5" })).toBe(true);
		expect(isInternalTraffic({ localhost: false, ip: "198.51.100.7" })).toBe(true);
		expect(isInternalTraffic({ localhost: false, ip: "203.0.113.6" })).toBe(false);
	});

	test("matches a stable visitor id from INTERNAL_VISITOR_IDS", () => {
		process.env.INTERNAL_VISITOR_IDS = "visitor-1,visitor-2";
		expect(isInternalTraffic({ localhost: false, visitorId: "visitor-1" })).toBe(true);
		expect(isInternalTraffic({ localhost: false, visitorId: "visitor-3" })).toBe(false);
	});

	test("still honours legacy INTERNAL_IP_HASHES", () => {
		process.env.INTERNAL_IP_HASHES = "abc123";
		expect(isInternalTraffic({ localhost: false, ipHash: "abc123" })).toBe(true);
		expect(isInternalTraffic({ localhost: false, ipHash: "def456" })).toBe(false);
	});

	test("ignores null identifiers", () => {
		process.env.INTERNAL_IPS = "203.0.113.5";
		process.env.INTERNAL_VISITOR_IDS = "visitor-1";
		expect(isInternalTraffic({ localhost: false, ip: null, visitorId: null })).toBe(false);
	});
});
