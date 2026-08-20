import type {
	Adapter,
	AdapterBuilder,
	AdapterMap,
	AdapterSource,
	Analytics,
	Builder,
	Context,
	ContextInput,
	Empty,
	EventMap,
	Middleware,
	RuntimeConfig,
} from "../types";
import { merge, notifyError, resolveContext, toError } from "../utilities";
import type { Core } from "./dispatch";
import { createRuntime } from "./runtime";

type BuilderState = {
	app?: string;
	environment?: string;
	context: ContextInput[];
	adapters: AdapterSource[];
	middleware: Middleware[];
};

function isBuilder(source: AdapterSource): source is AdapterBuilder {
	return typeof (source as AdapterBuilder).build === "function";
}

function toAdapter(source: AdapterSource): Adapter {
	if (isBuilder(source)) return source.build();
	return source;
}

function resolveAdapters(sources: AdapterSource[]): Adapter[] {
	const adapters: Adapter[] = [];
	const seen = new Set<string>();

	for (const source of sources) {
		const adapter = toAdapter(source);
		if (seen.has(adapter.id)) {
			throw new Error(`[analytics-manager] duplicate adapter id "${adapter.id}"`);
		}
		seen.add(adapter.id);
		adapters.push(adapter);
	}

	return adapters;
}

function resolveConfig(state: BuilderState): RuntimeConfig {
	let context: Context = {};

	for (const input of state.context) {
		context = merge(context, resolveContext(input));
	}

	if (state.app !== undefined) context = merge(context, { app: state.app });
	if (state.environment !== undefined) {
		context = merge(context, { environment: state.environment });
	}

	return { app: state.app, environment: state.environment, context };
}

function initAdapters(config: RuntimeConfig, adapters: Adapter[]): Promise<void> {
	const started = adapters.map(async function start(adapter) {
		if (!adapter.init) return;

		try {
			await adapter.init(config);
		} catch (thrown) {
			notifyError(config.environment, adapter.id, toError(thrown));
		}
	});

	return Promise.all(started).then(function done() {
		return undefined;
	});
}

function fromState<TEvents extends EventMap, TAdapters extends AdapterMap>(
	state: BuilderState,
): Builder<TEvents, TAdapters> {
	return {
		app: function app(name) {
			return fromState<TEvents, TAdapters>({ ...state, app: name });
		},
		environment: function environment(name) {
			return fromState<TEvents, TAdapters>({ ...state, environment: name });
		},
		context: function context(value) {
			return fromState<TEvents, TAdapters>({ ...state, context: [...state.context, value] });
		},
		use: function use<TId extends string, TProvider>(adapter: AdapterSource<TId, TProvider>) {
			return fromState<TEvents, TAdapters & Record<TId, TProvider>>({
				...state,
				adapters: [...state.adapters, adapter as AdapterSource],
			});
		},
		when: function when<TId extends string, TProvider>(
			condition: boolean | (() => boolean),
			adapter: AdapterSource<TId, TProvider>,
		) {
			const enabled = typeof condition === "function" ? condition() : condition;
			if (!enabled) return fromState<TEvents, TAdapters & Record<TId, TProvider>>(state);
			return fromState<TEvents, TAdapters & Record<TId, TProvider>>({
				...state,
				adapters: [...state.adapters, adapter as AdapterSource],
			});
		},
		pipe: function pipe(middleware: Middleware<TEvents>) {
			return fromState<TEvents, TAdapters>({
				...state,
				middleware: [...state.middleware, middleware as Middleware],
			});
		},
		build: function build(): Analytics<TEvents, TAdapters> {
			const config = resolveConfig(state);
			const adapters = resolveAdapters(state.adapters);

			const core: Core = {
				config,
				adapters,
				middleware: state.middleware,
				ready: initAdapters(config, adapters),
				disposed: false,
			};

			return createRuntime<TEvents, TAdapters>({ core, context: config.context, prefix: "" });
		},
	};
}

export function createAnalytics<TEvents extends EventMap = EventMap>(): Builder<TEvents, Empty> {
	return fromState<TEvents, Empty>({ context: [], adapters: [], middleware: [] });
}
