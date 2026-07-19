import { describe, test, expect, beforeEach, mock } from "bun:test";
import { mergeAnalyticsOptions, resolveAnalyticsOptions } from "../src/utilities/options";
import { createTrackHelpers } from "../src/api/track-helpers";
import { resetDedupe } from "../src/api/track";

describe("mergeAnalyticsOptions", () => {
	test("override wins over base", () => {
		expect(
			mergeAnalyticsOptions(
				{ projectId: "base", ingestUrl: "https://base.example", debug: false },
				{ projectId: "override", debug: true },
			),
		).toEqual({
			projectId: "override",
			ingestUrl: "https://base.example",
			debug: true,
		});
	});

	test("returns base when override empty", () => {
		const base = { projectId: "my-app", ingestUrl: "https://ingest.example" };
		expect(mergeAnalyticsOptions(base)).toEqual(base);
	});
});

describe("resolveAnalyticsOptions", () => {
	test("merges context with props", () => {
		expect(
			resolveAnalyticsOptions(
				{ projectId: "context-app", ingestUrl: "https://context.example" },
				{ projectId: "prop-app" },
			),
		).toEqual({
			projectId: "prop-app",
			ingestUrl: "https://context.example",
			debug: undefined,
		});
	});
});

describe("createTrackHelpers", () => {
	let beaconMock: ReturnType<typeof mock>;

	beforeEach(() => {
		resetDedupe();
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

	test("uses default options from provider context", () => {
		const helpers = createTrackHelpers({ projectId: "from-provider" });
		helpers.trackEvent("signup");

		const blob = beaconMock.mock.calls[0][1] as { content: string[] };
		const payload = JSON.parse(blob.content[0]);
		expect(payload.projectId).toBe("from-provider");
		expect(payload.meta.eventName).toBe("signup");
	});

	test("per-call options override provider defaults", () => {
		const helpers = createTrackHelpers({ projectId: "from-provider" });
		helpers.trackEvent("signup", undefined, { projectId: "override" });

		const blob = beaconMock.mock.calls[0][1] as { content: string[] };
		const payload = JSON.parse(blob.content[0]);
		expect(payload.projectId).toBe("override");
	});
});
