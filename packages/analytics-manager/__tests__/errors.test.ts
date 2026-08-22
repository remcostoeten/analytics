import { describe, test, expect } from "bun:test";
import { createAnalytics } from "../src/core/create-analytics";
import type { AdapterFailure } from "../src/types";
import { fakeAdapter } from "./fake-adapter";

describe("error handling", () => {
	test("routes adapter failures to onError with the stage", async () => {
		const failures: AdapterFailure[] = [];
		const broken = fakeAdapter("broken", {
			track: function track() {
				throw new Error("boom");
			},
		});
		const analytics = createAnalytics()
			.environment("production")
			.onError((failure) => {
				failures.push(failure);
			})
			.use(broken)
			.build();

		await analytics.track("note.created");

		expect(failures).toEqual([{ adapter: "broken", stage: "track", error: new Error("boom") }]);
	});

	test("marks an adapter as failed when init throws and skips it afterwards", async () => {
		const failures: AdapterFailure[] = [];
		const adapter = fakeAdapter("flaky", {
			init: function init() {
				throw new Error("no network");
			},
		});
		const analytics = createAnalytics()
			.onError((failure) => {
				failures.push(failure);
			})
			.use(adapter)
			.build();

		const results = await analytics.track("note.created");
		await analytics.flush();

		expect(results).toEqual([{ adapter: "flaky", ok: true, skipped: true }]);
		expect(failures.map((failure) => failure.stage)).toEqual(["init"]);
		expect(adapter.calls).toEqual([]);
	});

	test("still destroys adapters whose init failed", async () => {
		const adapter = fakeAdapter("flaky", {
			init: function init() {
				throw new Error("no network");
			},
		});
		const analytics = createAnalytics().environment("production").use(adapter).build();

		await analytics.destroy();

		expect(adapter.calls).toEqual(["destroy"]);
	});

	test("times out slow initialization instead of hanging", async () => {
		const failures: AdapterFailure[] = [];
		const adapter = fakeAdapter("stuck", {
			init: function init() {
				return new Promise<void>(() => {});
			},
		});
		const analytics = createAnalytics()
			.timeout(5)
			.onError((failure) => {
				failures.push(failure);
			})
			.use(adapter)
			.build();

		const results = await analytics.track("note.created");

		expect(results).toEqual([{ adapter: "stuck", ok: true, skipped: true }]);
		expect(failures[0]?.stage).toBe("init");
		expect(failures[0]?.error.message).toContain("did not initialize within 5ms");
	});

	test("lets adapters report through the runtime config", async () => {
		const failures: AdapterFailure[] = [];
		const adapter = fakeAdapter("custom", {
			init: function init(config) {
				config.report(new Error("degraded"), "init");
			},
		});
		const analytics = createAnalytics()
			.onError((failure) => {
				failures.push(failure);
			})
			.use(adapter)
			.build();

		await analytics.ready();

		expect(failures).toEqual([{ adapter: "custom", stage: "init", error: new Error("degraded") }]);
	});

	test("survives a throwing error handler", async () => {
		const broken = fakeAdapter("broken", {
			track: function track() {
				throw new Error("boom");
			},
		});
		const analytics = createAnalytics()
			.environment("production")
			.onError(() => {
				throw new Error("handler broke");
			})
			.use(broken)
			.build();

		const results = await analytics.track("note.created");

		expect(results[0]?.ok).toBe(false);
	});

	test("logs the original failure when the handler throws outside production", async () => {
		const logged: unknown[][] = [];
		const original = console.error;
		console.error = function capture(...args: unknown[]) {
			logged.push(args);
		};
		const broken = fakeAdapter("broken", {
			track: function track() {
				throw new Error("boom");
			},
		});
		const analytics = createAnalytics()
			.onError(() => {
				throw new Error("handler broke");
			})
			.use(broken)
			.build();

		try {
			await analytics.track("note.created");
		} finally {
			console.error = original;
		}

		expect(logged).toHaveLength(1);
		expect(logged[0]?.[1]).toEqual(new Error("boom"));
		expect(logged[0]?.[2]).toEqual(new Error("handler broke"));
	});

	test("stays silent in production when the handler throws", async () => {
		const logged: unknown[][] = [];
		const original = console.error;
		console.error = function capture(...args: unknown[]) {
			logged.push(args);
		};
		const broken = fakeAdapter("broken", {
			track: function track() {
				throw new Error("boom");
			},
		});
		const analytics = createAnalytics()
			.environment("production")
			.onError(() => {
				throw new Error("handler broke");
			})
			.use(broken)
			.build();

		try {
			await analytics.track("note.created");
		} finally {
			console.error = original;
		}

		expect(logged).toEqual([]);
	});

	test("reports a throwing middleware instead of rejecting", async () => {
		const failures: AdapterFailure[] = [];
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics()
			.pipe(() => {
				throw new Error("bad middleware");
			})
			.onError((failure) => {
				failures.push(failure);
			})
			.use(adapter)
			.build();

		const results = await analytics.track("note.created");

		expect(results).toEqual([{ adapter: "one", ok: false, error: new Error("bad middleware") }]);
		expect(failures).toEqual([
			{ adapter: "middleware", stage: "track", error: new Error("bad middleware") },
		]);
		expect(adapter.events).toEqual([]);
	});

	test("recovers an adapter whose init finishes after the timeout", async () => {
		let finish: () => void = function unset() {};
		const adapter = fakeAdapter("slow", {
			init: function init() {
				return new Promise<void>((resolve) => {
					finish = resolve;
				});
			},
		});
		const analytics = createAnalytics().timeout(5).environment("production").use(adapter).build();

		const during = await analytics.track("note.created");
		finish();
		await Promise.resolve();
		const after = await analytics.track("note.created");
		await analytics.reset();

		expect(during).toEqual([{ adapter: "slow", ok: true, skipped: true }]);
		expect(after).toEqual([{ adapter: "slow", ok: true }]);
		expect(adapter.calls).toEqual(["track", "reset"]);
	});

	test("tears down an adapter whose init finishes after destroy", async () => {
		let finish: () => void = () => {};
		const adapter = fakeAdapter("slow", {
			init: function init() {
				return new Promise<void>((resolve) => {
					finish = resolve;
				});
			},
		});
		const analytics = createAnalytics().timeout(5).environment("production").use(adapter).build();

		await analytics.ready();
		await analytics.destroy();
		finish();
		await Promise.resolve();
		await Promise.resolve();
		const after = await analytics.track("note.created");

		expect(after).toEqual([]);
		expect(adapter.calls).toEqual(["destroy"]);
	});

	test("reports the real error when init rejects after the timeout", async () => {
		const failures: AdapterFailure[] = [];
		let fail: (error: Error) => void = () => {};
		const adapter = fakeAdapter("slow", {
			init: function init() {
				return new Promise<void>((_resolve, reject) => {
					fail = reject;
				});
			},
		});
		const analytics = createAnalytics()
			.timeout(5)
			.environment("production")
			.onError((failure) => {
				failures.push(failure);
			})
			.use(adapter)
			.build();

		await analytics.ready();
		fail(new Error("401 invalid token"));
		await Promise.resolve();
		await Promise.resolve();

		expect(failures.map((failure) => failure.error.message)).toEqual([
			'[analytics-manager] adapter "slow" did not initialize within 5ms',
			"401 invalid token",
		]);
		expect(failures.every((failure) => failure.stage === "init")).toBe(true);
		expect(await analytics.track("note.created")).toEqual([
			{ adapter: "slow", ok: true, skipped: true },
		]);
	});

	test("reports inactive adapters as skipped when middleware throws", async () => {
		const adapter = fakeAdapter("off", {
			active: function active() {
				return false;
			},
		});
		const analytics = createAnalytics()
			.environment("production")
			.pipe(() => {
				throw new Error("bad middleware");
			})
			.use(adapter)
			.build();

		const results = await analytics.track("note.created");

		expect(results).toEqual([{ adapter: "off", ok: true, skipped: true }]);
	});

	test("reports adapters without a matching handler as skipped when middleware throws", async () => {
		const adapter = fakeAdapter("one");
		const analytics = createAnalytics()
			.environment("production")
			.pipe(() => {
				throw new Error("bad middleware");
			})
			.use(adapter)
			.build();

		const results = await analytics.alias("user-1");

		expect(results).toEqual([{ adapter: "one", ok: true, skipped: true }]);
	});

	test("waits for initialization before reporting middleware failures", async () => {
		const adapter = fakeAdapter("broken", {
			init: function init() {
				throw new Error("init failed");
			},
		});
		const analytics = createAnalytics()
			.environment("production")
			.pipe(() => {
				throw new Error("bad middleware");
			})
			.use(adapter)
			.build();

		const results = await analytics.track("note.created");

		expect(results).toEqual([{ adapter: "broken", ok: true, skipped: true }]);
	});

	test("skips reset and flush for inactive adapters", async () => {
		const adapter = fakeAdapter("off", {
			active: function active() {
				return false;
			},
		});
		const analytics = createAnalytics().use(adapter).build();

		await analytics.reset();
		await analytics.flush();
		await analytics.destroy();

		expect(adapter.calls).toEqual(["init", "destroy"]);
	});
});
