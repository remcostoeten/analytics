import type {
	AdapterId,
	AdapterMap,
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

export function createRuntime<TEvents extends EventMap, TAdapters extends AdapterMap>(
	state: RuntimeState,
): Analytics<TEvents, TAdapters> {
	return {
		track: function track(name, ...args): Promise<SendResult[]> {
			const properties = (args[0] ?? {}) as Properties;
			const event = buildEvent(state, "track", name, properties, {});
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
			const event = buildEvent(
				state,
				"identify",
				"identify",
				(traits ?? {}) as Traits,
				{},
				{
					userId,
				},
			);
			return dispatch(state.core, event);
		},
		group: function group(groupType, groupId, traits): Promise<SendResult[]> {
			const event = buildEvent(
				state,
				"group",
				"group",
				(traits ?? {}) as Traits,
				{},
				{
					groupType,
					groupId,
				},
			);
			return dispatch(state.core, event);
		},
		alias: function alias(userId, previousId): Promise<SendResult[]> {
			const event = buildEvent(state, "alias", "alias", {}, {}, { userId, previousId });
			return dispatch(state.core, event);
		},
		reset: function reset(): Promise<void> {
			return runLifecycle(state.core, "reset");
		},
		with: function withContext(context: Context): Analytics<TEvents, TAdapters> {
			return createRuntime<TEvents, TAdapters>({
				...state,
				context: merge(state.context, context),
			});
		},
		scope: function scope(name) {
			return createRuntime<ScopedEvents<TEvents, typeof name>, TAdapters>({
				...state,
				prefix: scopedName(state.prefix, name),
			});
		},
		provider: function provider<TId extends AdapterId<TAdapters>>(id: TId) {
			const adapter = state.core.adapters.find((candidate) => candidate.id === id);
			if (!adapter || !adapter.expose) return undefined;
			return adapter.expose() as TAdapters[TId] | undefined;
		},
		ready: function ready(): Promise<void> {
			return state.core.ready;
		},
		flush: function flush(): Promise<void> {
			return runLifecycle(state.core, "flush");
		},
		destroy: function destroy(): Promise<void> {
			if (state.core.disposed) return Promise.resolve();
			state.core.disposed = true;
			return runLifecycle(state.core, "destroy");
		},
	};
}
