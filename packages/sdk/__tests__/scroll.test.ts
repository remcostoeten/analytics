import { describe, it, expect, spyOn, beforeEach, afterEach } from "bun:test";
import { observeScroll } from "../src/observers/scroll";
import * as trackModule from "../src/api/track";

describe("scroll tracking", () => {
	let trackSpy: any;

	let listeners: Record<string, Function[]> = {};

	beforeEach(() => {
		trackSpy = spyOn(trackModule, "track");
		listeners = {};

		// Mock global window/document
		(global as any).window = {
			addEventListener: (type: string, cb: Function) => {
				listeners[type] = listeners[type] || [];
				listeners[type].push(cb);
			},
			removeEventListener: (type: string, cb: Function) => {
				listeners[type] = (listeners[type] || []).filter((f) => f !== cb);
			},
			dispatchEvent: (event: Event) => {
				(listeners[event.type] || []).forEach((f) => f(event));
			},
			scrollY: 0,
			requestAnimationFrame: (cb: Function) => cb(),
			location: {
				pathname: "/test",
				hostname: "localhost",
				origin: "http://localhost:3000",
				host: "localhost:3000",
			},
			localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
			sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
			navigator: { sendBeacon: () => true, userAgent: "test", language: "en" },
		};

		(global as any).document = {
			documentElement: {
				scrollHeight: 2000,
				clientHeight: 1000,
				scrollTop: 0,
			},
			addEventListener: (type: string, cb: Function) => {
				listeners[type] = listeners[type] || [];
				listeners[type].push(cb);
			},
			removeEventListener: (type: string, cb: Function) => {
				listeners[type] = (listeners[type] || []).filter((f) => f !== cb);
			},
			referrer: "",
		};
		(global as any).navigator = (global as any).window.navigator;
		(global as any).localStorage = (global as any).window.localStorage;
		(global as any).sessionStorage = (global as any).window.sessionStorage;
		(global as any).Event = class {
			constructor(public type: string) {}
		};
		(global as any).Blob = class {
			constructor(public content: any[]) {}
		};
	});

	afterEach(() => {
		trackSpy.mockRestore();
	});

	it("captures max scroll depth and sends on beforeunload", () => {
		const cleanup = observeScroll();

		// Simulate scroll to 50%
		(global as any).window.scrollY = 500;
		(global as any).window.dispatchEvent(new (global as any).Event("scroll"));

		cleanup();

		expect(trackSpy).toHaveBeenCalled();
		expect(trackSpy.mock.calls[0][1]).toEqual(
			expect.objectContaining({
				eventName: "scroll",
				depth: 50,
			}),
		);
	});

	it("sends scroll data on cleanup (Fixed SPA navigation gap)", () => {
		const cleanup = observeScroll();
		(global as any).window.scrollY = 750;
		(global as any).window.dispatchEvent(new (global as any).Event("scroll"));

		cleanup();

		expect(trackSpy).toHaveBeenCalled();
		expect(trackSpy.mock.calls[0][1].depth).toBe(75);
	});
});
