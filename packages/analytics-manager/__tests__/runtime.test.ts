import { describe, test, expect } from "bun:test";
import { createAnalytics } from "../src/core/create-analytics";
import { fakeAdapter } from "./fake-adapter";

describe("runtime", () => {
	test("tracks an event with properties", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics().use(adapter).build();

		await analytics.track("note.created", { noteId: "n1" });

		expect(adapter.events[0].kind).toBe("track");
		expect(adapter.events[0].name).toBe("note.created");
		expect(adapter.events[0].properties).toEqual({ noteId: "n1" });
		expect(typeof adapter.events[0].timestamp).toBe("number");
	});

	test("reports per adapter results", async () => {
		const healthy = fakeAdapter("healthy");
		const broken = fakeAdapter("broken", {
			track: function track() {
				throw new Error("boom");
			},
		});
		const silent = fakeAdapter("silent", { track: undefined });

		const analytics = createAnalytics()
			.environment("production")
			.use(healthy)
			.use(broken)
			.use(silent)
			.build();
		const results = await analytics.track("note.created");

		expect(results).toEqual([
			{ adapter: "healthy", ok: true },
			{ adapter: "broken", ok: false, error: new Error("boom") },
			{ adapter: "silent", ok: true, skipped: true },
		]);
	});

	test("sends page events", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics().use(adapter).build();

		await analytics.page({ section: "settings" });

		expect(adapter.calls).toContain("page");
		expect(adapter.events[0].kind).toBe("page");
		expect(adapter.events[0].properties).toEqual({ section: "settings" });
	});

	test("skips page when an adapter has no page handler", async () => {
		const adapter = fakeAdapter("one", { page: undefined });
		const analytics = createAnalytics().use(adapter).build();

		const results = await analytics.page();

		expect(results).toEqual([{ adapter: "one", ok: true, skipped: true }]);
		expect(adapter.calls).toEqual(["init"]);
	});

	test("skips identify when an adapter cannot handle it", async () => {
		const adapter = fakeAdapter("one", { identify: undefined });
		const analytics = createAnalytics().use(adapter).build();

		const results = await analytics.identify("user-1", { plan: "pro" });

		expect(results).toEqual([{ adapter: "one", ok: true, skipped: true }]);
	});

	test("passes the user id and traits to identify", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics().use(adapter).build();

		await analytics.identify("user-1", { plan: "pro" });

		expect(adapter.events[0].userId).toBe("user-1");
		expect(adapter.events[0].properties).toEqual({ plan: "pro" });
	});

	test("with adds context without mutating the source instance", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics().context({ app: "skriuw" }).use(adapter).build();
		const scoped = analytics.with({ workspaceId: "w1" });

		await scoped.track("note.created");
		await analytics.track("note.created");

		expect(adapter.events[0].context).toEqual({ app: "skriuw", workspaceId: "w1" });
		expect(adapter.events[1].context).toEqual({ app: "skriuw" });
	});

	test("scope prefixes event names and nests", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics().use(adapter).build();

		await analytics.scope("editor").track("opened");
		await analytics.scope("editor").scope("toolbar").track("clicked");

		expect(adapter.events[0].name).toBe("editor.opened");
		expect(adapter.events[1].name).toBe("editor.toolbar.clicked");
	});

	test("scope leaves page and identify names untouched", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics().use(adapter).build();

		await analytics.scope("editor").page();
		await analytics.scope("editor").identify("user-1");

		expect(adapter.events.map((event) => event.name)).toEqual(["page", "identify"]);
	});

	test("exposes provider internals", () => {
		const analytics = createAnalytics().use(fakeAdapter("one")).build();

		expect(analytics.provider("one")).toEqual({ id: "one" });
		expect(analytics.provider("missing")).toBeUndefined();
	});

	test("forwards reset, flush and destroy to adapters", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics().use(adapter).build();

		await analytics.reset();
		await analytics.flush();
		await analytics.destroy();

		expect(adapter.calls).toEqual(["init", "reset", "flush", "destroy"]);
	});

	test("stops dispatching after destroy", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics().use(adapter).build();

		await analytics.destroy();
		const results = await analytics.track("note.created");

		expect(results).toEqual([]);
		expect(adapter.calls).not.toContain("track");
	});

	test("ignores reset and flush after destroy", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics().use(adapter).build();

		await analytics.destroy();
		await analytics.reset();
		await analytics.flush();
		await analytics.destroy();

		expect(adapter.calls).toEqual(["init", "destroy"]);
	});

	test("drops events dispatched while destroy is in progress", async () => {
		let finish: () => void = () => {};
		const adapter = fakeAdapter("one", {
			destroy: function destroy() {
				return new Promise<void>((resolve) => {
					finish = resolve;
				});
			},
		});
		const analytics = createAnalytics().use(adapter).build();
		await analytics.ready();

		const destroying = analytics.destroy();
		const results = await analytics.track("note.created");
		finish();
		await destroying;

		expect(results).toEqual([]);
		expect(adapter.calls).toEqual(["init"]);
	});

	test("waits for slow adapter initialization", async () => {
		const order: string[] = [];
		const adapter = fakeAdapter("slow", {
			init: async function init() {
				await new Promise((resolve) => {
					setTimeout(resolve, 10);
				});
				order.push("init");
			},
			track: function track() {
				order.push("track");
			},
		});

		const analytics = createAnalytics().use(adapter).build();
		await analytics.track("note.created");

		expect(order).toEqual(["init", "track"]);
	});
});
