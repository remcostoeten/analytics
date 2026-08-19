import type { AnalyticsEvent, Middleware, Value } from "../types";

function strip(
	source: Record<string, Value | undefined>,
	keys: string[],
): Record<string, Value | undefined> {
	const result: Record<string, Value | undefined> = {};

	for (const key of Object.keys(source)) {
		if (keys.includes(key)) continue;
		const value = source[key];
		if (value !== null && typeof value === "object" && !Array.isArray(value)) {
			result[key] = strip(value, keys) as Value;
			continue;
		}
		result[key] = value;
	}

	return result;
}

export function redact(...keys: string[]): Middleware {
	return function apply(event: AnalyticsEvent): AnalyticsEvent {
		return {
			...event,
			properties: strip(event.properties, keys),
			context: strip(event.context, keys),
		};
	};
}
