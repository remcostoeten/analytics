export type KnownEventType = "pageview" | "event" | "click" | "error";
export type EventType = KnownEventType | (string & {});
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue | undefined };
export type TrackMeta = Record<string, JsonValue | undefined>;

export type AnalyticsOptions = {
	projectId?: string;
	ingestUrl?: string;
	debug?: boolean;
};

export type AnalyticsProps = AnalyticsOptions & {
	disabled?: boolean;
};

export type EventPayload<Type extends EventType = EventType> = {
	type: Type;
	projectId: string;
	path: string;
	referrer: string | null;
	origin: string;
	host: string;
	ua: string;
	lang: string;
	visitorId: string;
	sessionId: string;
	meta?: TrackMeta;
};
