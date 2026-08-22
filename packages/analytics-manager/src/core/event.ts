import type { AnalyticsEvent, Context, EventKind, Properties } from "../types";
import { merge } from "../utilities";
import type { Core } from "./dispatch";

export type RuntimeState = {
	core: Core;
	context: Context;
	prefix: string;
};

export type EventExtras = {
	userId?: string;
	previousId?: string;
	groupType?: string;
	groupId?: string;
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
	extras: EventExtras = {},
): AnalyticsEvent {
	return {
		kind,
		name: kind === "track" ? scopedName(state.prefix, name) : name,
		properties,
		context: merge(state.context, context),
		...extras,
		timestamp: Date.now(),
	};
}
