import { Context } from "hono";
import { db, events } from "./db.js";
import { validateEventPayload } from "./validation.js";
import { extractGeoFromRequest, extractIpAddress, isLocalhost } from "./geo.js";
import { hashIp } from "./ip-hash.js";
import { detectBot, classifyDevice } from "./bot-detection.js";
import { generateFingerprint, dedupeCache, metrics } from "./dedupe.js";

export async function handleIngest(c: Context) {
	try {
		metrics.recordRequest();

		const body = await c.req.json();
		const req = c.req.raw;

		const result = validateEventPayload(body);

		if (!result.success) {
			return c.json(
				{
					ok: false,
					error: "Invalid payload",
					details: result.error.issues,
				},
				400,
			);
		}

		const payload = result.data;

		const ip = extractIpAddress(req);
		const ipHash = await hashIp(ip ?? null);

		const geo = extractGeoFromRequest(req);

		const botResult = detectBot(req);

		const deviceType = classifyDevice(payload.ua, botResult.isBot);

		const localhost = isLocalhost(payload.host);

		const fingerprint = await generateFingerprint({
			projectId: payload.projectId,
			visitorId: payload.visitorId,
			sessionId: payload.sessionId,
			type: payload.type || "pageview",
			path: payload.path,
			timestamp: Date.now(),
		});

		if (dedupeCache.isDuplicate(fingerprint)) {
			metrics.recordDuplicate();
			return c.json({ ok: true, deduped: true });
		}

		dedupeCache.add(fingerprint);

		await db.insert(events).values({
			projectId: payload.projectId,
			type: payload.type || "pageview",
			path: payload.path,
			referrer: payload.referrer,
			origin: payload.origin,
			host: payload.host,
			ua: payload.ua,
			lang: payload.lang,
			visitorId: payload.visitorId,
			sessionId: payload.sessionId,
			ipHash,
			country: geo.country,
			region: geo.region,
			city: geo.city,
			isLocalhost: localhost,
			deviceType,
			meta: {
				...payload.meta,
				botDetected: botResult.isBot,
				botReason: botResult.reason,
				botConfidence: botResult.confidence,
				fingerprint,
			},
		});

		return c.json({ ok: true });
	} catch (error) {
		console.error("Ingest error:", error);
		return c.json(
			{
				ok: false,
				error: "Internal server error",
			},
			500,
		);
	}
}
