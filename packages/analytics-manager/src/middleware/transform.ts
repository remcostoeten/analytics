import type { AnalyticsEvent, Middleware } from "../types";

export function transform(mapper: (event: AnalyticsEvent) => AnalyticsEvent): Middleware {
	return function apply(event: AnalyticsEvent): AnalyticsEvent {
		return mapper(event);
	};
}
