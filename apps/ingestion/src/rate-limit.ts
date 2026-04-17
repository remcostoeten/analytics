// Rate limiting by IP hash to prevent abuse
// Uses in-memory storage with sliding window

interface RateLimitEntry {
	count: number;
	windowStart: number;
}

export class RateLimiter {
	private cache = new Map<string, RateLimitEntry>();
	private readonly windowMs: number;
	private readonly maxRequests: number;
	private readonly cleanupIntervalMs: number;

	constructor(windowMs: number = 60000, maxRequests: number = 100, startCleanup: boolean = true) {
		this.windowMs = windowMs;
		this.maxRequests = maxRequests;
		this.cleanupIntervalMs = windowMs * 2; // Clean up every 2 windows

		// Start cleanup interval
		if (startCleanup) {
			setInterval(() => this.cleanup(), this.cleanupIntervalMs);
		}
	}

	isAllowed(ipHash: string): boolean {
		const now = Date.now();
		const existing = this.cache.get(ipHash);

		if (!existing) {
			// First request from this IP
			this.cache.set(ipHash, {
				count: 1,
				windowStart: now,
			});
			return true;
		}

		// Check if window has expired
		if (now - existing.windowStart > this.windowMs) {
			// Reset window
			this.cache.set(ipHash, {
				count: 1,
				windowStart: now,
			});
			return true;
		}

		// Check if over limit
		if (existing.count >= this.maxRequests) {
			return false;
		}

		// Increment count
		existing.count++;
		return true;
	}

	getRemainingRequests(ipHash: string): number {
		const entry = this.cache.get(ipHash);
		if (!entry) return this.maxRequests;

		const now = Date.now();
		if (now - entry.windowStart > this.windowMs) {
			return this.maxRequests;
		}

		return Math.max(0, this.maxRequests - entry.count);
	}

	getResetTime(ipHash: string): number | null {
		const entry = this.cache.get(ipHash);
		if (!entry) return null;

		return entry.windowStart + this.windowMs;
	}

	private cleanup(): void {
		const now = Date.now();
		const expiredKeys: string[] = [];

		for (const [key, entry] of this.cache.entries()) {
			if (now - entry.windowStart > this.cleanupIntervalMs) {
				expiredKeys.push(key);
			}
		}

		for (const key of expiredKeys) {
			this.cache.delete(key);
		}
	}

	// Get current metrics
	getMetrics() {
		const now = Date.now();
		let activeIPs = 0;
		let totalRequests = 0;

		for (const entry of this.cache.values()) {
			if (now - entry.windowStart <= this.windowMs) {
				activeIPs++;
				totalRequests += entry.count;
			}
		}

		return {
			activeIPs,
			totalRequests,
			cacheSize: this.cache.size,
		};
	}
}

// Default rate limiter: 100 requests per minute per IP
export const rateLimiter = new RateLimiter(60000, 100);

// Stricter rate limiter for bots: 10 requests per minute
export const botRateLimiter = new RateLimiter(60000, 10);
