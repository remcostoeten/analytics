import { Context } from "hono";
import { z } from "zod";
import { eventSchema } from "../utilities/validation.js";
import { processSingleEvent, type SharedIngestContext } from "./ingest.js";
import {
	extractGeoFromRequest,
	extractIpAddress,
	isLocalhost,
	isPreviewEnvironment,
	getHostFromOrigin,
} from "../utilities/geo.js";
import { hashIp } from "../utilities/ip-hash.js";
import { detectBot } from "../utilities/bot-detection.js";
import { rateLimiter, botRateLimiter } from "../utilities/rate-limit.js";
import { authorizeIngestRequest } from "../utilities/ingest-auth.js";
import { metrics } from "../utilities/dedupe.js";

const batchSchema = z.object({
	events: z.array(eventSchema).min(1).max(100),
});

function isOriginAllowed(origin: string | null): boolean {
	const allowlist = process.env.ORIGIN_ALLOWLIST
		? process.env.ORIGIN_ALLOWLIST.split(",")
				.map((o) => o.trim())
				.filter(Boolean)
		: [];
	return allowlist.length === 0 || (origin !== null && allowlist.includes(origin));
}

function isInternalTraffic(ipHash: string | null, localhost: boolean): boolean {
	if (localhost) return true;
	const internal = process.env.INTERNAL_IP_HASHES
		? process.env.INTERNAL_IP_HASHES.split(",").map((h) => h.trim())
		: [];
	return ipHash ? internal.includes(ipHash) : false;
}

export async function handleBatch(c: Context) {
	try {
		const body = await c.req.json();
		const req = c.req.raw;

		const result = batchSchema.safeParse(body);
		if (!result.success) {
			return c.json({ ok: false, error: "Invalid payload", details: result.error.issues }, 400);
		}

		const { events } = result.data;

		const ip = extractIpAddress(req);
		const ipHash = await hashIp(ip ?? null);

		const origin = c.req.header("origin") ?? null;
		const auth = authorizeIngestRequest(origin, c.req.header("authorization"), {
			originAllowed: isOriginAllowed,
			ingestSecret: process.env.INGEST_SECRET,
		});

		if (!auth.allowed) {
			return c.json({ ok: false, error: auth.error }, auth.status);
		}

		const botResult = detectBot(req);
		const limiter = botResult.isBot ? botRateLimiter : rateLimiter;

		if (!limiter.isAllowed(ipHash ?? "")) {
			const resetTime = limiter.getResetTime(ipHash ?? "");
			const remaining = limiter.getRemainingRequests(ipHash ?? "");
			return c.json({ ok: false, error: "Rate limit exceeded", resetTime, remaining }, 429);
		}

		const geo = extractGeoFromRequest(req);

		let processed = 0;
		let failed = 0;
		let deduped = 0;

		for (const event of events) {
			metrics.recordRequest();

			const localhost = isLocalhost(event.host);
			const preview =
				isPreviewEnvironment(event.host) || isPreviewEnvironment(getHostFromOrigin(origin));

			const ctx: SharedIngestContext = {
				ipHash,
				geo,
				localhost,
				preview,
				internal: isInternalTraffic(ipHash, localhost),
			};

			try {
				const eventResult = await processSingleEvent(
					event,
					ctx,
					botResult.isBot,
					botResult.reason,
					botResult.confidence,
				);

				if (eventResult.deduped) {
					deduped++;
				} else {
					processed++;
				}
			} catch (err) {
				console.error("[Batch event failed]", err);
				failed++;
			}
		}

		return c.json({ ok: true, processed, deduped, failed });
	} catch (error) {
		console.error("Batch ingest error:", error);
		return c.json({ ok: false, error: "Internal server error" }, 500);
	}
}
