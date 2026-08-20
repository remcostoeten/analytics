import type { EventMap, Middleware, Value } from "../types";

type Source = Record<string, Value | undefined>;

function stripValue(value: Value, keys: string[]): Value {
	if (Array.isArray(value)) {
		return value.map(function item(entry) {
			return stripValue(entry, keys);
		});
	}

	if (value !== null && typeof value === "object") {
		return strip(value, keys) as Value;
	}

	return value;
}

function strip(source: Source, keys: string[]): Source {
	const result: Source = {};

	for (const key of Object.keys(source)) {
		if (keys.includes(key)) continue;
		const value = source[key];
		result[key] = value === undefined ? undefined : stripValue(value, keys);
	}

	return result;
}

export function redact<TEvents extends EventMap = EventMap>(
	...keys: string[]
): Middleware<TEvents> {
	return function apply(event) {
		return {
			...event,
			properties: strip(event.properties, keys),
			context: strip(event.context, keys),
		};
	};
}
