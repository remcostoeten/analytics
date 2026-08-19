import type {
	Analytics,
	Context,
	EventMap,
	Properties,
	ScopedEvents,
	SendResult,
	Traits,
} from "../types";
import { merge } from "../utilities";
import { dispatch, runLifecycle } from "./dispatch";
import { createDraft } from "./event-builder";
import { buildEvent, scopedName, type RuntimeState } from "./event";

export function createRuntime<TEvents extends EventMap>(state: RuntimeState): Analytics<TEvents> {
	return {
		track: function track(name, properties): Promise<SendResult[]> {
			const event = buildEvent(state, "track", name, (properties ?? {}) as Properties, {});
			return dispatch(state.core, event);
		},
		event: function event(name) {
			return createDraft(state, name);
		},
		page: function page(properties): Promise<SendResult[]> {
			const event = buildEvent(state, "page", "page", properties ?? {}, {});
			return dispatch(state.core, event);
		},
		identify: function identify(userId, traits): Promise<SendResult[]> {
			const event = buildEvent(state, "identify", "identify", (traits ?? {}) as Traits, {}, userId);
			return dispatch(state.core, event);
		},
		reset: function reset(): Promise<void> {
			return runLifecycle(state.core, "reset");
		},
		with: function withContext(context: Context): Analytics<TEvents> {
			return createRuntime<TEvents>({ ...state, context: merge(state.context, context) });
		},
		scope: function scope(name) {
			return createRuntime<ScopedEvents<TEvents, typeof name>>({
				...state,
				prefix: scopedName(state.prefix, name),
			});
		},
		provider: function provider<TProvider>(id: string): TProvider | undefined {
			const adapter = state.core.adapters.find(function byId(candidate) {
				return candidate.id === id;
			});
			if (!adapter || !adapter.expose) return undefined;
			return adapter.expose() as TProvider;
		},
		flush: function flush(): Promise<void> {
			return runLifecycle(state.core, "flush");
		},
		destroy: async function destroy(): Promise<void> {
			await runLifecycle(state.core, "destroy");
			state.core.disposed = true;
		},
	};
}
