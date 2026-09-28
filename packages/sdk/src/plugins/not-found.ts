import { noop } from "@remcostoeten/analytics-shared/noop";

import { definePlugin } from "../core/plugin-host";

/**
 * @name notFound
 * @description Sends `not_found` with the referrer when the page carries
 * `<meta name="ra-not-found">`, so broken links show up with where they came from.
 *
 * @example
 * createAnalytics({ ...config, plugins: [notFound()] });
 */
export function notFound() {
  return definePlugin({
    name: "not-found",
    setup: (client) => {
      if (typeof document === "undefined") return noop;
      function check() {
        if (document.querySelector("meta[name=ra-not-found]")) {
          client.track("not_found", { referrer: document.referrer || null });
        }
      }
      check();
      return client.onPage(check);
    },
  });
}
