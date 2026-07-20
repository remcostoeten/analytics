import { Context } from "hono";
import { validateEventPayload, resolveClientTimestamp } from "../utilities/validation.js";
import {
	type GeoData,
	extractIpAddress,
	isLocalhost,
	isPreviewEnvironment,
	getHostFromOrigin,
} from "../utilities/geo.js";
import { resolveGeo, extractClientTimezone } from "../utilities/resolve-geo.js";
import { lookupNetworkFromMmdb, type NetworkData } from "../utilities/geo-mmdb.js";
import { hashIp } from "../utilities/ip-hash.js";
import { detectBot, classifyDevice } from "../utilities/bot-detection.js";
import { generateFingerprint, dedupeCache, metrics, getDedupeWindow } from "../utilities/dedupe.js";
import { rateLimiter, botRateLimiter } from "../utilities/rate-limit.js";
import { authorizeIngestRequest } from "../utilities/ingest-auth.js";
import { UAParser } from "ua-parser-js";
import { sql as drizzleSql } from "drizzle-orm";

type DbModule = typeof import("../db/index.js");

let dbModule: DbModule | null = null;

async function getDb(): Promise<DbModule> {
	if (!dbModule) {
		dbModule = await import("../db/index.js");
	}
	return dbModule;
}

export function __setDbModule(mock: DbModule) {
	dbModule = mock;
}

function createCachedEnvList(envKey: string) {
	let cached: string[] | null = null;
	let cachedEnv: string | undefined = undefined;

	return function (): string[] {
		const current = process.env[envKey];
		if (current === cachedEnv && cached !== null) return cached;
		cachedEnv = current;
		cached = current
			? current
					.split(",")
					.map(function (v) {
						return v.trim();
					})
					.filter(Boolean)
			: [];
		return cached;
	};
}

const getOriginAllowlist = createCachedEnvList("ORIGIN_ALLOWLIST");
const getInternalIpHashes = createCachedEnvList("INTERNAL_IP_HASHES");

export function isOriginAllowed(origin: string | null): boolean {
	const allowlist = getOriginAllowlist();
	if (allowlist.length === 0) return true;
	if (origin && allowlist.includes(origin)) return true;
	return false;
}

export function isInternalTraffic(ipHash: string | null, localhost: boolean): boolean {
	if (localhost) return true;
	if (ipHash && getInternalIpHashes().includes(ipHash)) return true;
	return false;
}

export type SharedIngestContext = {
	ipHash: string | null;
	geo: GeoData;
	network: NetworkData;
	localhost: boolean;
	preview: boolean;
	internal: boolean;
};

type VisitorMetaMerge = { path: "identity" | "experiments"; value: Record<string, unknown> };

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
	timezone: string | null;
	ua: string | null;
	screenResolution: string | null;
	isInternal: boolean;
	metaMerge?: VisitorMetaMerge;
};

function extractEventName(meta: Record<string, unknown> | null): string | null {
	if (!meta || typeof meta !== "object") return null;
	const name = meta.eventName;
	return typeof name === "string" ? name : null;
}

function resolveVisitorMetaMerge(
	payload: import("../utilities/validation.js").EventPayload,
): VisitorMetaMerge | undefined {
	if (!payload.meta || typeof payload.meta !== "object") return undefined;
	const meta = payload.meta as Record<string, unknown>;
	if (meta.eventName === "identify") {
		const userProperties = meta.userProperties;
		if (userProperties && typeof userProperties === "object") {
			return { path: "identity", value: userProperties as Record<string, unknown> };
		}
	} else if (meta.eventName === "experiment_exposure") {
		const experiments = meta.experiments;
		if (experiments && typeof experiments === "object") {
			return { path: "experiments", value: experiments as Record<string, unknown> };
		}
	}
	return undefined;
}

async function upsertVisitor(
	db: DbModule["db"],
	visitors: DbModule["visitors"],
	visitorId: string,
	projectId: string,
	incrementVisit: boolean,
	data: VisitorData,
): Promise<void> {
	try {
		const updateSet: Record<string, unknown> = {
			lastSeen: drizzleSql`now()`,
			visitCount: drizzleSql`${visitors.visitCount} + ${incrementVisit ? 1 : 0}`,
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
			timezone: data.timezone,
			ua: data.ua,
			screenResolution: data.screenResolution,
			isInternal: data.isInternal,
		};

		if (data.metaMerge) {
			const { path, value } = data.metaMerge;
			updateSet.meta = drizzleSql`jsonb_set(
				COALESCE(${visitors.meta}, '{}'::jsonb),
				ARRAY[${path}]::text[],
				COALESCE(${visitors.meta}->${path}, '{}'::jsonb) || ${JSON.stringify(value)}::jsonb,
				true
			)`;
		}

		await db
			.insert(visitors)
			.values({
				fingerprint: visitorId,
				projectId,
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
				timezone: data.timezone,
				ua: data.ua,
				screenResolution: data.screenResolution,
				isInternal: data.isInternal,
				meta: data.metaMerge ? { [data.metaMerge.path]: data.metaMerge.value } : null,
			})
			.onConflictDoUpdate({
				target: [visitors.projectId, visitors.fingerprint],
				set: updateSet,
			});
	} catch (err) {
		console.error("[Visitor upsert failed]", err);
	}
}

