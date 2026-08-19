import type { AnalyticsEvent, Context, EventKind, Properties } from "../types";
import { merge } from "../utilities";
import type { Core } from "./dispatch";

export type RuntimeState = {
	core: Core;
	context: Context;
	prefix: string;
};

export function scopedName(prefix: string, name: string): string {
	if (!prefix) return name;
	return `${prefix}.${name}`;
}

export function buildEvent(
	state: RuntimeState,
	kind: EventKind,
	name: string,
	properties: Properties,
	context: Context,
	userId?: string,
): AnalyticsEvent {
	return {
		kind,
		name: scopedName(state.prefix, name),
		properties,
		context: merge(state.context, context),
		userId,
		timestamp: Date.now(),
	};
}
