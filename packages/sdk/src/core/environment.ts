import type { WireContext } from "@remcostoeten/analytics-contract";

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
 * @description Reads `?ra=debug` from the URL: true turns debug output on in this browser, false
 * leaves the stored choice alone.
 *
 * @example
 * if (debugFlag()) saved.write({ debug: true }, true);
 */
export function debugFlag(): boolean {
  return (
    typeof location !== "undefined" && new URLSearchParams(location.search).get("ra") === "debug"
  );
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