async function upsertSession(
	db: DbModule["db"],
	sessions: DbModule["sessions"],
	payload: import("../utilities/validation.js").EventPayload,
	sessionId: string,
	country: string | null,
	deviceType: string,
	internal: boolean,
	clientTs: Date | null,
): Promise<boolean> {
	const isPageview = (payload.type || "pageview") === "pageview";
	const eventTs = clientTs ? drizzleSql`${clientTs.toISOString()}::timestamptz` : drizzleSql`now()`;
	try {
		const rows = await db
			.insert(sessions)
			.values({
				projectId: payload.projectId,
				sessionId,
				visitorId: payload.visitorId ?? null,
				startedAt: eventTs,
				lastEventAt: eventTs,
				entryPath: payload.path,
				exitPath: payload.path,
				referrer: payload.referrer,
				pageviews: isPageview ? 1 : 0,
				events: 1,
				durationMs: 0,
				country,
				deviceType,
				isInternal: internal,
			})
			.onConflictDoUpdate({
				target: sessions.sessionId,
				set: {
					lastEventAt: drizzleSql`GREATEST(${sessions.lastEventAt}, ${eventTs})`,
					exitPath: payload.path,
					events: drizzleSql`${sessions.events} + 1`,
					pageviews: drizzleSql`${sessions.pageviews} + ${isPageview ? 1 : 0}`,
					durationMs: drizzleSql`(EXTRACT(EPOCH FROM (GREATEST(${sessions.lastEventAt}, ${eventTs}) - ${sessions.startedAt})) * 1000)::integer`,
				},
			})
			.returning({ inserted: drizzleSql<boolean>`xmax = 0` });
		return rows?.[0]?.inserted ?? false;
	} catch (err) {
		console.error("[Session upsert failed]", err);
		return false;
	}
}

export async function processSingleEvent(
	payload: import("../utilities/validation.js").EventPayload,
	ctx: SharedIngestContext,
	botIsBot: boolean,
	botReason: string | null,
	botConfidence: "high" | "medium" | "low",
): Promise<{ ok: boolean; deduped?: boolean }> {
	const clientTs = resolveClientTimestamp(payload.ts);
	const eventName = extractEventName(payload.meta);

	const fingerprint = await generateFingerprint({
		projectId: payload.projectId,
		visitorId: payload.visitorId,
		sessionId: payload.sessionId,
		type: payload.type || "pageview",
		path: payload.path,
		eventName,
		timestamp: clientTs?.getTime() ?? Date.now(),
	});

	if (dedupeCache.isDuplicate(fingerprint)) {
		metrics.recordDuplicate();
		return { ok: true, deduped: true };
	}

	dedupeCache.add(fingerprint, getDedupeWindow(payload.type || "pageview"));

	const uaParser = new UAParser(payload.ua || "");
	const browser = uaParser.getBrowser();
	const os = uaParser.getOS();

	const deviceType = classifyDevice(payload.ua, botIsBot);
	const internal = isInternalTraffic(ctx.ipHash, ctx.localhost);

	const screenResolution =
		payload.meta && typeof payload.meta === "object"
			? (((payload.meta as Record<string, unknown>).screenSize as string) ?? null)
			: null;

	const { db, events, visitors, sessions } = await getDb();

	const insertedRows = await db
		.insert(events)
		.values({
			...(clientTs ? { ts: clientTs } : {}),
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

			ipHash: ctx.ipHash,
			country: ctx.geo.country,
			region: ctx.geo.region,
			city: ctx.geo.city,
			latitude: ctx.geo.latitude,
			longitude: ctx.geo.longitude,
			timezone: ctx.geo.timezone,
			postalCode: ctx.geo.postalCode,
			continent: ctx.geo.continent,
			asn: ctx.network.asn,
			asOrg: ctx.network.asOrg,
			isLocalhost: ctx.localhost,
			isPreview: ctx.preview,
			botDetected: botIsBot,
			isInternal: internal,
			deviceType,

			fingerprint,

			meta: {
				...payload.meta,
				botReason,
				botConfidence,
				browser: browser.name,
				browserVersion: browser.version,
				os: os.name,
				osVersion: os.version,
			},
		})
		.onConflictDoNothing({ target: events.fingerprint })
		.returning({ id: events.id });

	if (insertedRows.length === 0) {
		metrics.recordDuplicate();
		return { ok: true, deduped: true };
	}

	let sessionInserted = false;
	if (payload.sessionId) {
		sessionInserted = await upsertSession(
			db,
			sessions,
			payload,
			payload.sessionId,
			ctx.geo.country,
			deviceType,
			internal,
			clientTs,
		);
	}

	if (payload.visitorId) {
		await upsertVisitor(db, visitors, payload.visitorId, payload.projectId, sessionInserted, {
			ipHash: ctx.ipHash,
			deviceType,
			browser: browser.name,
			browserVersion: browser.version,
			os: os.name,
			osVersion: os.version,
			language: payload.lang,
			country: ctx.geo.country,
			region: ctx.geo.region,
			city: ctx.geo.city,
			timezone: ctx.geo.timezone,
			ua: payload.ua,
			screenResolution,
			isInternal: internal,
			metaMerge: resolveVisitorMetaMerge(payload),
		});
	}

	return { ok: true };
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

		const geo = await resolveGeo(req, ip, extractClientTimezone(payload.meta));
		const network = await lookupNetworkFromMmdb(ip);
		const localhost = isLocalhost(payload.host);
		const preview =
			isPreviewEnvironment(payload.host) || isPreviewEnvironment(getHostFromOrigin(origin));

		const ctx: SharedIngestContext = {
			ipHash,
			geo,
			network,
			localhost,
			preview,
			internal: isInternalTraffic(ipHash, localhost),
		};

		const eventResult = await processSingleEvent(
			payload,
			ctx,
			botResult.isBot,
			botResult.reason,
			botResult.confidence,
		);

		return c.json(eventResult);
	} catch (error) {
		console.error("Ingest error:", error);
		return c.json({ ok: false, error: "Internal server error" }, 500);
	}
}
