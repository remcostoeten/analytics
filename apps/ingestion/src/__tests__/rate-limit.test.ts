import { describe, it, expect, setSystemTime, afterEach } from "bun:test";
import { createRateLimiter } from "../rate-limit";

describe("rateLimiter", () => {
	afterEach(() => {
		setSystemTime();
	});

	it("allows requests up to maxRequests", () => {
		const limiter = createRateLimiter(60000, 3, false);
		const ipHash = "test-hash";

		expect(limiter.isAllowed(ipHash)).toBe(true);
		expect(limiter.isAllowed(ipHash)).toBe(true);
		expect(limiter.isAllowed(ipHash)).toBe(true);
		expect(limiter.isAllowed(ipHash)).toBe(false);
	});

	it("isolates different IP hashes", () => {
		const limiter = createRateLimiter(60000, 1, false);

		expect(limiter.isAllowed("ip1")).toBe(true);
		expect(limiter.isAllowed("ip2")).toBe(true);

		expect(limiter.isAllowed("ip1")).toBe(false);
		expect(limiter.isAllowed("ip2")).toBe(false);
	});

	it("resets window after windowMs", () => {
		const windowMs = 1000;
		const limiter = createRateLimiter(windowMs, 1, false);
		const ipHash = "test-hash";
		const start = 1000000;

		setSystemTime(new Date(start));
		expect(limiter.isAllowed(ipHash)).toBe(true);
		expect(limiter.isAllowed(ipHash)).toBe(false);

		setSystemTime(new Date(start + windowMs + 1));
		expect(limiter.isAllowed(ipHash)).toBe(true);
	});

	it("calculates remaining requests correctly", () => {
		const limiter = createRateLimiter(60000, 10, false);
		const ipHash = "test-hash";

		expect(limiter.getRemainingRequests(ipHash)).toBe(10);
		limiter.isAllowed(ipHash);
		expect(limiter.getRemainingRequests(ipHash)).toBe(9);
	});

	it("only includes ACTIVE windows in metrics", () => {
		const windowMs = 1000;
		const limiter = createRateLimiter(windowMs, 10, false);
		const start = 1000000;

		setSystemTime(new Date(start));
		limiter.isAllowed("ip1");

		setSystemTime(new Date(start + 500));
		limiter.isAllowed("ip2");

		expect(limiter.getMetrics().activeIPs).toBe(2);
		expect(limiter.getMetrics().totalRequests).toBe(2);

		setSystemTime(new Date(start + windowMs + 1));
		expect(limiter.getMetrics().activeIPs).toBe(1);
		expect(limiter.getMetrics().totalRequests).toBe(1);
	});
});
