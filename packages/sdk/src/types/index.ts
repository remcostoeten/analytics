/**
 * Core types and options for the analytics SDK.
 */

export type EventType = "pageview" | "event" | "click" | "error";

export type AnalyticsOptions = {
	projectId?: string;
	ingestUrl?: string;
	debug?: boolean;
};

export type EventPayload = {
	type: EventType;
	projectId: string;
	path: string;
	referrer: string | null;
	origin: string;
	host: string;
	ua: string;
	lang: string;
	visitorId: string;
	sessionId: string;
	meta?: Record<string, unknown>;
};
