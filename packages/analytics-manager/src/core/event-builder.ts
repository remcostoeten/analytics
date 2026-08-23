import type { AdapterMap, Context, EventDraft, Properties, SendResult, Targets } from "../types";
import { merge } from "../utilities";
import { dispatch } from "./dispatch";
import { buildEvent, type RuntimeState } from "./event";

type DraftState = {
	name: string;
	properties: Properties;
	context: Context;
	targets: Targets;
};

function nextDraft<TProperties extends Properties, TAdapters extends AdapterMap>(
	runtime: RuntimeState,
	draft: DraftState,
): EventDraft<TProperties, TAdapters> {
	return {
		property: function property(key, value) {
			return nextDraft<TProperties, TAdapters>(runtime, {
				...draft,
				properties: merge(draft.properties, { [key]: value } as Properties),
			});
		},
		properties: function properties(values) {
			return nextDraft<TProperties, TAdapters>(runtime, {
				...draft,
				properties: merge(draft.properties, values as Properties),
			});
		},
		context: function context(values) {
			return nextDraft<TProperties, TAdapters>(runtime, {
				...draft,
				context: merge(draft.context, values),
			});
		},
		to: function to(...adapters) {
			return nextDraft<TProperties, TAdapters>(runtime, {
				...draft,
				targets: { ...draft.targets, only: adapters },
			});
		},
		except: function except(...adapters) {
			return nextDraft<TProperties, TAdapters>(runtime, {
				...draft,
				targets: { ...draft.targets, except: adapters },
			});
		},
		send: function send(): Promise<SendResult[]> {
			const event = buildEvent(runtime, "track", draft.name, draft.properties, draft.context);
			return dispatch(runtime.core, event, draft.targets);
		},
	};
}

export function createDraft<TProperties extends Properties, TAdapters extends AdapterMap>(
	runtime: RuntimeState,
	name: string,
): EventDraft<TProperties, TAdapters> {
	return nextDraft<TProperties, TAdapters>(runtime, {
		name,
		properties: {},
		context: {},
		targets: {},
	});
}
