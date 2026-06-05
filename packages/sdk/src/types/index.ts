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
	trackClicks?: boolean;
	consentRequired?: boolean;
	consentGranted?: boolean;
};

export type TrackClickProps = AnalyticsOptions & {
	name: string;
	meta?: TrackMeta;
	children: import("react").ReactElement<{ onClick?: (event: import("react").MouseEvent) => void }>;
};

export type AnalyticsProviderProps = AnalyticsOptions & {
	children: import("react").ReactNode;
};

export type AnalyticsErrorBoundaryProps = AnalyticsOptions & {
	children: import("react").ReactNode;
	fallback?: import("react").ReactNode;
	onError?: (error: Error) => void;
};

export type TrackHelpers = {
	track: (type: EventType, meta?: TrackMeta, options?: AnalyticsOptions) => void;
	trackPageView: (meta?: TrackMeta, options?: AnalyticsOptions) => void;
	trackEvent: (eventName: string, meta?: TrackMeta, options?: AnalyticsOptions) => void;
	trackClick: (elementName: string, meta?: TrackMeta, options?: AnalyticsOptions) => void;
	trackError: (error: Error, meta?: TrackMeta, options?: AnalyticsOptions) => void;
	trackTransaction: (
		revenue: number,
		currency?: string,
		orderId?: string,
		items?: number,
		options?: AnalyticsOptions,
	) => void;
	trackSearch: (query: string, resultCount: number, options?: AnalyticsOptions) => void;
	identifyUser: (
		userProperties: Record<string, string | number | boolean>,
		options?: AnalyticsOptions,
	) => void;
	setExperiment: (experimentId: string, variantId: string, options?: AnalyticsOptions) => void;
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
