import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { optOut, optIn, isOptedOut, checkDoNotTrack } from "../src/opt-out";

describe("opt-out", () => {
  const OPT_OUT_KEY = "remco_analytics_opt_out";
  const VISITOR_ID_KEY = "remco_analytics_visitor_id";
  let originalLocalStorage: Storage | undefined;

  beforeEach(() => {
    originalLocalStorage = global.localStorage;
    const store: Record<string, string> = {};
    
    // Mock window if it doesn't exist
    if (!global.window) {
      (global as any).window = {};
    }
    
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
      get length() {
        return Object.keys(store).length;
      },
      key: (index: number) => Object.keys(store)[index] || null,
    } as Storage;
  });

  afterEach(() => {
    if (originalLocalStorage) {
      global.localStorage = originalLocalStorage;
    }
  });

  test("isOptedOut returns false by default", () => {
    expect(isOptedOut()).toBe(false);
  });

  test("optOut sets localStorage flag", () => {
    optOut();
    const flag = global.localStorage.getItem(OPT_OUT_KEY);
    expect(flag).toBe("true");
  });

  test("isOptedOut returns true after optOut", () => {
    optOut();
    expect(isOptedOut()).toBe(true);
  });

  test("optOut clears visitor ID", () => {
    global.localStorage.setItem(VISITOR_ID_KEY, "test-visitor-id");
    optOut();
    const visitorId = global.localStorage.getItem(VISITOR_ID_KEY);
    expect(visitorId).toBeNull();
  });

  test("optIn removes localStorage flag", () => {
    optOut();
    optIn();
    const flag = global.localStorage.getItem(OPT_OUT_KEY);
    expect(flag).toBeNull();
  });

  test("isOptedOut returns false after optIn", () => {
    optOut();
    optIn();
    expect(isOptedOut()).toBe(false);
  });

  test("optOut persists across page loads", () => {
    optOut();
    const flag1 = global.localStorage.getItem(OPT_OUT_KEY);
    expect(flag1).toBe("true");
    expect(isOptedOut()).toBe(true);
  });

  test("handles localStorage blocked in optOut", () => {
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

    expect(() => optOut()).not.toThrow();
  });

  test("handles localStorage blocked in isOptedOut", () => {
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

    expect(isOptedOut()).toBe(false);
  });

  test("checkDoNotTrack returns false by default", () => {
    expect(checkDoNotTrack()).toBe(false);
  });

  test("checkDoNotTrack detects navigator.doNotTrack = 1", () => {
    const originalNavigator = global.navigator;
    (global as any).navigator = {
      ...originalNavigator,
      doNotTrack: "1",
    };

    expect(checkDoNotTrack()).toBe(true);

    (global as any).navigator = originalNavigator;
  });

  test("checkDoNotTrack detects navigator.doNotTrack = yes", () => {
    const originalNavigator = global.navigator;
    (global as any).navigator = {
      ...originalNavigator,
      doNotTrack: "yes",
    };

    expect(checkDoNotTrack()).toBe(true);

    (global as any).navigator = originalNavigator;
  });

  test("checkDoNotTrack returns false for other values", () => {
    const originalNavigator = global.navigator;
    (global as any).navigator = {
      ...originalNavigator,
      doNotTrack: "0",
    };

    expect(checkDoNotTrack()).toBe(false);

    (global as any).navigator = originalNavigator;
  });

  test("handles SSR environment in optOut", () => {
    const originalWindow = global.window;
    delete (global as any).window;

    expect(() => optOut()).not.toThrow();

    (global as any).window = originalWindow;
  });

  test("handles SSR environment in isOptedOut", () => {
    const originalWindow = global.window;
    delete (global as any).window;

    expect(isOptedOut()).toBe(false);

    (global as any).window = originalWindow;
  });

  test("handles SSR environment in checkDoNotTrack", () => {
    const originalWindow = global.window;
    delete (global as any).window;

    expect(checkDoNotTrack()).toBe(false);

    (global as any).window = originalWindow;
  });
});
