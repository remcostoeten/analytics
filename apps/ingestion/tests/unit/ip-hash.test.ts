import { describe, it, expect, setSystemTime, afterEach } from "bun:test";
import { hashIp, validateIpHashSecret } from "../../src/utilities/ip-hash";

describe("ip-hash", () => {
	afterEach(() => {
		setSystemTime(); // Reset to current time
	});

	it("generates different hashes for different IPs", async () => {
		const ip1 = "192.168.1.1";
		const ip2 = "192.168.1.2";

		const hash1 = await hashIp(ip1);
		const hash2 = await hashIp(ip2);

		expect(hash1).not.toBe(hash2);
		expect(hash1).not.toBeNull();
		expect(hash2).not.toBeNull();
	});

	it("generates same hash for same IP on same day", async () => {
		const ip = "1.2.3.4";

		const hash1 = await hashIp(ip);
		const hash2 = await hashIp(ip);

		expect(hash1).toBe(hash2);
	});

	it("generates DIFFERENT hashes for same IP on DIFFERENT days", async () => {
		const ip = "1.2.3.4";

		// Set date to today
		setSystemTime(new Date("2024-01-01T12:00:00Z"));
		const hash1 = await hashIp(ip);

		// Set date to tomorrow
		setSystemTime(new Date("2024-01-02T12:00:00Z"));
		const hash2 = await hashIp(ip);

		expect(hash1).not.toBe(hash2);
	});

	it("returns null for empty IP", async () => {
		expect(await hashIp(null)).toBeNull();
		expect(await hashIp("")).toBeNull();
	});

	describe("validateIpHashSecret", () => {
		const originalEnv = process.env.IP_HASH_SECRET;

		afterEach(() => {
			process.env.IP_HASH_SECRET = originalEnv;
		});

		it("rejects missing secret", () => {
			delete process.env.IP_HASH_SECRET;
			expect(validateIpHashSecret()).toBe(false);
		});

		it("rejects default secret", () => {
			process.env.IP_HASH_SECRET = "default-secret-change-me";
			expect(validateIpHashSecret()).toBe(false);
		});

		it("rejects short secret", () => {
			process.env.IP_HASH_SECRET = "too-short";
			expect(validateIpHashSecret()).toBe(false);
		});

		it("accepts long custom secret", () => {
			process.env.IP_HASH_SECRET = "a-very-long-secret-that-is-over-32-characters-long";
			expect(validateIpHashSecret()).toBe(true);
		});
	});
});
