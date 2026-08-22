import { describe, test, expect } from "bun:test";
import { createAnalytics } from "../src/core/create-analytics";
import { fakeAdapter } from "./fake-adapter";

describe("event builder", () => {
	test("collects properties and context separately", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics().use(adapter).build();

		await analytics
			.event("checkout.completed")
			.property("orderId", "o1")
			.properties({ revenue: 49, currency: "EUR" })
			.context({ experiment: "checkout-v2" })
			.send();

		expect(adapter.events[0].properties).toEqual({
			orderId: "o1",
			revenue: 49,
			currency: "EUR",
		});
		expect(adapter.events[0].context).toEqual({ experiment: "checkout-v2" });
	});

	test("does not dispatch until send is called", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics().use(adapter).build();

		analytics.event("checkout.completed").property("orderId", "o1");

		expect(adapter.events).toEqual([]);
	});

	test("keeps drafts independent", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics().use(adapter).build();
		const base = analytics.event("checkout.completed").property("orderId", "o1");

		await base.property("revenue", 49).send();
		await base.send();

		expect(adapter.events[0].properties).toEqual({ orderId: "o1", revenue: 49 });
		expect(adapter.events[1].properties).toEqual({ orderId: "o1" });
	});

	test("routes to selected adapters", async () => {
		const one = fakeAdapter("one");
		const two = fakeAdapter("two");
		const three = fakeAdapter("three");
		const analytics = createAnalytics().use(one).use(two).use(three).build();

		const results = await analytics.event("checkout.completed").to("one", "two").send();

		expect(
			results.map((result) => {
				return result.adapter;
			}),
		).toEqual(["one", "two"]);
		expect(three.calls).not.toContain("track");
	});

	test("excludes selected adapters", async () => {
		const one = fakeAdapter("one");
		const two = fakeAdapter("two");
		const analytics = createAnalytics().use(one).use(two).build();

		await analytics.event("checkout.completed").except("two").send();

		expect(one.calls).toContain("track");
		expect(two.calls).not.toContain("track");
	});

	test("applies scope and instance context to drafts", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics().use(adapter).build();

		await analytics.scope("editor").with({ workspaceId: "w1" }).event("opened").send();

		expect(adapter.events[0].name).toBe("editor.opened");
		expect(adapter.events[0].context).toEqual({ workspaceId: "w1" });
	});
});
