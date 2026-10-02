import type { WireContext } from "@spoar/contract";

import type { PageFacts } from "./build-event";
import { readEnv } from "./config";
import type { Store } from "./storage";

type Connection = { effectiveType?: string };

const utmKeys = ["source", "medium", "campaign", "term", "content"] as const;

/**
 * @name browserStore
 * @description `localStorage` or `sessionStorage` when the page may use it, or null on the server,
 * in a sandboxed frame, or when storage access throws.
 *
 * @example
 * const local = browserStore("localStorage");
 */
export function browserStore(name: "localStorage" | "sessionStorage"): Store | null {
  try {
    return typeof window === "undefined" ? null : window[name];
  } catch {
    return null;
  }
}

/**
 * @name pagePath
 * @description The path of the current page: the path inside the hash for hash routers (`#/blog/x`,
 * without its query), else `location.pathname`, and `/` outside a browser.
 *
 * @example
 * pagePath(); // "/blog/x" on https://example.com/#/blog/x?tab=1
 */
export function pagePath(): string {
  if (typeof location === "undefined") return "/";
  // matches "#/path" and captures the path up to a "?"
  return /^#(\/[^?]*)/.exec(location.hash)?.[1] ?? location.pathname;
}

/**
 * @name pageFacts
 * @description The current path, the route template when an adapter supplied one, the title and,
 * on the first pageview only, the referrer.
 *
 * @example
 * pageFacts("/blog/[slug]", true);
 */
export function pageFacts(route: string | null, first: boolean): PageFacts {
  const browser = typeof document !== "undefined";
  return {
    path: pagePath(),
    route,
    title: (browser && document.title) || null,
    referrer: (browser && first && document.referrer) || null,
  };
}

/**
 * @name browserContext
 * @description Screen and viewport size, timezone, language, connection type, the UTM tags on the
 * current URL and the release, leaving out whatever the runtime does not know.
 *
 * @example
 * browserContext("2026.09.28");
 */
export function browserContext(release: string | undefined): WireContext {
  const context: WireContext = {};
  if (release) context.release = release;
  if (typeof window === "undefined") return context;
  context.screen = `${screen.width}x${screen.height}`;
  context.viewport = `${innerWidth}x${innerHeight}`;
  context.lang = navigator.language;
  context.tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const connection = (navigator as Navigator & { connection?: Connection }).connection;
  if (connection?.effectiveType) context.connection = connection.effectiveType;
  const params = new URLSearchParams(location.search);
  const utm: NonNullable<WireContext["utm"]> = {};
  for (const key of utmKeys) {
    const value = params.get(`utm_${key}`);
    if (value) utm[key] = value.slice(0, 2048);
  }
  if (Object.keys(utm).length > 0) context.utm = utm;
  return context;
}

/**
 * @name debugFlag
 * @description Reads the debug switch from the URL: `?ra=debug` gives true, which turns debug
 * output on in this browser, `?ra=nodebug` gives false, which turns it off again without touching
 * the visitor id, and anything else gives null, which leaves the stored choice alone.
 *
 * @example
 * const flag = debugFlag();
 * if (flag !== null) saved.write({ debug: flag }, true);
 */
export function debugFlag(): boolean | null {
  const flag =
    typeof location === "undefined" ? null : new URLSearchParams(location.search).get("ra");
  return flag === "debug" ? true : flag === "nodebug" ? false : null;
}

/**
 * @name privacySignal
 * @description True when the browser asks not to be tracked: Do Not Track (`doNotTrack` is "1")
 * or Global Privacy Control (`globalPrivacyControl` is true). The client drops every event with
 * the reason `dnt` while it is set. Takes the navigator so tests can pass a plain object.
 *
 * @example
 * privacySignal(globalThis.navigator); // true with Do Not Track on
 */
export function privacySignal(
  browser: { doNotTrack?: string | null; globalPrivacyControl?: boolean } | undefined,
): boolean {
  return browser?.doNotTrack === "1" || browser?.globalPrivacyControl === true;
}

/**
 * @name resolveMode
 * @description `auto` becomes development when `NODE_ENV` is `development` or `test`, and
 * production otherwise, including when `process` does not exist.
 *
 * @example
 * resolveMode("auto"); // "production" in a production build
 */
export function resolveMode(
  mode: "auto" | "development" | "production",
): "development" | "production" {
  if (mode !== "auto") return mode;
  const env = readEnv(() => process.env.NODE_ENV);
  return env === "development" || env === "test" ? "development" : "production";
}
