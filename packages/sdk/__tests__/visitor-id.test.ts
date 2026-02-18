import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { getVisitorId, resetVisitorId } from "../src/visitor-id";

describe("visitor-id", () => {
  const VISITOR_ID_KEY = "remco_analytics_visitor_id";
  let originalLocalStorage: Storage | undefined;

  beforeEach(() => {
    originalLocalStorage = global.localStorage;
    const store: Record<string, string> = {};
    global.localStorage = {
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
  });

  afterEach(() => {
    if (originalLocalStorage) {
      global.localStorage = originalLocalStorage;
    }
  });

  test("generates UUID v4 format", () => {
    const id = getVisitorId();
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(id)).toBe(true);
  });

  test("persists visitor ID in localStorage", () => {
    const id1 = getVisitorId();
    const stored = global.localStorage.getItem(VISITOR_ID_KEY);
    expect(stored).toBe(id1);
  });

  test("returns same ID on subsequent calls", () => {
    const id1 = getVisitorId();
    const id2 = getVisitorId();
    const id3 = getVisitorId();
    expect(id1).toBe(id2);
    expect(id2).toBe(id3);
  });

  test("returns existing ID from localStorage", () => {
    const existingId = "12345678-1234-4234-8234-123456789abc";
    global.localStorage.setItem(VISITOR_ID_KEY, existingId);
    const id = getVisitorId();
    expect(id).toBe(existingId);
  });

  test("generates new ID when localStorage is empty", () => {
    global.localStorage.clear();
    const id = getVisitorId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe("string");
  });

  test("handles localStorage blocked scenario", () => {
    global.localStorage = {
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

    const id = getVisitorId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe("string");
  });

  test("resetVisitorId generates new ID", () => {
    const id1 = getVisitorId();
    const id2 = resetVisitorId();
    expect(id1).not.toBe(id2);
  });

  test("resetVisitorId persists new ID", () => {
    getVisitorId();
    const newId = resetVisitorId();
    const stored = global.localStorage.getItem(VISITOR_ID_KEY);
    expect(stored).toBe(newId);
  });

  test("resetVisitorId returns new ID on next getVisitorId", () => {
    getVisitorId();
    const resetId = resetVisitorId();
    const retrievedId = getVisitorId();
    expect(retrievedId).toBe(resetId);
  });

  test("handles SSR environment gracefully", () => {
    const originalWindow = global.window;
    delete (global as any).window;

    const id = getVisitorId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe("string");

    (global as any).window = originalWindow;
  });
});
