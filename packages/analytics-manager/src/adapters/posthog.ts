import type { Adapter, AdapterBuilder, AnalyticsEvent, Properties, RuntimeConfig } from "../types";
import { hasMethods, isBrowser, loadModule } from "../utilities";

type PosthogConfig = {
	api_host?: string;
	capture_pageview?: boolean;
	autocapture?: boolean;
	disable_session_recording?: boolean;
};

export type PosthogClient = {
	init: (token: string, config?: PosthogConfig) => unknown;
	capture: (name: string, properties?: Properties) => unknown;
	identify: (userId: string, properties?: Properties) => unknown;
	reset: (resetDeviceId?: boolean) => unknown;
	group?: (groupType: string, groupKey: string, properties?: Properties) => unknown;
	alias?: (alias: string, original?: string) => unknown;
	register?: (properties: Properties) => void;
	isFeatureEnabled?: (flag: string) => boolean | undefined;
	getFeatureFlag?: (flag: string) => string | boolean | undefined;
	reloadFeatureFlags?: () => void;
	startSessionRecording?: () => void;
	stopSessionRecording?: () => void;
};

export type PosthogProvider = {
	client: PosthogClient;
	featureFlags: {
		isEnabled: (flag: string) => boolean;
		get: (flag: string) => string | boolean | undefined;
		reload: () => void;
	};
	replay: {
		start: () => void;
		stop: () => void;
	};
};

type PosthogState = {
	token?: string;
	host?: string;
	pageviews: boolean;
	autocapture: boolean;
	sessionReplay: boolean;
	client?: PosthogClient;
};

export type PosthogBuilder = AdapterBuilder<"posthog", PosthogProvider> & {
	token: (token: string | undefined) => PosthogBuilder;
	host: (url: string | undefined) => PosthogBuilder;
	pageviews: (enabled?: boolean) => PosthogBuilder;
	autocapture: (enabled?: boolean) => PosthogBuilder;
	sessionReplay: (enabled?: boolean) => PosthogBuilder;
	client: (client: PosthogClient) => PosthogBuilder;
};

function toProperties(event: AnalyticsEvent): Properties {
	return { ...event.context, ...event.properties };
}

function toProvider(client: PosthogClient): PosthogProvider {
	return {
		client,
		featureFlags: {
			isEnabled: function isEnabled(flag) {
				return client.isFeatureEnabled?.(flag) === true;
			},
			get: function get(flag) {
				return client.getFeatureFlag?.(flag);
			},
			reload: function reload() {
				client.reloadFeatureFlags?.();
			},
		},
		replay: {
			start: function start() {
				client.startSessionRecording?.();
			},
			stop: function stop() {
				client.stopSessionRecording?.();
			},
		},
	};
}

function buildAdapter(state: PosthogState): Adapter<"posthog", PosthogProvider> {
	let client: PosthogClient | null = state.client ?? null;
	const injected = client !== null;

	return {
		id: "posthog",
		init: async function init(config: RuntimeConfig) {
			const token = state.token;
			if (injected) return;
			if (!token || !isBrowser()) return;
			if (!client) {
				const loaded = await loadModule(() => import("posthog-js"));
				const candidate = loaded?.default ?? loaded?.posthog ?? loaded ?? null;
				client = hasMethods(candidate, ["init", "capture", "identify"])
					? (candidate as PosthogClient)
					: null;
				if (!client) {
					config.report(
						new Error("posthog-js is unavailable or exports an unexpected shape"),
						"init",
					);
				}
			}
			if (!client) return;

			client.init(token, {
				api_host: state.host,
				capture_pageview: state.pageviews,
				autocapture: state.autocapture,
				disable_session_recording: !state.sessionReplay,
			});

			const superProperties: Properties = {};
			if (config.app) superProperties.app = config.app;
			if (config.environment) superProperties.environment = config.environment;
			if (Object.keys(superProperties).length > 0) client.register?.(superProperties);
		},
		active: function active() {
			return client !== null && (injected || Boolean(state.token));
		},
		track: function track(event) {
			client?.capture(event.name, toProperties(event));
		},
		page: function page(event) {
			client?.capture("$pageview", toProperties(event));
		},
		identify: function identify(event) {
			if (!event.userId) return;
			client?.identify(event.userId, toProperties(event));
		},
		group: function group(event) {
			if (!event.groupType || !event.groupId) return;
			if (!client?.group) return false;
			client.group(event.groupType, event.groupId, event.properties);
		},
		alias: function alias(event) {
			if (!event.userId) return;
			if (!client?.alias) return false;
			client.alias(event.userId, event.previousId);
		},
		reset: function reset() {
			client?.reset();
		},
		expose: function expose() {
			if (!client) return undefined;
			return toProvider(client);
		},
	};
}

function fromState(state: PosthogState): PosthogBuilder {
	return {
		token: function token(value) {
			return fromState({ ...state, token: value });
		},
		host: function host(url) {
			return fromState({ ...state, host: url });
		},
		pageviews: function pageviews(enabled = true) {
			return fromState({ ...state, pageviews: enabled });
		},
		autocapture: function autocapture(enabled = true) {
			return fromState({ ...state, autocapture: enabled });
		},
		sessionReplay: function sessionReplay(enabled = true) {
			return fromState({ ...state, sessionReplay: enabled });
		},
		client: function client(instance) {
			return fromState({ ...state, client: instance });
		},
		build: function build() {
			return buildAdapter(state);
		},
	};
}

export function posthog(): PosthogBuilder {
	return fromState({ pageviews: false, autocapture: false, sessionReplay: false });
}
