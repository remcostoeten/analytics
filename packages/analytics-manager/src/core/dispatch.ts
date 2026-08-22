import type { Adapter, AnalyticsEvent, EventKind, Middleware, SendResult, Targets } from "../types";
import type { Reporter } from "../utilities";
import { toError } from "../utilities";

export const MIDDLEWARE = "middleware";

export type Core = {
	adapters: Adapter[];
	middleware: Middleware[];
	report: Reporter;
	failed: Set<string>;
	late: Set<string>;
	destroyed: Set<string>;
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

	return adapters.filter((adapter) => {
		if (targets.only && !targets.only.includes(adapter.id)) return false;
		if (targets.except && targets.except.includes(adapter.id)) return false;
		return true;
	});
}

function resolveHandler(adapter: Adapter, kind: EventKind) {
	if (kind === "identify") return adapter.identify;
	if (kind === "group") return adapter.group;
	if (kind === "alias") return adapter.alias;
	if (kind === "page") return adapter.page;
	return adapter.track;
}

function skipped(adapter: Adapter): SendResult {
	return { adapter: adapter.id, ok: true, skipped: true };
}

function canRun(core: Core, adapter: Adapter): boolean {
	if (core.failed.has(adapter.id)) return false;
	if (adapter.active && !adapter.active()) return false;
	return true;
}

function canDeliver(core: Core, adapter: Adapter, kind: EventKind): boolean {
	return Boolean(resolveHandler(adapter, kind)) && canRun(core, adapter);
}

function runMiddleware(
	core: Core,
	event: AnalyticsEvent,
): { event: AnalyticsEvent | null; error?: Error } {
	try {
		return { event: applyMiddleware(core.middleware, event) };
	} catch (thrown) {
		const error = toError(thrown);
		core.report(MIDDLEWARE, event.kind, error);
		return { event: null, error };
	}
}

async function deliver(core: Core, adapter: Adapter, event: AnalyticsEvent): Promise<SendResult> {
	const handler = resolveHandler(adapter, event.kind);
	if (!handler) return skipped(adapter);
	if (!canRun(core, adapter)) return skipped(adapter);

	try {
		const outcome = await handler.call(adapter, event);
		if (outcome === false) return skipped(adapter);
		return { adapter: adapter.id, ok: true };
	} catch (thrown) {
		const error = toError(thrown);
		core.report(adapter.id, event.kind, error);
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

	await core.ready;
	if (core.disposed) return [];

	const processed = runMiddleware(core, event);
	if (processed.error) {
		const error = processed.error;
		return selected.map((adapter) =>
			canDeliver(core, adapter, event.kind)
				? { adapter: adapter.id, ok: false, error }
				: skipped(adapter),
		);
	}
	const prepared = processed.event;
	if (!prepared) return selected.map(skipped);

	return Promise.all(selected.map((adapter) => deliver(core, adapter, prepared)));
}

export async function destroyAdapter(core: Core, adapter: Adapter): Promise<void> {
	if (!adapter.destroy || core.destroyed.has(adapter.id)) return;
	core.destroyed.add(adapter.id);

	try {
		await adapter.destroy.call(adapter);
	} catch (thrown) {
		core.report(adapter.id, "destroy", toError(thrown));
	}
}

export async function runLifecycle(
	core: Core,
	method: "reset" | "flush" | "destroy",
): Promise<void> {
	if (method !== "destroy" && core.disposed) return;
	await core.ready;
	if (method !== "destroy" && core.disposed) return;

	await Promise.all(
		core.adapters.map(async (adapter) => {
			if (method === "destroy") {
				if (core.late.has(adapter.id)) return;
				await destroyAdapter(core, adapter);
				return;
			}

			const handler = adapter[method];
			if (!handler) return;
			if (!canRun(core, adapter)) return;

			try {
				await handler.call(adapter);
			} catch (thrown) {
				core.report(adapter.id, method, toError(thrown));
			}
		}),
	);
}
