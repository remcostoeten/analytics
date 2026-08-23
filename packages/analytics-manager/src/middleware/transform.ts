import type { AnalyticsEvent, EventMap, EventName, Middleware } from "../types";

export function transform<TEvents extends EventMap = EventMap>(
	mapper: (event: AnalyticsEvent<EventName<TEvents>>) => AnalyticsEvent,
): Middleware<TEvents> {
	return function apply(event) {
		return mapper(event);
	};
}
