import { noop } from "@remcostoeten/analytics-shared/noop";

import { definePlugin } from "../core/plugin-host";

/**
 * @name engagement
 * @description Sends `engagement` with the milliseconds a page was visible, when the page is left
 * or hidden. Time in a background tab does not count.
 *
 * @example
 * createAnalytics({ ...config, plugins: [engagement()] });
 */
export function engagement() {
  return definePlugin({
    name: "engagement",
    setup: (client) => {
      if (typeof document === "undefined") return noop;
      let total = 0;
      let since: number | null = document.visibilityState === "visible" ? Date.now() : null;
      let path = location.pathname;
      function pause() {
        if (since !== null) total += Date.now() - since;
        since = null;
      }
      function report() {
        pause();
        if (total > 0) client.record(path, "engagement", { ms: total });
        total = 0;
        path = location.pathname;
      }
      function resume() {
        if (document.visibilityState === "visible") since ??= Date.now();
      }
      const removers = [
        client.onHidden(report),
        client.onPage(() => {
          report();
          resume();
        }),
      ];
      document.addEventListener("visibilitychange", resume);
      return () => {
        document.removeEventListener("visibilitychange", resume);
        for (const remove of removers) remove();
      };
    },
  });
}
