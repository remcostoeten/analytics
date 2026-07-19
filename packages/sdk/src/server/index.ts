import { uuid } from "../utilities/uuid";
import { debugLog } from "../utilities/logger";
import {
	normalizeIngestUrl,
	resolveServerIngestUrl,
	validateIngestUrl,
} from "../utilities/ingest-url";
import {
	type EventPayload,
	type EventType,
	type ServerAnalyticsOptions,
	type ServerTrackHelpers,
	type TrackMeta,
	type TrackServerResult,
} from "../types";

const SERVER_UA = "remco-analytics-server/1.0";
const DEFAULT_SERVER_PATH = "/server";

function mergeServerOptions(
	base: ServerAnalyticsOptions,
	override?: Partial<ServerAnalyticsOptions>,
): ServerAnalyticsOptions {
	if (!override) return base;
	return { ...base, ...override };
}

function resolveIngestUrl(options: ServerAnalyticsOptions): string {
	const raw = options.ingestUrl || resolveServerIngestUrl();
	if (!raw) return "";
	const normalized = normalizeIngestUrl(raw);
	if (!validateIngestUrl(normalized)) return "";
	return normalized;
}

function resolveSecret(options: ServerAnalyticsOptions): string | undefined {
	const secret = options.secret ?? process.env.INGEST_SECRET;
	return secret?.trim() || undefined;
}

function buildServerPayload(
	type: EventType,
	meta: TrackMeta | undefined,
	options: ServerAnalyticsOptions,
): EventPayload {
	return {
		type,
		projectId: options.projectId,
		path: options.path ?? DEFAULT_SERVER_PATH,
		referrer: null,
		origin: "",
		host: "",
		ua: SERVER_UA,
		lang: "en",
		visitorId: options.visitorId ?? uuid(),
		sessionId: options.sessionId ?? uuid(),
		meta: { source: "server", ...meta },
	};
}

function parseIngestResponse(body: unknown): Pick<TrackServerResult, "deduped" | "error"> {
	if (!body || typeof body !== "object") return {};
	const record = body as Record<string, unknown>;
	return {
		deduped: record.deduped === true ? true : undefined,
		error: typeof record.error === "string" ? record.error : undefined,
	};
}

export async function trackServer(
	type: EventType,
	options: ServerAnalyticsOptions,
	meta?: TrackMeta,
): Promise<TrackServerResult> {
	const ingestUrl = resolveIngestUrl(options);
	if (!ingestUrl) {
		const error = "Missing ingest URL. Set ANALYTICS_URL or pass ingestUrl.";
		debugLog(options.debug, error);
		return { ok: false, status: 0, error };
	}

	const payload = buildServerPayload(type, meta, options);
	const secret = resolveSecret(options);
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};

	if (secret) {
		headers.Authorization = `Bearer ${secret}`;
	}

	try {
		const response = await fetch(`${ingestUrl}/e`, {
			method: "POST",
			headers,
			body: JSON.stringify(payload),
		});

		let parsed: unknown;
		try {
			parsed = await response.json();
		} catch {
			parsed = null;
		}

		const details = parseIngestResponse(parsed);
		const result: TrackServerResult = {
			ok: response.ok,
			status: response.status,
			...details,
		};

		if (!response.ok && !result.error) {
			result.error = response.status === 401 ? "Unauthorized" : "Ingest request failed";
		}

		debugLog(options.debug, result.ok ? "Server event tracked" : "Server event failed", result);
		return result;
	} catch (error) {
		const message = error instanceof Error ? error.message : "Network error";
		debugLog(options.debug, "Server event failed", message);
		return { ok: false, status: 0, error: message };
	}
}

export async function trackServerEvent(
	eventName: string,
	options: ServerAnalyticsOptions,
): Promise<TrackServerResult>;
export async function trackServerEvent(
	eventName: string,
	meta: TrackMeta,
	options: ServerAnalyticsOptions,
): Promise<TrackServerResult>;
export async function trackServerEvent(
	eventName: string,
	metaOrOptions: TrackMeta | ServerAnalyticsOptions,
	maybeOptions?: ServerAnalyticsOptions,
): Promise<TrackServerResult> {
	if (maybeOptions) {
		return trackServer("event", maybeOptions, { eventName, ...(metaOrOptions as TrackMeta) });
	}

	return trackServer("event", metaOrOptions as ServerAnalyticsOptions, { eventName });
}

export async function trackServerError(
	error: Error,
	options: ServerAnalyticsOptions,
): Promise<TrackServerResult>;
export async function trackServerError(
	error: Error,
	meta: TrackMeta,
	options: ServerAnalyticsOptions,
): Promise<TrackServerResult>;
export async function trackServerError(
	error: Error,
	metaOrOptions: TrackMeta | ServerAnalyticsOptions,
	maybeOptions?: ServerAnalyticsOptions,
): Promise<TrackServerResult> {
	if (maybeOptions) {
		return trackServer("error", maybeOptions, {
			message: error.message,
			stack: error.stack,
			...(metaOrOptions as TrackMeta),
		});
	}

	return trackServer("error", metaOrOptions as ServerAnalyticsOptions, {
		message: error.message,
		stack: error.stack,
	});
}

export function createServerTrack(defaults: ServerAnalyticsOptions): ServerTrackHelpers {
	return {
		track(type, meta, options) {
			return trackServer(type, mergeServerOptions(defaults, options), meta);
		},
		trackEvent(eventName, meta, options) {
			const merged = mergeServerOptions(defaults, options);
			return trackServer("event", merged, meta ? { eventName, ...meta } : { eventName });
		},
		trackError(error, meta, options) {
			const merged = mergeServerOptions(defaults, options);
			return trackServer("error", merged, {
				message: error.message,
				stack: error.stack,
				...meta,
			});
		},
	};
}

export type {
	EventType,
	ServerAnalyticsOptions,
	ServerTrackHelpers,
	TrackMeta,
	TrackServerResult,
} from "../types";
