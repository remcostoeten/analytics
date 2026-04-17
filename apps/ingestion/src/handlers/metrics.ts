import { Context } from "hono";
import { metrics } from "../utilities/dedupe.js";
import { rateLimiter, botRateLimiter } from "../utilities/rate-limit.js";

export async function handleMetrics(c: Context) {
	const dedupeMetrics = metrics.getMetrics();
	const rateLimitMetrics = rateLimiter.getMetrics();
	const botRateLimitMetrics = botRateLimiter.getMetrics();

	return c.json({
		ok: true,
		timestamp: new Date().toISOString(),
		metrics: {
			deduplication: dedupeMetrics,
			rateLimit: {
				regular: rateLimitMetrics,
				bots: botRateLimitMetrics,
			},
		},
	});
}
