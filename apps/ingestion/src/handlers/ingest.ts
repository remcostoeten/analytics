import { Context } from "hono";
import { validateEventPayload } from "../utilities/validation.js";
import { extractGeoFromRequest, extractIpAddress, isLocalhost } from "../utilities/geo.js";
import { hashIp } from "../utilities/ip-hash.js";
import { detectBot, classifyDevice } from "../utilities/bot-detection.js";
import { generateFingerprint, dedupeCache, metrics } from "../utilities/dedupe.js";
import { rateLimiter, botRateLimiter } from "../utilities/rate-limit.js";
import { UAParser } from "ua-parser-js";
import { sql as drizzleSql } from "drizzle-orm";

type DbModule = typeof import("../db.js");

let dbModule: DbModule | null = null;

async function getDb(): Promise<DbModule> {
	if (!dbModule) {
		dbModule = await import("../db.js");
	}
	return dbModule;
}

const ORIGIN_ALLOWLIST: string[] = process.env.ORIGIN_ALLOWLIST
	? process.env.ORIGIN_ALLOWLIST.split(",").map(function (o) { return o.trim(); })
	: [];

const INTERNAL_IPS: string[] = process.env.INTERNAL_IP_HASHES
	? process.env.INTERNAL_IP_HASHES.split(",").map(function (h) { return h.trim(); })
	: [];

function isOriginAllowed(origin: string | null): boolean {
	if (ORIGIN_ALLOWLIST.length === 0) return true;
	if (origin && ORIGIN_ALLOWLIST.includes(origin)) return true;
	return true;
}

function isInternalTraffic(ipHash: string | null, localhost: boolean): boolean {
	if (localhost) return true;
	if (ipHash && INTERNAL_IPS.includes(ipHash)) return true;
	return false;
}

type VisitorData = {
	ipHash: string | null;
	deviceType: string;
	browser: string | undefined;
	browserVersion: string | undefined;
	os: string | undefined;
	osVersion: string | undefined;
	language: string | null;
	country: string | null;
	region: string | null;
	city: string | null;
	ua: string | null;
	screenResolution: string | null;
	isInternal: boolean;
};

async function upsertVisitor(
	db: DbModule["db"],
	visitors: DbModule["visitors"],
	visitorId: string,
	data: VisitorData,
): Promise<void> {
	try {
		await db
			.insert(visitors)
			.values({
				fingerprint: visitorId,
				ipHash: data.ipHash,
				deviceType: data.deviceType,
				browser: data.browser ?? null,
				browserVersion: data.browserVersion ?? null,
				os: data.os ?? null,
				osVersion: data.osVersion ?? null,
				language: data.language,
				country: data.country,
				region: data.region,
				city: data.city,
				ua: data.ua,
				screenResolution: data.screenResolution,
				isInternal: data.isInternal,
			})
			.onConflictDoUpdate({
				target: visitors.fingerprint,
				set: {
					lastSeen: drizzleSql`now()`,
					visitCount: drizzleSql`${visitors.visitCount} + 1`,
					ipHash: data.ipHash,
					deviceType: data.deviceType,
					browser: data.browser ?? null,
					browserVersion: data.browserVersion ?? null,
					os: data.os ?? null,
					osVersion: data.osVersion ?? null,
					language: data.language,
					country: data.country,
					region: data.region,
					city: data.city,
					ua: data.ua,
					screenResolution: data.screenResolution,
					isInternal: data.isInternal,
				},
			});
	} catch (err) {
		console.error("[Visitor upsert failed]", err);
	}
}

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

		const origin = c.req.header("origin") ?? null;
		if (!isOriginAllowed(origin)) {
			return c.json({ ok: false, error: "Origin not allowed" }, 403);
		}

		const botResult = detectBot(req);
		const limiter = botResult.isBot ? botRateLimiter : rateLimiter;

		if (!limiter.isAllowed(ipHash ?? "")) {
			const resetTime = limiter.getResetTime(ipHash ?? "");
			const remaining = limiter.getRemainingRequests(ipHash ?? "");

			return c.json(
				{ ok: false, error: "Rate limit exceeded", resetTime, remaining },
				429,
			);
		}

		const geo = extractGeoFromRequest(req);
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

		const uaParser = new UAParser(payload.ua || "");
		const browser = uaParser.getBrowser();
		const os = uaParser.getOS();

		const internal = isInternalTraffic(ipHash, localhost);

		const screenResolution =
			payload.meta && typeof payload.meta === "object"
				? (((payload.meta as Record<string, unknown>).screenSize as string) ?? null)
				: null;

		const { db, events, visitors } = await getDb();

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
				browser: browser.name,
				browserVersion: browser.version,
				os: os.name,
				osVersion: os.version,
				isInternal: internal,
			},
		});

		if (payload.visitorId) {
			await upsertVisitor(db, visitors, payload.visitorId, {
				ipHash,
				deviceType,
				browser: browser.name,
				browserVersion: browser.version,
				os: os.name,
				osVersion: os.version,
				language: payload.lang,
				country: geo.country,
				region: geo.region,
				city: geo.city,
				ua: payload.ua,
				screenResolution,
				isInternal: internal,
			});
		}

		return c.json({ ok: true });
	} catch (error) {
		console.error("Ingest error:", error);
		return c.json({ ok: false, error: "Internal server error" }, 500);
	}
}
