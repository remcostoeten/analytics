import { Context } from "hono";
import { metrics } from "../utilities/dedupe.js";
import { rateLimiter, botRateLimiter } from "../utilities/rate-limit.js";
import { requireAdminAuth } from "./admin.js";

export async function handleMetrics(c: Context) {
	const authError = requireAdminAuth(c);
	if (authError) return authError;
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
