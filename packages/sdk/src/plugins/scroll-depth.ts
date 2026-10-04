import { noop } from "@spoar/shared/noop";

import { pagePath } from "../core/environment";
import { definePlugin } from "../core/plugin-host";

/**
 * @name scrollDepth
 * @description Sends `scroll_depth` with the deepest point reached on a page, as a percentage,
 * when the page is left or hidden. It is credited to the page that was scrolled.
 *
 * @example
 * createAnalytics({ ...config, plugins: [scrollDepth()] });
 */
export function scrollDepth() {
  return definePlugin({
    name: "scroll-depth",
    setup: (client) => {
      if (typeof window === "undefined") return noop;
      let deepest = 0;
      let path = pagePath();
      function measure() {
        const room = document.documentElement.scrollHeight - innerHeight;
        const depth = room <= 0 ? 100 : Math.round((scrollY / room) * 100);
        deepest = Math.max(deepest, Math.min(100, depth));
      }
      function report() {
        if (deepest > 0) client.record(path, "scroll_depth", { depth: deepest });
        deepest = 0;
        path = pagePath();
      }
      addEventListener("scroll", measure, { passive: true });
      const removers = [client.onPage(report), client.onHidden(report)];
      return () => {
        removeEventListener("scroll", measure);
        for (const remove of removers) remove();
      };
    },
  });
}
