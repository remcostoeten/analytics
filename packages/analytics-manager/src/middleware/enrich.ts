import type { AnalyticsEvent, ContextInput, Middleware } from "../types";
import { merge, resolveContext } from "../utilities";

export function enrich(input: ContextInput): Middleware {
	return function apply(event: AnalyticsEvent): AnalyticsEvent {
		return { ...event, context: merge(event.context, resolveContext(input)) };
	};
}
