import type { Adapter, AdapterBuilder, AnalyticsEvent } from "../types";

export type LoggerSink = (label: string, event: AnalyticsEvent) => void;

type LoggerState = {
	prefix: string;
	sink?: LoggerSink;
};

export type LoggerBuilder = AdapterBuilder<"logger", undefined> & {
	prefix: (value: string) => LoggerBuilder;
	sink: (sink: LoggerSink) => LoggerBuilder;
};

function describeEvent(event: AnalyticsEvent): string {
	if (event.kind === "identify") return `identify ${event.userId ?? "?"}`;
	if (event.kind === "alias") return `alias ${event.userId ?? "?"} <- ${event.previousId ?? "?"}`;
	if (event.kind === "group") return `group ${event.groupType ?? "?"}:${event.groupId ?? "?"}`;
	if (event.kind === "page") return "page";
	return event.name;
}

function consoleSink(label: string, event: AnalyticsEvent): void {
	if (typeof console === "undefined") return;
	console.log(label, { properties: event.properties, context: event.context });
}

function buildAdapter(state: LoggerState): Adapter<"logger", undefined> {
	const sink = state.sink ?? consoleSink;

	function emit(event: AnalyticsEvent): void {
		sink(`${state.prefix} ${describeEvent(event)}`, event);
	}

	return {
		id: "logger",
		track: emit,
		page: emit,
		identify: emit,
		group: emit,
		alias: emit,
	};
}

function fromState(state: LoggerState): LoggerBuilder {
	return {
		prefix: function prefix(value) {
			return fromState({ ...state, prefix: value });
		},
		sink: function sink(value) {
			return fromState({ ...state, sink: value });
		},
		build: function build() {
			return buildAdapter(state);
		},
	};
}

export function logger(): LoggerBuilder {
	return fromState({ prefix: "[analytics]" });
}
