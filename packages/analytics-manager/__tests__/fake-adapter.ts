import type { Adapter, AnalyticsEvent } from "../src/types";

export type FakeAdapter = Adapter & {
	events: AnalyticsEvent[];
	calls: string[];
};

export function fakeAdapter(id: string, overrides: Partial<Adapter> = {}): FakeAdapter {
	const events: AnalyticsEvent[] = [];
	const calls: string[] = [];

	return {
		id,
		events,
		calls,
		init: function init() {
			calls.push("init");
		},
		track: function track(event) {
			calls.push("track");
			events.push(event);
		},
		page: function page(event) {
			calls.push("page");
			events.push(event);
		},
		identify: function identify(event) {
			calls.push("identify");
			events.push(event);
		},
		reset: function reset() {
			calls.push("reset");
		},
		flush: function flush() {
			calls.push("flush");
		},
		destroy: function destroy() {
			calls.push("destroy");
		},
		expose: function expose() {
			return { id };
		},
		...overrides,
	};
}
