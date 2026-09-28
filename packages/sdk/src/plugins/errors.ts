import { noop } from "@remcostoeten/analytics-shared/noop";

import { definePlugin } from "../core/plugin-host";

const maxCrumbs = 20;
// Query strings, then emails, then tokens of 20 or more word characters, then runs of 6 or more digits.
const sensitive =
  /\?[^\s#]*|(?<![\w.+-])[\w.+-]+@[\w-]+\.[\w.]+|(?<![\w-])[\w-]{20,}(?![\w-])|\d{6,}/g;

/**
 * @name scrub
 * @description Drops query strings and replaces emails, long tokens and long numbers with `[x]`,
 * so error messages and breadcrumbs carry no personal data.
 *
 * @example
 * scrub("GET /api/users?token=abc failed for ada@example.com"); // "GET /api/users[x] failed for [x]"
 */
export function scrub(text: string): string {
  return text.replaceAll(sensitive, "[x]");
}

/**
 * @name errors
 * @description Captures uncaught errors and unhandled promise rejections with the last 20
 * breadcrumbs, one line each (Unix milliseconds, kind, message): navigations, clicks, failed
 * fetches and sent events. Messages, stacks and breadcrumbs are scrubbed of query strings,
 * emails, tokens and long numbers first.
 *
 * @example
 * createAnalytics({ ...config, plugins: [errors()] });
 */
export function errors() {
  return definePlugin({
    name: "errors",
    setup: (client) => {
      if (typeof window === "undefined") return noop;
      const trail: string[] = [];
      function crumb(kind: string, message: string) {
        trail.push(`${Date.now()} ${kind} ${scrub(message).slice(0, 200)}`);
        if (trail.length > maxCrumbs) trail.shift();
      }
      function report(error: unknown) {
        const source = error instanceof Error ? error : new Error(String(error));
        const copy = new Error(scrub(source.message));
        copy.name = source.name;
        copy.stack = scrub(source.stack ?? "");
        client.captureError(copy, { tags: { breadcrumbs: trail.join("\n") } });
      }
      const controller = new AbortController();
      const { signal } = controller;
      window.addEventListener("error", (event) => report(event.error ?? event.message), { signal });
      window.addEventListener("unhandledrejection", (event) => report(event.reason), { signal });
      window.addEventListener(
        "click",
        (event) => {
          if (event.target instanceof Element) crumb("click", event.target.tagName);
        },
        { signal, capture: true },
      );
      const original = window.fetch;
      async function watched(...args: Parameters<typeof fetch>) {
        const response = await original(...args);
        if (!response.ok) crumb("fetch", `${response.status} ${response.url}`);
        return response;
      }
      window.fetch = Object.assign(watched, original);
      const removers = [
        client.onPage(() => crumb("navigation", location.pathname)),
        client.beforeSend((event) => {
          if (event.name !== "error") crumb("event", event.name);
          return event;
        }),
      ];
      return () => {
        window.fetch = original;
        controller.abort();
        for (const remove of removers) remove();
      };
    },
  });
}
