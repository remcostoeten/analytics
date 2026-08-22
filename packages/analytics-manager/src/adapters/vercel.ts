import type { Adapter, AdapterBuilder, AnalyticsEvent, Properties } from "../types";
import { hasMethods, isBrowser, loadModule } from "../utilities";

type VercelProperties = Record<string, string | number | boolean | null>;

export type VercelClient = {
	track: (name: string, properties?: VercelProperties) => void;
};

type VercelModule = VercelClient & {
	inject: (options?: { debug?: boolean }) => void;
};

type VercelState = {
	debug: boolean;
	client?: VercelClient;
};

export type VercelBuilder = AdapterBuilder<"vercel", VercelClient> & {
	debug: (enabled?: boolean) => VercelBuilder;
	client: (client: VercelClient) => VercelBuilder;
};

function toProperties(properties: Properties): VercelProperties {
	const result: VercelProperties = {};

	for (const key of Object.keys(properties)) {
		const value = properties[key];
		if (value === undefined) continue;
		if (
			value === null ||
			typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "boolean"
		) {
			result[key] = value;
			continue;
		}
		result[key] = JSON.stringify(value);
	}

	return result;
}

function buildAdapter(state: VercelState): Adapter<"vercel", VercelClient> {
	let client: VercelClient | null = state.client ?? null;

	return {
		id: "vercel",
		init: async function init(config) {
			if (client || !isBrowser()) return;
			const loaded = await loadModule(() => import("@vercel/analytics"));
			const ready = hasMethods(loaded, ["track", "inject"]) ? (loaded as VercelModule) : null;
			ready?.inject({ debug: state.debug });
			client = ready;
			if (!client) {
				config.report(
					new Error("@vercel/analytics is unavailable or exports an unexpected shape"),
					"init",
				);
			}
		},
		active: function active() {
			return client !== null;
		},
		track: function track(event: AnalyticsEvent) {
			const properties = toProperties({ ...event.context, ...event.properties });
			if (state.debug && typeof console !== "undefined") {
				console.debug("[analytics-manager] vercel", event.name, properties);
			}
			client?.track(event.name, properties);
		},
		expose: function expose() {
			return client ?? undefined;
		},
	};
}

function fromState(state: VercelState): VercelBuilder {
	return {
		debug: function debug(enabled = true) {
			return fromState({ ...state, debug: enabled });
		},
		client: function client(instance) {
			return fromState({ ...state, client: instance });
		},
		build: function build() {
			return buildAdapter(state);
		},
	};
}

export function vercel(): VercelBuilder {
	return fromState({ debug: false });
}
