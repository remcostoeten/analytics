import { describe, test, expect } from "bun:test";
import { createAnalytics } from "../src/core/create-analytics";
import { fakeAdapter } from "./fake-adapter";

describe("group and alias", () => {
	test("dispatches group events with type, id and traits", async () => {
		const adapter = fakeAdapter("one", {
			group: function group(event) {
				adapter.events.push(event);
			},
		});
		const analytics = createAnalytics().use(adapter).build();

		await analytics.group("company", "acme", { plan: "enterprise" });

		expect(adapter.events[0]?.kind).toBe("group");
		expect(adapter.events[0]?.groupType).toBe("company");
		expect(adapter.events[0]?.groupId).toBe("acme");
		expect(adapter.events[0]?.properties).toEqual({ plan: "enterprise" });
	});

	test("dispatches alias events with the previous id", async () => {
		const adapter = fakeAdapter("one", {
			alias: function alias(event) {
				adapter.events.push(event);
			},
		});
		const analytics = createAnalytics().use(adapter).build();

		await analytics.alias("user-1", "anon-9");

		expect(adapter.events[0]?.kind).toBe("alias");
		expect(adapter.events[0]?.userId).toBe("user-1");
		expect(adapter.events[0]?.previousId).toBe("anon-9");
	});

	test("skips adapters without group or alias support", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics().use(adapter).build();

		expect(await analytics.group("company", "acme")).toEqual([
			{ adapter: "one", ok: true, skipped: true },
		]);
		expect(await analytics.alias("user-1")).toEqual([{ adapter: "one", ok: true, skipped: true }]);
	});

	test("runs group and alias through middleware", async () => {
		const seen: string[] = [];
		const adapter = fakeAdapter("one", {
			group: function group() {},
			alias: function alias() {},
		});
		const analytics = createAnalytics()
			.pipe((event) => {
				seen.push(event.name);
				return event;
			})
			.use(adapter)
			.build();

		await analytics.group("company", "acme");
		await analytics.alias("user-1");

		expect(seen).toEqual(["group", "alias"]);
	});
});
