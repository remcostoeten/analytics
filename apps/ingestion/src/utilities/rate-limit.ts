type RateLimitEntry = {
	count: number;
	windowStart: number;
};

export function createRateLimiter(windowMs: number = 60000, maxRequests: number = 100, startCleanup: boolean = true) {
	const cache = new Map<string, RateLimitEntry>();
	const cleanupIntervalMs = windowMs * 2;

	function cleanup() {
		const now = Date.now();
		const expiredKeys: string[] = [];

		for (const [key, entry] of cache.entries()) {
			if (now - entry.windowStart > cleanupIntervalMs) {
				expiredKeys.push(key);
			}
		}

		for (const key of expiredKeys) {
			cache.delete(key);
		}
	}

	if (startCleanup) {
		setInterval(cleanup, cleanupIntervalMs);
	}

	return {
		isAllowed(ipHash: string): boolean {
			const now = Date.now();
			const existing = cache.get(ipHash);

			if (!existing) {
				cache.set(ipHash, { count: 1, windowStart: now });
				return true;
			}

			if (now - existing.windowStart > windowMs) {
				cache.set(ipHash, { count: 1, windowStart: now });
				return true;
			}

			if (existing.count >= maxRequests) {
				return false;
			}

			existing.count++;
			return true;
		},

		getRemainingRequests(ipHash: string): number {
			const entry = cache.get(ipHash);
			if (!entry) return maxRequests;

			const now = Date.now();
			if (now - entry.windowStart > windowMs) return maxRequests;

			return Math.max(0, maxRequests - entry.count);
		},

		getResetTime(ipHash: string): number | null {
			const entry = cache.get(ipHash);
			if (!entry) return null;
			return entry.windowStart + windowMs;
		},

		getMetrics() {
			const now = Date.now();
			let activeIPs = 0;
			let totalRequests = 0;

			for (const entry of cache.values()) {
				if (now - entry.windowStart <= windowMs) {
					activeIPs++;
					totalRequests += entry.count;
				}
			}

			return { activeIPs, totalRequests, cacheSize: cache.size };
		},
	};
}

export const rateLimiter = createRateLimiter(60000, 100);

export const botRateLimiter = createRateLimiter(60000, 10);
