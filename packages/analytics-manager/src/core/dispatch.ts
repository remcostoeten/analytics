import type {
	Adapter,
	AnalyticsEvent,
	EventKind,
	Middleware,
	RuntimeConfig,
	SendResult,
	Targets,
} from "../types";
import { notifyError, toError } from "../utilities";

export type Core = {
	config: RuntimeConfig;
	adapters: Adapter[];
	middleware: Middleware[];
	ready: Promise<void>;
	disposed: boolean;
};

export function applyMiddleware(
	middleware: Middleware[],
	event: AnalyticsEvent,
): AnalyticsEvent | null {
	let current: AnalyticsEvent | null = event;

	for (const step of middleware) {
		if (current === null) return null;
		current = step(current);
	}

	return current;
}

export function selectAdapters(adapters: Adapter[], targets: Targets | undefined): Adapter[] {
	if (!targets) return adapters;

	return adapters.filter(function matches(adapter) {
		if (targets.only && !targets.only.includes(adapter.id)) return false;
		if (targets.except && targets.except.includes(adapter.id)) return false;
		return true;
	});
}

function resolveHandler(adapter: Adapter, kind: EventKind) {
	if (kind === "identify") return adapter.identify;
	if (kind === "page") return adapter.page ?? adapter.track;
	return adapter.track;
}

async function deliver(core: Core, adapter: Adapter, event: AnalyticsEvent): Promise<SendResult> {
	const handler = resolveHandler(adapter, event.kind);
	if (!handler) return { adapter: adapter.id, ok: true, skipped: true };

	try {
		await handler.call(adapter, event);
		return { adapter: adapter.id, ok: true };
	} catch (thrown) {
		const error = toError(thrown);
		notifyError(core.config.environment, adapter.id, error);
		return { adapter: adapter.id, ok: false, error };
	}
}

export async function dispatch(
	core: Core,
	event: AnalyticsEvent,
	targets?: Targets,
): Promise<SendResult[]> {
	const selected = selectAdapters(core.adapters, targets);
	if (core.disposed || selected.length === 0) return [];

	const processed = applyMiddleware(core.middleware, event);
	if (!processed) {
		return selected.map(function skip(adapter) {
			return { adapter: adapter.id, ok: true, skipped: true };
		});
	}

	await core.ready;

	return Promise.all(
		selected.map(function send(adapter) {
			return deliver(core, adapter, processed);
		}),
	);
}

export async function runLifecycle(
	core: Core,
	method: "reset" | "flush" | "destroy",
): Promise<void> {
	await core.ready;

	await Promise.all(
		core.adapters.map(async function call(adapter) {
			const handler = adapter[method];
			if (!handler) return;

			try {
				await handler.call(adapter);
			} catch (thrown) {
				notifyError(core.config.environment, adapter.id, toError(thrown));
			}
		}),
	);
}
