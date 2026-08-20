import { describe, test, expect } from "bun:test";
import { createAnalytics } from "../src/core/create-analytics";
import { posthog, remco, vercel } from "../src/adapters";
import type { PosthogClient, PosthogProvider, RemcoClient, VercelClient } from "../src/adapters";

type Call = { method: string; args: unknown[] };

function recorder(): { calls: Call[]; record: (method: string) => (...args: unknown[]) => void } {
	const calls: Call[] = [];

	function record(method: string) {
		return function call(...args: unknown[]) {
			calls.push({ method, args });
		};
	}

	return { calls, record };
}

function remcoClient(): { calls: Call[]; client: RemcoClient } {
	const { calls, record } = recorder();
	const stops = record("stop");

	return {
		calls,
		client: {
			track: record("track") as RemcoClient["track"],
			trackEvent: record("trackEvent") as RemcoClient["trackEvent"],
			trackPageView: record("trackPageView") as RemcoClient["trackPageView"],
			identify: record("identify") as RemcoClient["identify"],
			resetVisitorId: function resetVisitorId() {
				calls.push({ method: "resetVisitorId", args: [] });
				return "v";
			},
			resetSessionId: function resetSessionId() {
				calls.push({ method: "resetSessionId", args: [] });
				return "s";
			},
			flushOfflineQueue: record("flushOfflineQueue") as RemcoClient["flushOfflineQueue"],
			observeErrors: function observeErrors(options) {
				calls.push({ method: "observeErrors", args: [options] });
				return stops;
			},
			observeClicks: function observeClicks(options) {
				calls.push({ method: "observeClicks", args: [options] });
				return stops;
			},
		},
	};
}

describe("remco adapter", () => {
	test("maps events onto the sdk surface", async () => {
		const { calls, client } = remcoClient();
		const analytics = createAnalytics()
			.app("skriuw")
			.use(remco().project("skriuw").client(client))
			.build();

		await analytics.track("note.created", { noteId: "n1" });
		await analytics.page({ section: "settings" });
		await analytics.identify("user-1", { plan: "pro", nested: { skip: true } });

		const names = calls.map(function method(call) {
			return call.method;
		});

		expect(names).toEqual(["trackEvent", "trackPageView", "identify"]);
		expect(calls[0].args[0]).toBe("note.created");
		expect(calls[0].args[1]).toEqual({ app: "skriuw", noteId: "n1" });
		expect(calls[2].args[0]).toBe("user-1");
		expect(calls[2].args[1]).toEqual({ plan: "pro" });
	});

	test("starts requested observers and stops them on destroy", async () => {
		const { calls, client } = remcoClient();
		const analytics = createAnalytics()
			.app("skriuw")
			.use(remco().client(client).errors().clicks().errors())
			.build();

		await analytics.flush();
		const started = calls.filter(function observers(call) {
			return call.method.startsWith("observe");
		});

		expect(
			started.map(function method(call) {
				return call.method;
			}),
		).toEqual(["observeErrors", "observeClicks"]);
		expect(started[0].args[0]).toEqual({ projectId: "skriuw" });

		await analytics.destroy();

		expect(
			calls.filter(function stopped(call) {
				return call.method === "stop";
			}).length,
		).toBe(2);
	});

	test("resets visitor and session identity", async () => {
		const { calls, client } = remcoClient();
		const analytics = createAnalytics().use(remco().client(client)).build();

		await analytics.reset();

		expect(
			calls.map(function method(call) {
				return call.method;
			}),
		).toEqual(["resetVisitorId", "resetSessionId"]);
	});
});

