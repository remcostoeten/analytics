import type { Adapter, AdapterBuilder, AnalyticsEvent, Properties, RuntimeConfig } from "../types";
import { hasMethods, isBrowser, loadModule } from "../utilities";

type RemcoOptions = {
	projectId?: string;
	ingestUrl?: string;
	debug?: boolean;
};

type Observer = (options?: RemcoOptions) => () => void;

export type RemcoClient = {
	track: (type: string, meta?: Properties, options?: RemcoOptions) => void;
	trackEvent: (name: string, meta?: Properties, options?: RemcoOptions) => void;
	trackPageView: (meta?: Properties, options?: RemcoOptions) => void;
	identify?: (
		userId: string,
		properties?: Record<string, string | number | boolean>,
		options?: RemcoOptions,
	) => void;
	resetVisitorId?: () => string;
	resetSessionId?: () => string;
	flushOfflineQueue?: () => void;
	observeErrors?: Observer;
	observeClicks?: Observer;
	observeForms?: Observer;
	observeOutboundLinks?: Observer;
};

type RemcoState = {
	options: RemcoOptions;
	client?: RemcoClient;
	observers: ("errors" | "clicks" | "forms" | "outboundLinks")[];
};

export type RemcoBuilder = AdapterBuilder<"remco", RemcoClient> & {
	project: (projectId: string | undefined) => RemcoBuilder;
	ingest: (url: string | undefined) => RemcoBuilder;
	debug: (enabled?: boolean) => RemcoBuilder;
	client: (client: RemcoClient) => RemcoBuilder;
	errors: () => RemcoBuilder;
	clicks: () => RemcoBuilder;
	forms: () => RemcoBuilder;
	outboundLinks: () => RemcoBuilder;
};

function toTraits(properties: Properties): Record<string, string | number | boolean> {
	const traits: Record<string, string | number | boolean> = {};

	for (const key of Object.keys(properties)) {
		const value = properties[key];
		if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
			traits[key] = value;
		}
	}

	return traits;
}

function toMeta(event: AnalyticsEvent): Properties {
	return { ...event.context, ...event.properties };
}

function buildAdapter(state: RemcoState): Adapter<"remco", RemcoClient> {
	let client: RemcoClient | null = state.client ?? null;
	let options = state.options;
	const teardown: (() => void)[] = [];

	function observerFor(name: RemcoState["observers"][number]): Observer | undefined {
		if (!client) return undefined;
		if (name === "errors") return client.observeErrors;
		if (name === "clicks") return client.observeClicks;
		if (name === "forms") return client.observeForms;
		return client.observeOutboundLinks;
	}

	return {
		id: "remco",
		init: async function init(config: RuntimeConfig) {
			if (!client && !isBrowser()) return;
			if (!client) {
				const loaded = await loadModule(() => import("@remcostoeten/analytics"));
				client = hasMethods(loaded, ["track", "trackEvent", "trackPageView"]) ? loaded : null;
				if (!client) {
					config.report(
						new Error("@remcostoeten/analytics is unavailable or exports an unexpected shape"),
						"init",
					);
				}
			}
			if (!client) return;

			options = {
				...state.options,
				projectId: state.options.projectId ?? config.app,
			};

			for (const name of state.observers) {
				const observer = observerFor(name);
				if (!observer) continue;
				teardown.push(observer(options));
			}
		},
		active: function active() {
			return client !== null;
		},
		track: function track(event) {
			client?.trackEvent(event.name, toMeta(event), options);
		},
		page: function page(event) {
			client?.trackPageView(toMeta(event), options);
		},
		identify: function identify(event) {
			if (!event.userId) return;
			const traits = toTraits(event.properties);
			if (client?.identify) {
				client.identify(event.userId, traits, options);
				return;
			}
			client?.track("event", { eventName: "identify", userId: event.userId, userProperties: traits }, options);
		},
		reset: function reset() {
			client?.resetVisitorId?.();
			client?.resetSessionId?.();
		},
		flush: function flush() {
			client?.flushOfflineQueue?.();
		},
		destroy: function destroy() {
			while (teardown.length > 0) {
				const stop = teardown.pop();
				stop?.();
			}
		},
		expose: function expose() {
			return client ?? undefined;
		},
	};
}

function fromState(state: RemcoState): RemcoBuilder {
	function withObserver(name: RemcoState["observers"][number]): RemcoBuilder {
		if (state.observers.includes(name)) return fromState(state);
		return fromState({ ...state, observers: [...state.observers, name] });
	}

	return {
		project: function project(projectId) {
			return fromState({ ...state, options: { ...state.options, projectId } });
		},
		ingest: function ingest(url) {
			return fromState({ ...state, options: { ...state.options, ingestUrl: url } });
		},
		debug: function debug(enabled = true) {
			return fromState({ ...state, options: { ...state.options, debug: enabled } });
		},
		client: function client(instance) {
			return fromState({ ...state, client: instance });
		},
		errors: function errors() {
			return withObserver("errors");
		},
		clicks: function clicks() {
			return withObserver("clicks");
		},
		forms: function forms() {
			return withObserver("forms");
		},
		outboundLinks: function outboundLinks() {
			return withObserver("outboundLinks");
		},
		build: function build() {
			return buildAdapter(state);
		},
	};
}

export function remco(): RemcoBuilder {
	return fromState({ options: {}, observers: [] });
}
