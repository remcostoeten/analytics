import { describe, test, expect } from "bun:test";
import { createAnalytics } from "../src/core/create-analytics";
import { enrich, filter, redact, transform } from "../src/middleware";
import { fakeAdapter } from "./fake-adapter";

describe("middleware", () => {
	test("enrich adds context", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics()
			.pipe(enrich({ version: "1.0.0" }))
			.use(adapter)
			.build();

		await analytics.track("note.created");

		expect(adapter.events[0].context).toEqual({ version: "1.0.0" });
	});

	test("enrich accepts a resolver evaluated per event", async () => {
		const adapter = fakeAdapter("one");
		let counter = 0;
		const analytics = createAnalytics()
			.pipe(
				enrich(function resolver() {
					counter += 1;
					return { sequence: counter };
				}),
			)
			.use(adapter)
			.build();

		await analytics.track("a");
		await analytics.track("b");

		expect(adapter.events[0].context).toEqual({ sequence: 1 });
		expect(adapter.events[1].context).toEqual({ sequence: 2 });
	});

	test("redact removes keys from properties and context, including nested ones", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics().pipe(redact("email", "phone")).use(adapter).build();

		await analytics
			.event("user.updated")
			.properties({ email: "a@b.c", user: { email: "a@b.c", id: "u1" }, plan: "pro" })
			.context({ phone: "123", region: "eu" })
			.send();

		expect(adapter.events[0].properties).toEqual({ user: { id: "u1" }, plan: "pro" });
		expect(adapter.events[0].context).toEqual({ region: "eu" });
	});

	test("redact traverses objects nested inside arrays", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics().pipe(redact("email")).use(adapter).build();

		await analytics
			.event("team.synced")
			.properties({
				users: [
					{ email: "a@b.c", id: "u1" },
					{ email: "d@e.f", id: "u2" },
				],
				groups: [[{ email: "g@h.i", id: "u3" }]],
				tags: ["a", "b"],
				total: 3,
			})
			.send();

		expect(adapter.events[0].properties).toEqual({
			users: [{ id: "u1" }, { id: "u2" }],
			groups: [[{ id: "u3" }]],
			tags: ["a", "b"],
			total: 3,
		});
	});

	test("filter drops events and reports them as skipped", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics()
			.pipe(
				filter(function predicate(event) {
					return !event.name.startsWith("debug.");
				}),
			)
			.use(adapter)
			.build();

		const dropped = await analytics.track("debug.render");
		await analytics.track("note.created");

		expect(dropped).toEqual([{ adapter: "one", ok: true, skipped: true }]);
		expect(adapter.events.length).toBe(1);
		expect(adapter.events[0].name).toBe("note.created");
	});

	test("transform maps the event", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics()
			.pipe(
				transform(function mapper(event) {
					return { ...event, name: event.name.toLowerCase() };
				}),
			)
			.use(adapter)
			.build();

		await analytics.track("Note.Created");

		expect(adapter.events[0].name).toBe("note.created");
	});

	test("runs middleware in registration order", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics()
			.pipe(enrich({ stage: "first" }))
			.pipe(enrich({ stage: "second" }))
			.use(adapter)
			.build();

		await analytics.track("note.created");

		expect(adapter.events[0].context).toEqual({ stage: "second" });
	});

	test("applies middleware to page and identify events", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics().pipe(redact("email")).use(adapter).build();

		await analytics.page({ email: "a@b.c", section: "settings" });
		await analytics.identify("user-1", { email: "a@b.c", plan: "pro" });

		expect(adapter.events[0].properties).toEqual({ section: "settings" });
		expect(adapter.events[1].properties).toEqual({ plan: "pro" });
	});
});
