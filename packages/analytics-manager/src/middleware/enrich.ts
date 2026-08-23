import type { ContextInput, EventMap, Middleware } from "../types";
import { merge, resolveContext } from "../utilities";

export function enrich<TEvents extends EventMap = EventMap>(
	input: ContextInput,
): Middleware<TEvents> {
	return function apply(event) {
		return { ...event, context: merge(event.context, resolveContext(input)) };
	};
}
