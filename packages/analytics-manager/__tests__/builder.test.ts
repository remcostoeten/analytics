import { describe, test, expect } from "bun:test";
import { createAnalytics } from "../src/core/create-analytics";
import { fakeAdapter } from "./fake-adapter";

describe("builder", () => {
	test("returns a new builder on every call", () => {
		const base = createAnalytics();
		const next = base.app("skriuw");

		expect(next).not.toBe(base);
	});

	test("does not leak adapters between branches", async () => {
		const base = createAnalytics();
		const withAdapter = fakeAdapter("one");
		base.use(withAdapter);

		const analytics = base.build();
		await analytics.track("noop");

		expect(withAdapter.calls).toEqual([]);
	});

	test("merges app and environment into context", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics()
			.app("skriuw")
			.environment("production")
			.use(adapter)
			.build();

		await analytics.track("note.created");

		expect(adapter.events[0].context).toEqual({ app: "skriuw", environment: "production" });
	});

	test("ignores undefined app and environment", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics().app(undefined).environment(undefined).use(adapter).build();

		await analytics.track("note.created");

		expect(adapter.events[0].context).toEqual({});
	});

	test("merges context calls in order", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics()
			.context({ version: "1.0.0" })
			.context(() => {
				return { version: "2.0.0", region: "eu" };
			})
			.use(adapter)
			.build();

		await analytics.track("note.created");

		expect(adapter.events[0].context).toEqual({ version: "2.0.0", region: "eu" });
	});

	test("when skips the adapter on a false condition", async () => {
		const enabled = fakeAdapter("enabled");
		const disabled = fakeAdapter("disabled");
		const analytics = createAnalytics()
			.when(true, enabled)
			.when(() => {
				return false;
			}, disabled)
			.build();

		await analytics.track("note.created");

		expect(enabled.calls).toContain("track");
		expect(disabled.calls).toEqual([]);
	});

	test("accepts adapter builders", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics()
			.use({
				build: function build() {
					return adapter;
				},
			})
			.build();

		await analytics.track("note.created");

		expect(adapter.calls).toContain("track");
	});

	test("rejects duplicate adapter ids", () => {
		const builder = createAnalytics().use(fakeAdapter("one")).use(fakeAdapter("one"));

		expect(() => {
			builder.build();
		}).toThrow('duplicate adapter id "one"');
	});

	test("initializes adapters once before the first event", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics().use(adapter).build();

		await analytics.track("a");
		await analytics.track("b");

		expect(adapter.calls).toEqual(["init", "track", "track"]);
	});
});
