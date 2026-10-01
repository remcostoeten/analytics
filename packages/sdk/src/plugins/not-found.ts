import { noop } from "@remcostoeten/analytics-shared/noop";

import { pagePath } from "../core/environment";
import { definePlugin } from "../core/plugin-host";

/**
 * @name notFound
 * @description Sends `not_found` with the referrer when the page carries
 * `<meta name="ra-not-found">`, so broken links show up with where they came from. It checks on
 * start and on every pageview and reports each URL (path and query) once in a row, so the first
 * pageview after start does not report the same page again.
 *
 * @example
 * createAnalytics({ ...config, plugins: [notFound()] });
 */
export function notFound() {
  return definePlugin({
    name: "not-found",
    setup: (client) => {
      if (typeof document === "undefined") return noop;
      let last = "";
      function check() {
        const url = pagePath() + location.search;
        if (url === last) return;
        last = url;
        if (document.querySelector("meta[name=ra-not-found]")) {
          client.track("not_found", { referrer: document.referrer || null });
        }
      }
      check();
      return client.onPage(check);
    },
  });
}
