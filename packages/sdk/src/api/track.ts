import { getVisitorId } from "../identity/visitor";
import { getSessionId, extendSession } from "../identity/session";
import { isOptedOut, checkDoNotTrack } from "./privacy";
import { isRuntime, debugLog, collectEnrichment, noop } from "../utilities";
import { type AnalyticsOptions, type EventPayload, type EventType, type TrackMeta } from "../types";

const recentEvents = new Set<string>();
const DEDUPE_WINDOW_MS = 5000;

function resolveDefaultProjectId(): string {
	if (isRuntime("server") || typeof window === "undefined") return "unknown";
	return window.location?.hostname || "unknown";
}

type Env = Record<string, string | undefined>;
type ImportMetaEnv = ImportMeta & {
	env?: Env;
};

function getEnv(): Env {
	if (typeof process !== "undefined" && process.env) return process.env;
	const meta = import.meta as ImportMetaEnv;
	if (meta.env) return meta.env;
	return {};
}

export function validateIngestUrl(url: string): boolean {
	try {
		const normalized = url.replace(/\/+$/, "");
		const parsed = new URL(normalized);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

function normalizeIngestUrl(url: string): string {
	return url.replace(/\/+$/, "");
}

export function resolveDefaultIngestUrl(): string {
	const env = getEnv();
	const url = env.NEXT_PUBLIC_ANALYTICS_URL || env.VITE_ANALYTICS_URL;

	if (!url) {
		if (typeof window !== "undefined") {
			console.error("[Analytics] No ingest URL configured. Set NEXT_PUBLIC_ANALYTICS_URL or VITE_ANALYTICS_URL.");
		}
		return "";
	}

	if (typeof window !== "undefined" && !validateIngestUrl(url)) {
		console.error(`[Analytics] Invalid ingestUrl: "${url}". Must be a valid http/https URL.`);
		return "";
	}

	return url;
}

const DEFAULT_PROJECT_ID = resolveDefaultProjectId();

function createEventKey(payload: EventPayload): string {
	return `${payload.type}-${payload.path}-${payload.visitorId}-${payload.sessionId}`;
}

function isDuplicate(payload: EventPayload): boolean {
	const key = createEventKey(payload);
	if (recentEvents.has(key)) return true;
	recentEvents.add(key);
	setTimeout(() => recentEvents.delete(key), DEDUPE_WINDOW_MS);
	return false;
}

function buildPayload(
	type: EventType,
	meta: TrackMeta | undefined,
	options: AnalyticsOptions,
): EventPayload | null {
	if (isRuntime("server")) return null;

	return {
		type,
		projectId: options.projectId || DEFAULT_PROJECT_ID,
		path: window.location.pathname,
		referrer: document.referrer || null,
		origin: window.location.origin,
		host: window.location.host,
		ua: navigator.userAgent,
		lang: navigator.language,
		visitorId: getVisitorId(),
		sessionId: getSessionId(),
		meta: { ...collectEnrichment(), ...meta },
	};
}

function sendWithBeacon(url: string, payload: EventPayload): boolean {
	if (typeof navigator === "undefined" || !navigator.sendBeacon) return false;
	try {
		const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
		return navigator.sendBeacon(url, blob);
	} catch {
		return false;
	}
}

function sendWithFetch(url: string, payload: EventPayload): void {
	if (typeof fetch === "undefined") return;
	fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
		keepalive: true,
	}).catch(noop);
}

export function track(type: EventType, meta?: TrackMeta, options: AnalyticsOptions = {}): void {
	if (isOptedOut()) {
		debugLog(options.debug, "User opted out");
		return;
	}

	if (checkDoNotTrack()) {
		debugLog(options.debug, "DNT enabled");
		return;
	}

	const payload = buildPayload(type, meta, options);
	if (!payload) return;

	if (isDuplicate(payload)) {
		debugLog(options.debug, "Duplicate blocked", payload);
		return;
	}

	let ingestUrl = options.ingestUrl ? normalizeIngestUrl(options.ingestUrl) : undefined;
	if (ingestUrl && !validateIngestUrl(ingestUrl)) {
		debugLog(options.debug, `Invalid ingestUrl: "${ingestUrl}". Using default.`);
		ingestUrl = undefined;
	}

	const baseUrl = ingestUrl || resolveDefaultIngestUrl();
	if (!baseUrl) {
		debugLog(options.debug, "No ingest URL configured, event dropped.");
		return;
	}

	const endpoint = `${baseUrl}/e`;
	extendSession();

	if (!sendWithBeacon(endpoint, payload)) {
		sendWithFetch(endpoint, payload);
	}

	debugLog(options.debug, "Event tracked", payload);
}

export function trackPageView(meta?: TrackMeta, options?: AnalyticsOptions): void {
	track("pageview", meta, options);
}

export function trackEvent(eventName: string, meta?: TrackMeta, options?: AnalyticsOptions): void {
	track("event", { eventName, ...meta }, options);
}

export function trackClick(
	elementName: string,
	meta?: TrackMeta,
	options?: AnalyticsOptions,
): void {
	track("click", { elementName, ...meta }, options);
}

export function trackError(error: Error, meta?: TrackMeta, options?: AnalyticsOptions): void {
	track("error", { message: error.message, stack: error.stack, ...meta }, options);
}

export function trackTransaction(
	revenue: number,
	currency: string = "USD",
	orderId?: string,
	items?: number,
	options?: AnalyticsOptions,
): void {
	track("event", { eventName: "transaction", revenue, currency, orderId, items }, options);
}

export function trackSearch(query: string, resultCount: number, options?: AnalyticsOptions): void {
	track("event", { eventName: "site_search", query, resultCount }, options);
}

export function identifyUser(
	userProperties: Record<string, string | number | boolean>,
	options?: AnalyticsOptions,
): void {
	track("event", { eventName: "identify", userProperties }, options);
}

export function setExperiment(
	experimentId: string,
	variantId: string,
	options?: AnalyticsOptions,
): void {
	track(
		"event",
		{ eventName: "experiment_exposure", experiments: { [experimentId]: variantId } },
		options,
	);
}
