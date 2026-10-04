import { noop } from "@spoar/shared/noop";

import { definePlugin } from "../core/plugin-host";

const maxCrumbs = 20;
const maxTrail = 2048;
// Query strings up to the ":" of a line number, then emails, then tokens of 20 or more word
// characters, then runs of 6 or more digits.
const sensitive =
  /\?[^\s#:)]*|(?<![\w.+-])[\w.+-]+@[\w-]+\.[\w.]+|(?<![\w-])[\w-]{20,}(?![\w-])|\d{6,}/g;

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
 * fetches and sent events, keeping the newest when they pass 2048 characters. Messages, stacks and
 * breadcrumbs are scrubbed of query strings, emails, tokens and long numbers first. A thrown value
 * that is not an `Error` is sent without a stack. An error event with neither an error nor a line
 * number, the cross-origin "Script error.", is dropped, as it carries nothing to fix.
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
        const copy =
          error instanceof Error
            ? Object.assign(new Error(scrub(error.message)), {
                name: error.name,
                stack: scrub(error.stack ?? ""),
              })
            : scrub(String(error));
        client.captureError(copy, { tags: { breadcrumbs: trail.join("\n").slice(-maxTrail) } });
      }
      const controller = new AbortController();
      const { signal } = controller;
      window.addEventListener(
        "error",
        (event) => (event.error || event.lineno) && report(event.error ?? event.message),
        { signal },
      );
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
