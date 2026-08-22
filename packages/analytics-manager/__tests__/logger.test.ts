import { describe, test, expect } from "bun:test";
import { createAnalytics } from "../src/core/create-analytics";
import { logger } from "../src/adapters";

describe("logger adapter", () => {
	test("labels every event kind and forwards it to the sink", async () => {
		const labels: string[] = [];
		const analytics = createAnalytics()
			.use(
				logger()
					.prefix("[test]")
					.sink((label) => {
						labels.push(label);
					}),
			)
			.build();

		await analytics.track("note.created", { noteId: "n1" });
		await analytics.page();
		await analytics.identify("user-1");
		await analytics.group("company", "acme");
		await analytics.alias("user-1", "anon-9");

		expect(labels).toEqual([
			"[test] note.created",
			"[test] page",
			"[test] identify user-1",
			"[test] group company:acme",
			"[test] alias user-1 <- anon-9",
		]);
	});

	test("registers under the logger id so it can be targeted", async () => {
		const labels: string[] = [];
		const analytics = createAnalytics()
			.use(
				logger().sink((label) => {
					labels.push(label);
				}),
			)
			.build();

		await analytics.event("note.created").except("logger").send();
		await analytics.event("note.created").to("logger").send();

		expect(labels).toEqual(["[analytics] note.created"]);
	});
});