describe("posthog adapter", () => {
	function posthogClient(): { calls: Call[]; client: PosthogClient } {
		const { calls, record } = recorder();

		return {
			calls,
			client: {
				init: record("init") as PosthogClient["init"],
				capture: record("capture") as PosthogClient["capture"],
				identify: record("identify") as PosthogClient["identify"],
				reset: record("reset") as PosthogClient["reset"],
				register: record("register") as PosthogClient["register"],
				isFeatureEnabled: function isFeatureEnabled(flag) {
					return flag === "new-editor";
				},
				startSessionRecording: record("startSessionRecording") as () => void,
			},
		};
	}

	test("initializes with the configured options", async () => {
		const { calls, client } = posthogClient();
		const analytics = createAnalytics()
			.app("skriuw")
			.environment("production")
			.use(
				posthog()
					.token("phc_x")
					.host("https://eu.i.posthog.com")
					.autocapture()
					.sessionReplay()
					.client(client),
			)
			.build();

		await analytics.flush();

		expect(calls[0]).toEqual({
			method: "init",
			args: [
				"phc_x",
				{
					api_host: "https://eu.i.posthog.com",
					capture_pageview: false,
					autocapture: true,
					disable_session_recording: false,
				},
			],
		});
		expect(calls[1]).toEqual({
			method: "register",
			args: [{ app: "skriuw", environment: "production" }],
		});
	});

	test("captures events and pageviews", async () => {
		const { calls, client } = posthogClient();
		const analytics = createAnalytics().use(posthog().token("phc_x").client(client)).build();

		await analytics.track("note.created", { noteId: "n1" });
		await analytics.page({ section: "settings" });

		const captures = calls.filter(function captured(call) {
			return call.method === "capture";
		});

		expect(captures[0].args).toEqual(["note.created", { noteId: "n1" }]);
		expect(captures[1].args).toEqual(["$pageview", { section: "settings" }]);
	});

	test("exposes feature flags and replay controls", async () => {
		const { calls, client } = posthogClient();
		const analytics = createAnalytics().use(posthog().token("phc_x").client(client)).build();
		const provider = analytics.provider<PosthogProvider>("posthog");

		expect(provider?.featureFlags.isEnabled("new-editor")).toBe(true);
		expect(provider?.featureFlags.isEnabled("old-editor")).toBe(false);

		provider?.replay.start();

		expect(
			calls.some(function started(call) {
				return call.method === "startSessionRecording";
			}),
		).toBe(true);
	});

	test("skips initialization without a token", async () => {
		const { calls, client } = posthogClient();
		const analytics = createAnalytics().use(posthog().client(client)).build();

		await analytics.flush();

		expect(calls).toEqual([]);
	});
});

describe("inactive adapters", () => {
	test("reports skipped rather than ok when the provider sdk is unavailable", async () => {
		const analytics = createAnalytics()
			.environment("production")
			.use(remco().project("demo"))
			.build();

		const results = await analytics.track("note.created", { noteId: "n1" });

		expect(results).toEqual([{ adapter: "remco", ok: true, skipped: true }]);
	});

	test("reports skipped when posthog has a client but no token", async () => {
		const { calls, record } = recorder();
		const client = {
			init: record("init"),
			capture: record("capture"),
			identify: record("identify"),
			reset: record("reset"),
		} as unknown as PosthogClient;

		const analytics = createAnalytics()
			.environment("production")
			.use(posthog().client(client))
			.build();

		const results = await analytics.track("note.created");

		expect(results).toEqual([{ adapter: "posthog", ok: true, skipped: true }]);
		expect(calls).toEqual([]);
	});
});

describe("vercel adapter", () => {
	test("flattens non primitive properties", async () => {
		const { calls, record } = recorder();
		const client: VercelClient = { track: record("track") as VercelClient["track"] };
		const analytics = createAnalytics().use(vercel().client(client)).build();

		await analytics.track("checkout.completed", { revenue: 49, items: ["a", "b"] });

		expect(calls[0].args).toEqual(["checkout.completed", { revenue: 49, items: '["a","b"]' }]);
	});

	test("skips identify because vercel analytics cannot represent it", async () => {
		const { calls, record } = recorder();
		const client: VercelClient = { track: record("track") as VercelClient["track"] };
		const analytics = createAnalytics().use(vercel().client(client)).build();

		const results = await analytics.identify("user-1");

		expect(results).toEqual([{ adapter: "vercel", ok: true, skipped: true }]);
		expect(calls).toEqual([]);
	});
});
