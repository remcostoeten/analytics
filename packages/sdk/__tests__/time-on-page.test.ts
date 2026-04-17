import { describe, it, expect, spyOn, beforeEach, afterEach, setSystemTime } from "bun:test";
import { observeTimeOnPage } from "../src/observers/heartbeat";
import * as trackModule from "../src/api/track";

describe("time-on-page tracking", () => {
	let trackSpy: any;
	let listeners: Record<string, Function[]> = {};

	beforeEach(() => {
		setSystemTime(new Date("2024-01-01T12:00:00Z"));
		trackSpy = spyOn(trackModule, "track");
		listeners = {};

		(global as any).window = {
			addEventListener: (type: string, cb: Function) => {
				listeners[type] = listeners[type] || [];
				listeners[type].push(cb);
			},
			removeEventListener: (type: string, cb: Function) => {
				listeners[type] = (listeners[type] || []).filter((f) => f !== cb);
			},
			location: { pathname: "/test", hostname: "localhost" },
			localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
			sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
			navigator: { sendBeacon: () => true, userAgent: "test", language: "en" },
		};

		(global as any).document = {
			visibilityState: "visible",
			addEventListener: (type: string, cb: Function) => {
				listeners[type] = listeners[type] || [];
				listeners[type].push(cb);
			},
			removeEventListener: (type: string, cb: Function) => {
				listeners[type] = (listeners[type] || []).filter((f) => f !== cb);
			},
		};
		(global as any).navigator = (global as any).window.navigator;
		(global as any).localStorage = (global as any).window.localStorage;
		(global as any).sessionStorage = (global as any).window.sessionStorage;
		(global as any).Blob = class {
			constructor(public content: any[]) {}
		};
	});

	afterEach(() => {
		trackSpy.mockRestore();
		setSystemTime();
	});

	it("tracks accumulated time correctly when tab is hidden and restored", () => {
		const cleanup = observeTimeOnPage();

		// Pass 10 seconds
		setSystemTime(new Date("2024-01-01T12:00:10Z"));

		// Hide tab
		(global as any).document.visibilityState = "hidden";
		(listeners["visibilitychange"] || []).forEach((f) => f());

		// Pass 20 more seconds while hidden (should not count)
		setSystemTime(new Date("2024-01-01T12:00:30Z"));

		// Show tab again
		(global as any).document.visibilityState = "visible";
		(listeners["visibilitychange"] || []).forEach((f) => f());

		// Pass 5 more seconds while visible
		setSystemTime(new Date("2024-01-01T12:00:35Z"));

		cleanup();

		expect(trackSpy).toHaveBeenCalled();
		const call = trackSpy.mock.calls[0];
		expect(call[1].eventName).toBe("time-on-page");
		// Total should be 10s (first visible) + 5s (second visible) = 15000ms
		expect(call[1].timeOnPageMs).toBe(15000);
	});

	it("sends data on cleanup for SPA navigations", () => {
		const cleanup = observeTimeOnPage();
		setSystemTime(new Date("2024-01-01T12:00:05Z"));

		cleanup();

		expect(trackSpy).toHaveBeenCalled();
		expect(trackSpy.mock.calls[0][1].timeOnPageMs).toBe(5000);
	});
});
