import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { setConsentGranted, setConsentRequired, hasConsent, canPersist } from "../src/api/consent";
import { getVisitorId, VISITOR_ID_KEY } from "../src/identity/visitor";
import { getSessionId, SESSION_ID_KEY, SESSION_TIMEOUT_KEY } from "../src/identity/session";
import { trackPageView, resetDedupe } from "../src/api/track";
import { getStoredKeys, PRIVACY_DISCLOSURE } from "../src/api/privacy";

describe("consent", () => {
	beforeEach(function () {
		resetDedupe();
		setConsentRequired(false);
		setConsentGranted(false);
	});

	test("allows tracking when consent not required", () => {
		setConsentRequired(false);
		setConsentGranted(false);
		expect(hasConsent()).toBe(true);
		expect(canPersist()).toBe(true);
	});

	test("blocks when consent required and not granted", () => {
		setConsentRequired(true);
		setConsentGranted(false);
		expect(hasConsent()).toBe(false);
	});

	test("allows when consent required and granted", () => {
		setConsentRequired(true);
		setConsentGranted(true);
		expect(hasConsent()).toBe(true);
	});
});

describe("consent storage", () => {
	let localStore: Record<string, string>;
	let sessionStore: Record<string, string>;

	beforeEach(function () {
		resetDedupe();
		setConsentRequired(true);
		setConsentGranted(false);

		localStore = {};
		sessionStore = {};

		global.localStorage = {
			getItem: (key: string) => localStore[key] || null,
			setItem: (key: string, value: string) => {
				localStore[key] = value;
			},
			removeItem: (key: string) => {
				delete localStore[key];
			},
			clear: () => {
				Object.keys(localStore).forEach((k) => delete localStore[k]);
			},
			length: 0,
			key: () => null,
		} as Storage;

		global.sessionStorage = {
			getItem: (key: string) => sessionStore[key] || null,
			setItem: (key: string, value: string) => {
				sessionStore[key] = value;
			},
			removeItem: (key: string) => {
				delete sessionStore[key];
			},
			clear: () => {
				Object.keys(sessionStore).forEach((k) => delete sessionStore[k]);
			},
			length: 0,
			key: () => null,
		} as Storage;

		(global as any).window = {};
	});

	test("does not write visitor id before consent", () => {
		getVisitorId();
		expect(localStore[VISITOR_ID_KEY]).toBeUndefined();
	});

	test("writes visitor id after consent granted", () => {
		setConsentGranted(true);
		const id = getVisitorId();
		expect(localStore[VISITOR_ID_KEY]).toBe(id);
	});

	test("does not write session id before consent", () => {
		getSessionId();
		expect(sessionStore[SESSION_ID_KEY]).toBeUndefined();
		expect(sessionStore[SESSION_TIMEOUT_KEY]).toBeUndefined();
	});

	test("writes session id after consent granted", () => {
		setConsentGranted(true);
		const id = getSessionId();
		expect(sessionStore[SESSION_ID_KEY]).toBe(id);
		expect(sessionStore[SESSION_TIMEOUT_KEY]).toBeDefined();
	});
});

describe("consent tracking", () => {
	let beaconMock: ReturnType<typeof mock>;

	beforeEach(function () {
		resetDedupe();
		process.env.NEXT_PUBLIC_ANALYTICS_URL = "https://test-ingest.example.com";
		setConsentRequired(true);
		setConsentGranted(false);

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

		global.sessionStorage = {
			getItem: () => null,
			setItem: () => {},
			removeItem: () => {},
			clear: () => {},
			length: 0,
			key: () => null,
		} as Storage;

		beaconMock = mock(() => true);
		(global as any).navigator = {
			sendBeacon: beaconMock,
			userAgent: "Test",
			language: "en",
			doNotTrack: null,
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
				public content: unknown[],
				public options: unknown,
			) {}
		};
	});

	afterEach(function () {
		setConsentRequired(false);
		setConsentGranted(false);
	});

	test("track no-ops without consent", () => {
		trackPageView();
		expect(beaconMock).not.toHaveBeenCalled();
	});

	test("track sends after consent granted", () => {
		setConsentGranted(true);
		trackPageView();
		expect(beaconMock).toHaveBeenCalled();
	});
});

describe("privacy disclosure", () => {
	test("PRIVACY_DISCLOSURE is non-empty", () => {
		expect(PRIVACY_DISCLOSURE.length).toBeGreaterThan(50);
		expect(PRIVACY_DISCLOSURE).toContain("localStorage");
	});

	test("getStoredKeys lists all SDK keys", () => {
		const keys = getStoredKeys().map((entry) => entry.key);
		expect(keys).toContain("__analytics_visitor_id");
		expect(keys).toContain("__analytics_session_id");
		expect(keys).toContain("__analytics_session_timeout");
		expect(keys).toContain("__analytics_opt_out");
	});
});
