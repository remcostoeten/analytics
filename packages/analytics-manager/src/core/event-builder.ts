import type { Context, EventDraft, Properties, SendResult, Targets } from "../types";
import { merge } from "../utilities";
import { dispatch } from "./dispatch";
import { buildEvent, type RuntimeState } from "./event";

type DraftState = {
	name: string;
	properties: Properties;
	context: Context;
	targets: Targets;
};

function nextDraft<TProperties extends Properties>(
	runtime: RuntimeState,
	draft: DraftState,
): EventDraft<TProperties> {
	return {
		property: function property(key, value) {
			return nextDraft<TProperties>(runtime, {
				...draft,
				properties: merge(draft.properties, { [key]: value } as Properties),
			});
		},
		properties: function properties(values) {
			return nextDraft<TProperties>(runtime, {
				...draft,
				properties: merge(draft.properties, values as Properties),
			});
		},
		context: function context(values) {
			return nextDraft<TProperties>(runtime, {
				...draft,
				context: merge(draft.context, values),
			});
		},
		to: function to(...adapters) {
			return nextDraft<TProperties>(runtime, {
				...draft,
				targets: { ...draft.targets, only: adapters },
			});
		},
		except: function except(...adapters) {
			return nextDraft<TProperties>(runtime, {
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

export function createDraft<TProperties extends Properties>(
	runtime: RuntimeState,
	name: string,
): EventDraft<TProperties> {
	return nextDraft<TProperties>(runtime, {
		name,
		properties: {},
		context: {},
		targets: {},
	});
}
