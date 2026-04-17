import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { generateFingerprint, getDedupeWindow, metrics } from "../dedupe";
import { createDedupeCache } from "../dedupe";

describe("generateFingerprint", () => {
	test("generates consistent fingerprint for same event", async () => {
		const event = {
			projectId: "example.com",
			visitorId: "visitor-123",
			sessionId: "session-456",
			type: "pageview",
			path: "/home",
			timestamp: 1000000000000,
		};

		const fp1 = await generateFingerprint(event);
		const fp2 = await generateFingerprint(event);

		expect(fp1).toBe(fp2);
		expect(fp1).toMatch(/^[a-f0-9]{64}$/);
	});

	test("generates different fingerprints for different paths", async () => {
		const event1 = {
			projectId: "example.com",
			visitorId: "visitor-123",
			sessionId: "session-456",
			type: "pageview",
			path: "/home",
			timestamp: 1000000000000,
		};

		const event2 = { ...event1, path: "/about" };

		const fp1 = await generateFingerprint(event1);
		const fp2 = await generateFingerprint(event2);

		expect(fp1).not.toBe(fp2);
	});

	test("generates different fingerprints for different projects", async () => {
		const event1 = {
			projectId: "example.com",
			visitorId: "visitor-123",
			sessionId: "session-456",
			type: "pageview",
			path: "/home",
			timestamp: 1000000000000,
		};

		const event2 = { ...event1, projectId: "other.com" };

		const fp1 = await generateFingerprint(event1);
		const fp2 = await generateFingerprint(event2);

		expect(fp1).not.toBe(fp2);
	});

	test("generates different fingerprints for different visitors", async () => {
		const event1 = {
			projectId: "example.com",
			visitorId: "visitor-123",
			sessionId: "session-456",
			type: "pageview",
			path: "/home",
			timestamp: 1000000000000,
		};

		const event2 = { ...event1, visitorId: "visitor-789" };

		const fp1 = await generateFingerprint(event1);
		const fp2 = await generateFingerprint(event2);

		expect(fp1).not.toBe(fp2);
	});

	test("rounds timestamps to prevent minor variations", async () => {
		const event1 = {
			projectId: "example.com",
			visitorId: "visitor-123",
			sessionId: "session-456",
			type: "pageview",
			path: "/home",
			timestamp: 1000000000000,
		};

		const event2 = { ...event1, timestamp: 1000000005000 };

		const fp1 = await generateFingerprint(event1);
		const fp2 = await generateFingerprint(event2);

		expect(fp1).toBe(fp2);
	});

	test("generates different fingerprints outside 10-second window", async () => {
		const event1 = {
			projectId: "example.com",
			visitorId: "visitor-123",
			sessionId: "session-456",
			type: "pageview",
			path: "/home",
			timestamp: 1000000000000,
		};

		const event2 = { ...event1, timestamp: 1000000011000 };

		const fp1 = await generateFingerprint(event1);
		const fp2 = await generateFingerprint(event2);

		expect(fp1).not.toBe(fp2);
	});

	test("handles null visitorId", async () => {
		const event = {
			projectId: "example.com",
			visitorId: null,
			sessionId: "session-456",
			type: "pageview",
			path: "/home",
			timestamp: 1000000000000,
		};

		const fingerprint = await generateFingerprint(event);

		expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
	});

	test("handles null sessionId", async () => {
		const event = {
			projectId: "example.com",
			visitorId: "visitor-123",
			sessionId: null,
			type: "pageview",
			path: "/home",
			timestamp: 1000000000000,
		};

		const fingerprint = await generateFingerprint(event);

		expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
	});

	test("handles null path", async () => {
		const event = {
			projectId: "example.com",
			visitorId: "visitor-123",
			sessionId: "session-456",
			type: "custom_event",
			path: null,
			timestamp: 1000000000000,
		};

		const fingerprint = await generateFingerprint(event);

		expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
	});

	test("generates same fingerprint for events with all nulls", async () => {
		const event1 = {
			projectId: "example.com",
			visitorId: null,
			sessionId: null,
			type: "pageview",
			path: null,
			timestamp: 1000000000000,
		};

		const event2 = { ...event1 };

		const fp1 = await generateFingerprint(event1);
		const fp2 = await generateFingerprint(event2);

		expect(fp1).toBe(fp2);
	});
});

