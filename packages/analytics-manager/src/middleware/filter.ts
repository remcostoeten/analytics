import type { AnalyticsEvent, EventMap, EventName, Middleware } from "../types";

export function filter<TEvents extends EventMap = EventMap>(
	predicate: (event: AnalyticsEvent<EventName<TEvents>>) => boolean,
): Middleware<TEvents> {
	return function apply(event) {
		if (predicate(event)) return event;
		return null;
	};
}
