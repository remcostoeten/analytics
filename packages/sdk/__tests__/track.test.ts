import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { track, trackPageView, trackEvent, trackClick, trackError } from "../src/api/track";
import { observePageViews } from "../src/observers/pageview";

describe("track", () => {
	let originalLocalStorage: Storage | undefined;
	let originalSessionStorage: Storage | undefined;
	let originalNavigator: Navigator;
	let originalWindow: Window & typeof globalThis;
	let beaconMock: ReturnType<typeof mock>;
	let fetchMock: ReturnType<typeof mock>;

	beforeEach(() => {
		process.env.NEXT_PUBLIC_ANALYTICS_URL = "https://test-ingest.example.com";
		originalLocalStorage = global.localStorage;
		originalSessionStorage = global.sessionStorage;
		originalNavigator = global.navigator;
		originalWindow = global.window;

		const localStore: Record<string, string> = {};
		global.localStorage = {
			getItem: (key: string) => localStore[key] || null,
			setItem: (key: string, value: string) => {
				localStore[key] = value;
			},
			removeItem: (key: string) => {
				delete localStore[key];
			},
			clear: () => {
				Object.keys(localStore).forEach((key) => delete localStore[key]);
			},
			length: Object.keys(localStore).length,
			key: (index: number) => Object.keys(localStore)[index] || null,
		} as Storage;

		const sessionStore: Record<string, string> = {};
		global.sessionStorage = {
			getItem: (key: string) => sessionStore[key] || null,
			setItem: (key: string, value: string) => {
				sessionStore[key] = value;
			},
			removeItem: (key: string) => {
				delete sessionStore[key];
			},
			clear: () => {
				Object.keys(sessionStore).forEach((key) => delete sessionStore[key]);
			},
			length: Object.keys(sessionStore).length,
			key: (index: number) => Object.keys(sessionStore)[index] || null,
		} as Storage;

		beaconMock = mock(() => true);
		fetchMock = mock(() => Promise.resolve({ ok: true } as Response));

		(global as any).navigator = {
			...originalNavigator,
			sendBeacon: beaconMock,
			userAgent: "Mozilla/5.0 (Test)",
			language: "en-US",
			doNotTrack: null,
		};

		(global as any).fetch = fetchMock;

		(global as any).window = {
			location: {
				pathname: "/test",
				hostname: "localhost",
				origin: "http://localhost:3000",
				host: "localhost:3000",
			},
		};

		(global as any).document = {
			referrer: "https://example.com",
		};

		(global as any).Blob = class Blob {
			constructor(
				public content: any[],
				public options: any,
			) {}
		};
	});

	afterEach(() => {
		delete process.env.NEXT_PUBLIC_ANALYTICS_URL;
		if (originalLocalStorage) {
			global.localStorage = originalLocalStorage;
		}
		if (originalSessionStorage) {
			global.sessionStorage = originalSessionStorage;
		}
		(global as any).navigator = originalNavigator;
		(global as any).window = originalWindow;
	});

	test("creates valid event payload", () => {
		track("pageview");
		expect(beaconMock).toHaveBeenCalled();
		const callArgs = beaconMock.mock.calls[0];
		expect(callArgs[0]).toContain("/e");
	});

	test("includes all required fields in payload", () => {
		track("pageview");
		const blob = beaconMock.mock.calls[0][1];
		const payload = JSON.parse(blob.content[0]);
		expect(payload).toHaveProperty("type", "pageview");
		expect(payload).toHaveProperty("projectId");
		expect(payload).toHaveProperty("path");
		expect(payload).toHaveProperty("origin");
		expect(payload).toHaveProperty("host");
		expect(payload).toHaveProperty("ua");
		expect(payload).toHaveProperty("lang");
		expect(payload).toHaveProperty("visitorId");
		expect(payload).toHaveProperty("sessionId");
	});

	test("uses sendBeacon when available", () => {
		track("pageview");
		expect(beaconMock).toHaveBeenCalled();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test("falls back to fetch when sendBeacon fails", () => {
		beaconMock = mock(() => false);
		(global as any).navigator.sendBeacon = beaconMock;

		track("pageview");
		expect(beaconMock).toHaveBeenCalled();
		expect(fetchMock).toHaveBeenCalled();
	});

	test("falls back to fetch when sendBeacon unavailable", () => {
		delete (global as any).navigator.sendBeacon;

		track("pageview");
		expect(fetchMock).toHaveBeenCalled();
	});

	test("uses custom projectId from options", () => {
		track("pageview", undefined, { projectId: "custom-project" });
		const blob = beaconMock.mock.calls[0][1];
		const payload = JSON.parse(blob.content[0]);
		expect(payload.projectId).toBe("custom-project");
	});

	test("uses custom ingestUrl from options", () => {
		track("pageview", undefined, { ingestUrl: "https://custom.com" });
		const callArgs = beaconMock.mock.calls[0];
		expect(callArgs[0]).toBe("https://custom.com/e");
	});

	test("includes meta data in payload", () => {
		const meta = { foo: "bar", count: 42 };
		track("event", meta);
		const blob = beaconMock.mock.calls[0][1];
		const payload = JSON.parse(blob.content[0]);
		expect(payload.meta).toEqual(meta);
	});

	test("blocks duplicate events within 5 seconds", () => {
		track("pageview");
		track("pageview");
		track("pageview");
		expect(beaconMock).toHaveBeenCalledTimes(1);
	});

	test("respects opt-out flag", () => {
		global.localStorage.setItem("__analytics_opt_out", "true");
		track("pageview");
		expect(beaconMock).not.toHaveBeenCalled();
	});

	test("respects Do Not Track", () => {
		(global as any).navigator.doNotTrack = "1";
		track("pageview");
		expect(beaconMock).not.toHaveBeenCalled();
	});

	test("logs in debug mode", () => {
		const consoleMock = mock(() => {});
		global.console.log = consoleMock;

		track("pageview", undefined, { debug: true });
		expect(consoleMock).toHaveBeenCalled();
	});

	test("skips tracking in SSR", () => {
		delete (global as any).window;
		track("pageview");
		expect(beaconMock).not.toHaveBeenCalled();
		(global as any).window = originalWindow;
	});

	test("handles fetch unavailable gracefully", () => {
		delete (global as any).navigator.sendBeacon;
		delete (global as any).fetch;
		expect(() => track("pageview")).not.toThrow();
	});
});

describe("trackPageView", () => {
	let beaconMock: ReturnType<typeof mock>;

	beforeEach(() => {
		process.env.NEXT_PUBLIC_ANALYTICS_URL = "https://test-ingest.example.com";
		const localStore: Record<string, string> = {};
		global.localStorage = {
			getItem: (key: string) => localStore[key] || null,
			setItem: (key: string, value: string) => {
				localStore[key] = value;
			},
			removeItem: (key: string) => {
				delete localStore[key];
			},
			clear: () => {},
			length: 0,
			key: () => null,
		} as Storage;

		const sessionStore: Record<string, string> = {};
		global.sessionStorage = {
			getItem: (key: string) => sessionStore[key] || null,
			setItem: (key: string, value: string) => {
				sessionStore[key] = value;
			},
			removeItem: (key: string) => {
				delete sessionStore[key];
			},
			clear: () => {},
			length: 0,
			key: () => null,
		} as Storage;

		beaconMock = mock(() => true);
		(global as any).navigator = {
			sendBeacon: beaconMock,
			userAgent: "Test",
			language: "en",
		};
		(global as any).window = {
			location: {
				pathname: "/test",
				hostname: "localhost",
				origin: "http://localhost",
				host: "localhost",
			},
		};
		(global as any).document = { referrer: "" };
		(global as any).Blob = class Blob {
			constructor(
				public content: any[],
				public options: any,
			) {}
		};
	});

	test("tracks pageview event", () => {
		trackPageView();
		expect(beaconMock).toHaveBeenCalled();
		const blob = beaconMock.mock.calls[0][1];
		const payload = JSON.parse(blob.content[0]);
		expect(payload.type).toBe("pageview");
	});

	test("includes custom meta", () => {
		const meta = { source: "test" };
		trackPageView(meta);
		const blob = beaconMock.mock.calls[0][1];
		const payload = JSON.parse(blob.content[0]);
		expect(payload.meta).toEqual(meta);
	});
});

describe("observePageViews", () => {
	let beaconMock: ReturnType<typeof mock>;
	let pushState: History["pushState"];
	let replaceState: History["replaceState"];
	let listeners: Record<string, Array<EventListener>>;

	beforeEach(() => {
		process.env.NEXT_PUBLIC_ANALYTICS_URL = "https://test-ingest.example.com";
		const localStore: Record<string, string> = {};
		global.localStorage = {
			getItem: (key: string) => localStore[key] || null,
			setItem: (key: string, value: string) => {
				localStore[key] = value;
			},
			removeItem: (key: string) => {
				delete localStore[key];
			},
			clear: () => {},
			length: 0,
			key: () => null,
		} as Storage;

		const sessionStore: Record<string, string> = {};
		global.sessionStorage = {
			getItem: (key: string) => sessionStore[key] || null,
			setItem: (key: string, value: string) => {
				sessionStore[key] = value;
			},
			removeItem: (key: string) => {
				delete sessionStore[key];
			},
			clear: () => {},
			length: 0,
			key: () => null,
		} as Storage;

		beaconMock = mock(() => true);
		listeners = {};
		pushState = mock((_data: unknown, _unused: string, url?: string | URL | null) => {
			if (typeof url === "string") {
				(global as any).window.location.pathname = new URL(url, "http://localhost").pathname;
			}
		}) as unknown as History["pushState"];
		replaceState = mock((_data: unknown, _unused: string, url?: string | URL | null) => {
			if (typeof url === "string") {
				(global as any).window.location.pathname = new URL(url, "http://localhost").pathname;
			}
		}) as unknown as History["replaceState"];

		(global as any).navigator = {
			sendBeacon: beaconMock,
			userAgent: "Test",
			language: "en",
		};
		(global as any).window = {
			location: {
				pathname: "/test",
				hostname: "localhost",
				origin: "http://localhost",
				host: "localhost",
			},
			history: {
				pushState,
				replaceState,
			},
			addEventListener(type: string, listener: EventListener) {
				listeners[type] ??= [];
				listeners[type].push(listener);
			},
			removeEventListener(type: string, listener: EventListener) {
				listeners[type] = (listeners[type] || []).filter(function (entry) {
					return entry !== listener;
				});
			},
			dispatchEvent(event: Event) {
				for (const listener of listeners[event.type] || []) {
					listener(event);
				}
				return true;
			},
		};
		(global as any).document = { referrer: "" };
		(global as any).Blob = class Blob {
			constructor(
				public content: any[],
				public options: any,
			) {}
		};
		(global as any).Event = class Event {
			type: string;

			constructor(type: string) {
				this.type = type;
			}
		};
	});

	test("tracks initial pageview and client-side route changes", () => {
		const cleanup = observePageViews();

		expect(beaconMock).toHaveBeenCalledTimes(1);

		global.window.history.pushState({}, "", "/pricing");

		expect(beaconMock).toHaveBeenCalledTimes(2);

		const blob = beaconMock.mock.calls[1][1];
		const payload = JSON.parse(blob.content[0]);
		expect(payload.path).toBe("/pricing");

		cleanup();
	});

	test("does not track when pathname does not change", () => {
		const cleanup = observePageViews();

		global.window.history.replaceState({}, "", "/test");

		expect(beaconMock).toHaveBeenCalledTimes(1);

		cleanup();
	});
});

describe("trackEvent", () => {
	let beaconMock: ReturnType<typeof mock>;

	beforeEach(() => {
		process.env.NEXT_PUBLIC_ANALYTICS_URL = "https://test-ingest.example.com";
		const localStore: Record<string, string> = {};
		global.localStorage = {
			getItem: (key: string) => localStore[key] || null,
			setItem: (key: string, value: string) => {
				localStore[key] = value;
			},
			removeItem: (key: string) => {
				delete localStore[key];
			},
			clear: () => {},
			length: 0,
			key: () => null,
		} as Storage;

		const sessionStore: Record<string, string> = {};
		global.sessionStorage = {
			getItem: (key: string) => sessionStore[key] || null,
			setItem: (key: string, value: string) => {
				sessionStore[key] = value;
			},
			removeItem: (key: string) => {
				delete sessionStore[key];
			},
			clear: () => {},
			length: 0,
			key: () => null,
		} as Storage;

		beaconMock = mock(() => true);
		(global as any).navigator = {
			sendBeacon: beaconMock,
			userAgent: "Test",
			language: "en",
		};
		(global as any).window = {
			location: {
				pathname: "/test",
				hostname: "localhost",
				origin: "http://localhost",
				host: "localhost",
			},
		};
		(global as any).document = { referrer: "" };
		(global as any).Blob = class Blob {
			constructor(
				public content: any[],
				public options: any,
			) {}
		};
	});

	test("tracks custom event", () => {
		trackEvent("button_click");
		expect(beaconMock).toHaveBeenCalled();
		const blob = beaconMock.mock.calls[0][1];
		const payload = JSON.parse(blob.content[0]);
		expect(payload.type).toBe("event");
		expect(payload.meta.eventName).toBe("button_click");
	});

	test("includes event name in meta", () => {
		trackEvent("signup", { plan: "pro" });
		const blob = beaconMock.mock.calls[0][1];
		const payload = JSON.parse(blob.content[0]);
		expect(payload.meta.eventName).toBe("signup");
		expect(payload.meta.plan).toBe("pro");
	});
});

describe("trackClick", () => {
	let beaconMock: ReturnType<typeof mock>;

	beforeEach(() => {
		process.env.NEXT_PUBLIC_ANALYTICS_URL = "https://test-ingest.example.com";
		const localStore: Record<string, string> = {};
		global.localStorage = {
			getItem: (key: string) => localStore[key] || null,
			setItem: (key: string, value: string) => {
				localStore[key] = value;
			},
			removeItem: (key: string) => {
				delete localStore[key];
			},
			clear: () => {},
			length: 0,
			key: () => null,
		} as Storage;

		const sessionStore: Record<string, string> = {};
		global.sessionStorage = {
			getItem: (key: string) => sessionStore[key] || null,
			setItem: (key: string, value: string) => {
				sessionStore[key] = value;
			},
			removeItem: (key: string) => {
				delete sessionStore[key];
			},
			clear: () => {},
			length: 0,
			key: () => null,
		} as Storage;

		beaconMock = mock(() => true);
		(global as any).navigator = {
			sendBeacon: beaconMock,
			userAgent: "Test",
			language: "en",
		};
		(global as any).window = {
			location: {
				pathname: "/test",
				hostname: "localhost",
				origin: "http://localhost",
				host: "localhost",
			},
		};
		(global as any).document = { referrer: "" };
		(global as any).Blob = class Blob {
			constructor(
				public content: any[],
				public options: any,
			) {}
		};
	});

	test("tracks click event", () => {
		trackClick("submit_button");
		expect(beaconMock).toHaveBeenCalled();
		const blob = beaconMock.mock.calls[0][1];
		const payload = JSON.parse(blob.content[0]);
		expect(payload.type).toBe("click");
		expect(payload.meta.elementName).toBe("submit_button");
	});
});

describe("trackError", () => {
	let beaconMock: ReturnType<typeof mock>;

	beforeEach(() => {
		process.env.NEXT_PUBLIC_ANALYTICS_URL = "https://test-ingest.example.com";
		const localStore: Record<string, string> = {};
		global.localStorage = {
			getItem: (key: string) => localStore[key] || null,
			setItem: (key: string, value: string) => {
				localStore[key] = value;
			},
			removeItem: (key: string) => {
				delete localStore[key];
			},
			clear: () => {},
			length: 0,
			key: () => null,
		} as Storage;

		const sessionStore: Record<string, string> = {};
		global.sessionStorage = {
			getItem: (key: string) => sessionStore[key] || null,
			setItem: (key: string, value: string) => {
				sessionStore[key] = value;
			},
			removeItem: (key: string) => {
				delete sessionStore[key];
			},
			clear: () => {},
			length: 0,
			key: () => null,
		} as Storage;

		beaconMock = mock(() => true);
		(global as any).navigator = {
			sendBeacon: beaconMock,
			userAgent: "Test",
			language: "en",
		};
		(global as any).window = {
			location: {
				pathname: "/test",
				hostname: "localhost",
				origin: "http://localhost",
				host: "localhost",
			},
		};
		(global as any).document = { referrer: "" };
		(global as any).Blob = class Blob {
			constructor(
				public content: any[],
				public options: any,
			) {}
		};
	});

	test("tracks error event", () => {
		const error = new Error("Test error");
		trackError(error);
		expect(beaconMock).toHaveBeenCalled();
		const blob = beaconMock.mock.calls[0][1];
		const payload = JSON.parse(blob.content[0]);
		expect(payload.type).toBe("error");
		expect(payload.meta.message).toBe("Test error");
		expect(payload.meta.stack).toBeTruthy();
	});

	test("includes error stack trace", () => {
		const error = new Error("Test error");
		trackError(error);
		const blob = beaconMock.mock.calls[0][1];
		const payload = JSON.parse(blob.content[0]);
		expect(payload.meta.stack).toContain("Error");
	});
});
