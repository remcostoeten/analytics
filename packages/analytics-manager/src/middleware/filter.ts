import type { AnalyticsEvent, Middleware } from "../types";

export function filter(predicate: (event: AnalyticsEvent) => boolean): Middleware {
	return function apply(event: AnalyticsEvent): AnalyticsEvent | null {
		if (predicate(event)) return event;
		return null;
	};
}
