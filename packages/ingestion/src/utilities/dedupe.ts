export type EventFingerprint = {
	projectId: string;
	visitorId: string | null;
	sessionId: string | null;
	type: string;
	path: string | null;
	timestamp: number;
};

export async function generateFingerprint(event: EventFingerprint): Promise<string> {
	const roundedTimestamp = Math.floor(event.timestamp / 10000) * 10000;

	const parts = [
		event.projectId,
		event.visitorId || "no-visitor",
		event.sessionId || "no-session",
		event.type,
		event.path || "no-path",
		roundedTimestamp.toString(),
	];

	const key = parts.join("::");
	const msgUint8 = new TextEncoder().encode(key);
	const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray
		.map(function (b) {
			return b.toString(16).padStart(2, "0");
		})
		.join("");
}

type DedupeEntry = {
	expiresAt: number;
};

export function createDedupeCache(ttlMs: number = 60000, maxSize: number = 100000) {
	const cache = new Map<string, DedupeEntry>();
	let cleanupInterval: ReturnType<typeof setInterval> | null = null;

	function cleanup() {
		const now = Date.now();
		let removedCount = 0;

		for (const [fingerprint, entry] of cache.entries()) {
			if (now >= entry.expiresAt) {
				cache.delete(fingerprint);
				removedCount++;
			}
		}

		if (removedCount > 0) {
			console.log(`[Dedupe] Cleaned ${removedCount} entries. Size: ${cache.size}`);
		}
	}

	function evictOldest() {
		const toDelete = Math.floor(maxSize * 0.1);
		let deleted = 0;

		for (const [fingerprint] of cache.entries()) {
			if (deleted >= toDelete) break;
			cache.delete(fingerprint);
			deleted++;
		}

		console.log(`[Dedupe] Evicted ${deleted} entries. Size: ${cache.size}`);
	}

	cleanupInterval = setInterval(cleanup, 60000);

	return {
		isDuplicate(fingerprint: string): boolean {
			const now = Date.now();
			const entry = cache.get(fingerprint);

			if (!entry) return false;

			if (now >= entry.expiresAt) {
				cache.delete(fingerprint);
				return false;
			}

			return true;
		},

		add(fingerprint: string, ttl?: number): void {
			cache.set(fingerprint, { expiresAt: Date.now() + (ttl ?? ttlMs) });

			if (cache.size > maxSize) {
				evictOldest();
			}
		},

		size(): number {
			return cache.size;
		},

		clear(): void {
			cache.clear();
		},

		stopCleanup(): void {
			if (cleanupInterval) {
				clearInterval(cleanupInterval);
				cleanupInterval = null;
			}
		},
	};
}

const DEDUPE_WINDOWS: Record<string, number> = {
	pageview: 10000,
	click: 5000,
	submit: 30000,
	error: 60000,
	custom: 60000,
};

export function getDedupeWindow(eventType: string): number {
	return DEDUPE_WINDOWS[eventType] || 60000;
}

export const dedupeCache = createDedupeCache(60000, 100000);

function createMetrics() {
	let totalRequests = 0;
	let duplicatesBlocked = 0;
	let lastResetTime = Date.now();

	return {
		recordRequest(): void {
			totalRequests++;
		},

		recordDuplicate(): void {
			duplicatesBlocked++;
		},

		getMetrics() {
			const hitRate = totalRequests > 0 ? duplicatesBlocked / totalRequests : 0;

			return {
				totalRequests,
				duplicatesBlocked,
				cacheSize: dedupeCache.size(),
				hitRate: Math.round(hitRate * 10000) / 100,
				uptime: Date.now() - lastResetTime,
			};
		},

		reset(): void {
			totalRequests = 0;
			duplicatesBlocked = 0;
			lastResetTime = Date.now();
		},
	};
}

export const metrics = createMetrics();