describe("dedupeCache", () => {
	let cache: ReturnType<typeof createDedupeCache>;

	beforeEach(() => {
		cache = createDedupeCache(1000, 100);
	});

	afterEach(() => {
		cache.stopCleanup();
		cache.clear();
	});

	test("detects duplicates within TTL", () => {
		const fingerprint = "test-fingerprint-123";

		expect(cache.isDuplicate(fingerprint)).toBe(false);

		cache.add(fingerprint);

		expect(cache.isDuplicate(fingerprint)).toBe(true);
	});

	test("returns false for non-existent fingerprint", () => {
		const fingerprint = "non-existent-fingerprint";

		expect(cache.isDuplicate(fingerprint)).toBe(false);
	});

	test("expires entries after TTL", async () => {
		const fingerprint = "test-fingerprint-expire";

		cache.add(fingerprint);
		expect(cache.isDuplicate(fingerprint)).toBe(true);

		await Bun.sleep(1100);

		expect(cache.isDuplicate(fingerprint)).toBe(false);
	});

	test("tracks cache size correctly", () => {
		expect(cache.size()).toBe(0);

		cache.add("fp1");
		expect(cache.size()).toBe(1);

		cache.add("fp2");
		expect(cache.size()).toBe(2);

		cache.add("fp3");
		expect(cache.size()).toBe(3);
	});

	test("does not increase size for duplicate adds", () => {
		cache.add("fp1");
		expect(cache.size()).toBe(1);

		cache.add("fp1");
		expect(cache.size()).toBe(1);
	});

	test("enforces max size limit", () => {
		const smallCache = createDedupeCache(60000, 10);

		for (let i = 0; i < 20; i++) {
			smallCache.add(`fp-${i}`);
		}

		expect(smallCache.size()).toBeLessThan(20);
		expect(smallCache.size()).toBeGreaterThan(0);

		smallCache.stopCleanup();
	});

	test("evicts oldest entries when max size reached", () => {
		const smallCache = createDedupeCache(60000, 10);

		for (let i = 0; i < 10; i++) {
			smallCache.add(`fp-${i}`);
		}

		expect(smallCache.size()).toBe(10);

		smallCache.add("fp-new");

		expect(smallCache.size()).toBeLessThanOrEqual(10);

		smallCache.stopCleanup();
	});

	test("clear removes all entries", () => {
		cache.add("fp1");
		cache.add("fp2");
		cache.add("fp3");

		expect(cache.size()).toBe(3);

		cache.clear();

		expect(cache.size()).toBe(0);
		expect(cache.isDuplicate("fp1")).toBe(false);
	});

	test("handles many concurrent operations", () => {
		const fingerprints = Array.from({ length: 50 }, (_, i) => `fp-${i}`);

		fingerprints.forEach((fp) => cache.add(fp));

		fingerprints.forEach((fp) => {
			expect(cache.isDuplicate(fp)).toBe(true);
		});

		expect(cache.size()).toBe(50);
	});

	test("different fingerprints are not considered duplicates", () => {
		cache.add("fp1");

		expect(cache.isDuplicate("fp1")).toBe(true);
		expect(cache.isDuplicate("fp2")).toBe(false);
		expect(cache.isDuplicate("fp3")).toBe(false);
	});
});

describe("getDedupeWindow", () => {
	test("returns 10 seconds for pageview events", () => {
		expect(getDedupeWindow("pageview")).toBe(10000);
	});

	test("returns 5 seconds for click events", () => {
		expect(getDedupeWindow("click")).toBe(5000);
	});

	test("returns 30 seconds for submit events", () => {
		expect(getDedupeWindow("submit")).toBe(30000);
	});

	test("returns 60 seconds for error events", () => {
		expect(getDedupeWindow("error")).toBe(60000);
	});

	test("returns 60 seconds for custom events", () => {
		expect(getDedupeWindow("custom")).toBe(60000);
	});

	test("returns 60 seconds for unknown event types", () => {
		expect(getDedupeWindow("unknown_event")).toBe(60000);
		expect(getDedupeWindow("random")).toBe(60000);
	});
});

describe("metrics", () => {
	beforeEach(() => {
		metrics.reset();
	});

	test("tracks total requests", () => {
		metrics.recordRequest();
		metrics.recordRequest();
		metrics.recordRequest();

		const data = metrics.getMetrics();

		expect(data.totalRequests).toBe(3);
	});

	test("tracks duplicates blocked", () => {
		metrics.recordRequest();
		metrics.recordDuplicate();
		metrics.recordRequest();
		metrics.recordDuplicate();

		const data = metrics.getMetrics();

		expect(data.totalRequests).toBe(2);
		expect(data.duplicatesBlocked).toBe(2);
	});

	test("calculates hit rate correctly", () => {
		metrics.recordRequest();
		metrics.recordRequest();
		metrics.recordRequest();
		metrics.recordRequest();
		metrics.recordDuplicate();

		const data = metrics.getMetrics();

		expect(data.hitRate).toBe(25);
	});

	test("returns 0 hit rate when no requests", () => {
		const data = metrics.getMetrics();

		expect(data.hitRate).toBe(0);
		expect(data.totalRequests).toBe(0);
		expect(data.duplicatesBlocked).toBe(0);
	});

	test("resets metrics correctly", () => {
		metrics.recordRequest();
		metrics.recordRequest();
		metrics.recordDuplicate();

		let data = metrics.getMetrics();
		expect(data.totalRequests).toBe(2);
		expect(data.duplicatesBlocked).toBe(1);

		metrics.reset();

		data = metrics.getMetrics();
		expect(data.totalRequests).toBe(0);
		expect(data.duplicatesBlocked).toBe(0);
	});

	test("includes cache size in metrics", () => {
		const data = metrics.getMetrics();

		expect(data.cacheSize).toBeGreaterThanOrEqual(0);
		expect(typeof data.cacheSize).toBe("number");
	});

	test("includes uptime in metrics", () => {
		const data = metrics.getMetrics();

		expect(data.uptime).toBeGreaterThanOrEqual(0);
		expect(typeof data.uptime).toBe("number");
	});

	test("hit rate has 2 decimal precision", () => {
		metrics.recordRequest();
		metrics.recordRequest();
		metrics.recordRequest();
		metrics.recordDuplicate();

		const data = metrics.getMetrics();

		expect(data.hitRate).toBe(33.33);
	});
});
