import { describe, test, expect } from "bun:test";
import { renderToString } from "react-dom/server";
import { createAnalytics } from "../src/core/create-analytics";
import { posthog } from "../src/adapters";
import type { PosthogClient, PosthogProvider } from "../src/adapters";
import { AnalyticsProvider, useAnalytics } from "../src/react";
import { fakeAdapter } from "./fake-adapter";

type Events = { "note.created": { noteId: string } };

describe("react bindings", () => {
	test("provides the instance through context", () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics<Events>().use(adapter).build();

		function Consumer() {
			const instance = useAnalytics<Events>();
			instance.track("note.created", { noteId: "n1" });
			return <span>ok</span>;
		}

		const html = renderToString(
			<AnalyticsProvider analytics={analytics}>
				<Consumer />
			</AnalyticsProvider>,
		);

		expect(html).toContain("ok");
	});

	test("accepts a fully typed instance", () => {
		const client = {
			init() {},
			capture() {},
			identify() {},
			reset() {},
		} as unknown as PosthogClient;
		const analytics = createAnalytics<Events>()
			.use(posthog().token("phc_x").client(client))
			.build();

		function Consumer() {
			const instance = useAnalytics<Events, { posthog: PosthogProvider }>();
			return <span>{String(instance.provider("posthog")?.client === client)}</span>;
		}

		const html = renderToString(
			<AnalyticsProvider analytics={analytics}>
				<Consumer />
			</AnalyticsProvider>,
		);

		expect(html).toContain("true");
	});

	test("throws outside the provider", () => {
		function Consumer() {
			useAnalytics();
			return null;
		}

		expect(() => {
			renderToString(<Consumer />);
		}).toThrow("useAnalytics must be used inside <AnalyticsProvider>");
	});
});
