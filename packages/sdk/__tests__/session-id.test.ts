import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { getSessionId, resetSessionId, extendSession } from "../src/identity/session";

describe("session-id", () => {
	const SESSION_ID_KEY = "remco_analytics_session_id";
	const SESSION_TIMEOUT_KEY = "remco_analytics_session_timeout";
	let originalSessionStorage: Storage | undefined;
	let originalWindow: any;

	beforeEach(() => {
		originalSessionStorage = global.sessionStorage;
		originalWindow = global.window;

		const store: Record<string, string> = {};
		global.sessionStorage = {
			getItem: (key: string) => store[key] || null,
			setItem: (key: string, value: string) => {
				store[key] = value;
			},
			removeItem: (key: string) => {
				delete store[key];
			},
			clear: () => {
				Object.keys(store).forEach((key) => delete store[key]);
			},
			length: Object.keys(store).length,
			key: (index: number) => Object.keys(store)[index] || null,
		} as Storage;

		(global as any).window = {
			sessionStorage: global.sessionStorage,
		};
	});

	afterEach(() => {
		if (originalSessionStorage) {
			global.sessionStorage = originalSessionStorage;
		}
		if (originalWindow) {
			(global as any).window = originalWindow;
		} else {
			delete (global as any).window;
		}
	});

	test("generates UUID v4 format", () => {
		const id = getSessionId();
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		expect(uuidRegex.test(id)).toBe(true);
	});

	test("persists session ID in sessionStorage", () => {
		const id1 = getSessionId();
		const stored = global.sessionStorage.getItem(SESSION_ID_KEY);
		expect(stored).toBe(id1);
	});

	test("returns same ID on subsequent calls", () => {
		const id1 = getSessionId();
		const id2 = getSessionId();
		const id3 = getSessionId();
		expect(id1).toBe(id2);
		expect(id2).toBe(id3);
	});

	test("returns existing ID from sessionStorage", () => {
		const existingId = "12345678-1234-4234-8234-123456789abc";
		const futureTimeout = Date.now() + 1000000;
		global.sessionStorage.setItem(SESSION_ID_KEY, existingId);
		global.sessionStorage.setItem(SESSION_TIMEOUT_KEY, futureTimeout.toString());
		const id = getSessionId();
		expect(id).toBe(existingId);
	});

	test("generates new ID when sessionStorage is empty", () => {
		global.sessionStorage.clear();
		const id = getSessionId();
		expect(id).toBeTruthy();
		expect(typeof id).toBe("string");
	});

	test("sets timeout when creating new session", () => {
		getSessionId();
		const timeout = global.sessionStorage.getItem(SESSION_TIMEOUT_KEY);
		expect(timeout).toBeTruthy();
		const timeoutMs = parseInt(timeout!, 10);
		expect(timeoutMs).toBeGreaterThan(Date.now());
	});

	test("timeout is 30 minutes in future", () => {
		getSessionId();
		const timeout = global.sessionStorage.getItem(SESSION_TIMEOUT_KEY);
		const timeoutMs = parseInt(timeout!, 10);
		const expectedTimeout = Date.now() + 30 * 60 * 1000;
		const diff = Math.abs(timeoutMs - expectedTimeout);
		expect(diff).toBeLessThan(1000);
	});

	test("generates new ID when session expired", () => {
		const oldId = "12345678-1234-4234-8234-123456789abc";
		const pastTimeout = Date.now() - 1000;
		global.sessionStorage.setItem(SESSION_ID_KEY, oldId);
		global.sessionStorage.setItem(SESSION_TIMEOUT_KEY, pastTimeout.toString());
		const newId = getSessionId();
		expect(newId).not.toBe(oldId);
	});

	test("extends timeout on each getSessionId call", () => {
		getSessionId();
		const timeout1 = global.sessionStorage.getItem(SESSION_TIMEOUT_KEY);
		setTimeout(() => {
			getSessionId();
			const timeout2 = global.sessionStorage.getItem(SESSION_TIMEOUT_KEY);
			expect(parseInt(timeout2!, 10)).toBeGreaterThan(parseInt(timeout1!, 10));
		}, 100);
	});

	test("handles sessionStorage blocked scenario", () => {
		global.sessionStorage = {
			getItem: () => {
				throw new Error("Storage blocked");
			},
			setItem: () => {
				throw new Error("Storage blocked");
			},
			removeItem: () => {
				throw new Error("Storage blocked");
			},
			clear: () => {},
			length: 0,
			key: () => null,
		} as Storage;

		const id = getSessionId();
		expect(id).toBeTruthy();
		expect(typeof id).toBe("string");
	});

	test("resetSessionId generates new ID", () => {
		const id1 = getSessionId();
		const id2 = resetSessionId();
		expect(id1).not.toBe(id2);
	});

	test("resetSessionId persists new ID", () => {
		getSessionId();
		const newId = resetSessionId();
		const stored = global.sessionStorage.getItem(SESSION_ID_KEY);
		expect(stored).toBe(newId);
	});

	test("resetSessionId returns new ID on next getSessionId", () => {
		getSessionId();
		const resetId = resetSessionId();
		const retrievedId = getSessionId();
		expect(retrievedId).toBe(resetId);
	});

	test("resetSessionId sets new timeout", () => {
		getSessionId();
		resetSessionId();
		const timeout = global.sessionStorage.getItem(SESSION_TIMEOUT_KEY);
		expect(timeout).toBeTruthy();
		const timeoutMs = parseInt(timeout!, 10);
		expect(timeoutMs).toBeGreaterThan(Date.now());
	});

	test("extendSession updates timeout", () => {
		getSessionId();
		const timeout1 = global.sessionStorage.getItem(SESSION_TIMEOUT_KEY);
		setTimeout(() => {
			extendSession();
			const timeout2 = global.sessionStorage.getItem(SESSION_TIMEOUT_KEY);
			expect(parseInt(timeout2!, 10)).toBeGreaterThan(parseInt(timeout1!, 10));
		}, 100);
	});

	test("handles SSR environment gracefully", () => {
		const tempWindow = global.window;
		delete (global as any).window;
		delete (global as any).sessionStorage;

		const id = getSessionId();
		expect(id).toBeTruthy();
		expect(typeof id).toBe("string");

		if (tempWindow) {
			(global as any).window = tempWindow;
		}
		if (originalSessionStorage) {
			global.sessionStorage = originalSessionStorage;
		}
	});
});
