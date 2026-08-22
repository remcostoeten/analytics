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
	ErrorHandler,
	EventMap,
	Middleware,
	RuntimeConfig,
	Stage,
} from "../types";
import {
	createReporter,
	merge,
	resolveContext,
	TimeoutError,
	toError,
	withTimeout,
	type Reporter,
} from "../utilities";
import type { Core } from "./dispatch";
import { destroyAdapter } from "./dispatch";
import { createRuntime } from "./runtime";

const DEFAULT_TIMEOUT = 10_000;

type BuilderState = {
	app?: string;
	environment?: string;
	context: ContextInput[];
	adapters: AdapterSource[];
	middleware: Middleware[];
	onError?: ErrorHandler;
	timeout: number;
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

function resolveContextValue(state: BuilderState): Context {
	let context: Context = {};

	for (const input of state.context) {
		context = merge(context, resolveContext(input));
	}

	if (state.app !== undefined) context = merge(context, { app: state.app });
	if (state.environment !== undefined) {
		context = merge(context, { environment: state.environment });
	}

	return context;
}

function configFor(
	state: BuilderState,
	context: Context,
	report: Reporter,
	adapterId: string,
): RuntimeConfig {
	const config: RuntimeConfig = {
		app: state.app,
		environment: state.environment,
		context,
		report: (error: Error, stage: Stage) => {
			report(adapterId, stage, error);
		},
	};
	return config;
}

function initAdapters(state: BuilderState, context: Context, core: Core): Promise<void> {
	const started = core.adapters.map(async (adapter) => {
		if (!adapter.init) return;

		const config = configFor(state, context, core.report, adapter.id);
		const pending = new Promise<void>((resolve) => {
			resolve(adapter.init?.(config));
		});

		try {
			await withTimeout(
				pending,
				state.timeout,
				`[analytics-manager] adapter "${adapter.id}" did not initialize within ${state.timeout}ms`,
			);
		} catch (thrown) {
			core.failed.add(adapter.id);
			core.report(adapter.id, "init", toError(thrown));
			if (!(thrown instanceof TimeoutError)) return;
			core.late.add(adapter.id);
			pending.then(
				() => {
					core.late.delete(adapter.id);
					if (core.disposed) {
						void destroyAdapter(core, adapter);
						return;
					}
					core.failed.delete(adapter.id);
				},
				(reason: unknown) => {
					core.late.delete(adapter.id);
					core.report(adapter.id, "init", toError(reason));
				},
			);
		}
	});

	return Promise.all(started).then(() => undefined);
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
		onError: function onError(handler) {
			return fromState<TEvents, TAdapters>({ ...state, onError: handler });
		},
		timeout: function timeout(milliseconds) {
			return fromState<TEvents, TAdapters>({ ...state, timeout: milliseconds });
		},
		build: function build(): Analytics<TEvents, TAdapters> {
			const context = resolveContextValue(state);
			const adapters = resolveAdapters(state.adapters);
			const report = createReporter(state.environment, state.onError);
			const failed = new Set<string>();

			const core: Core = {
				adapters,
				middleware: state.middleware,
				report,
				failed,
				late: new Set<string>(),
				destroyed: new Set<string>(),
				ready: Promise.resolve(),
				disposed: false,
			};
			core.ready = initAdapters(state, context, core);

			return createRuntime<TEvents, TAdapters>({ core, context, prefix: "" });
		},
	};
}

export function createAnalytics<TEvents extends EventMap = EventMap>(): Builder<TEvents, Empty> {
	return fromState<TEvents, Empty>({
		context: [],
		adapters: [],
		middleware: [],
		timeout: DEFAULT_TIMEOUT,
	});
}
