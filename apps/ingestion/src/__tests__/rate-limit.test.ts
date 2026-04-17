import { describe, it, expect, setSystemTime, afterEach } from "bun:test";
import { RateLimiter } from "../rate-limit";

describe("RateLimiter", () => {
	afterEach(() => {
		setSystemTime();
	});

	it("allows requests up to maxRequests", () => {
		const limiter = new RateLimiter(60000, 3, false);
		const ipHash = "test-hash";

		expect(limiter.isAllowed(ipHash)).toBe(true);
		expect(limiter.isAllowed(ipHash)).toBe(true);
		expect(limiter.isAllowed(ipHash)).toBe(true);
		expect(limiter.isAllowed(ipHash)).toBe(false);
	});

	it("isolates different IP hashes", () => {
		const limiter = new RateLimiter(60000, 1, false);

		expect(limiter.isAllowed("ip1")).toBe(true);
		expect(limiter.isAllowed("ip2")).toBe(true);

		expect(limiter.isAllowed("ip1")).toBe(false);
		expect(limiter.isAllowed("ip2")).toBe(false);
	});

	it("resets window after windowMs", () => {
		const windowMs = 1000;
		const limiter = new RateLimiter(windowMs, 1, false);
		const ipHash = "test-hash";
		const start = 1000000;

		setSystemTime(new Date(start));
		expect(limiter.isAllowed(ipHash)).toBe(true);
		expect(limiter.isAllowed(ipHash)).toBe(false);

		// Advance time past the window
		setSystemTime(new Date(start + windowMs + 1));
		expect(limiter.isAllowed(ipHash)).toBe(true);
	});

	it("calculates remaining requests correctly", () => {
		const limiter = new RateLimiter(60000, 10, false);
		const ipHash = "test-hash";

		expect(limiter.getRemainingRequests(ipHash)).toBe(10);
		limiter.isAllowed(ipHash);
		expect(limiter.getRemainingRequests(ipHash)).toBe(9);
	});

	it("only includes ACTIVE windows in metrics", () => {
		const windowMs = 1000;
		const limiter = new RateLimiter(windowMs, 10, false);
		const start = 1000000;

		setSystemTime(new Date(start));
		limiter.isAllowed("ip1"); // count 1

		setSystemTime(new Date(start + 500));
		limiter.isAllowed("ip2"); // count 1

		expect(limiter.getMetrics().activeIPs).toBe(2);
		expect(limiter.getMetrics().totalRequests).toBe(2);

		// Advance time so ip1 expires but ip2 is still active
		setSystemTime(new Date(start + windowMs + 1));
		expect(limiter.getMetrics().activeIPs).toBe(1);
		expect(limiter.getMetrics().totalRequests).toBe(1);
	});
});
