import { noop } from "@remcostoeten/analytics-shared/noop";

import { pagePath } from "../core/environment";
import { definePlugin } from "../core/plugin-host";

/**
 * @name pageviews
 * @description Sends a pageview on start and on every client-side navigation: `pushState`,
 * `replaceState` to a new path, back and forward, and hash-router paths (`#/path`), which
 * browsers announce with `popstate`. A repeat of the same URL or a change of only an anchor hash
 * is skipped, and nothing is sent once a framework adapter supplies the route,
 * because the adapter sends pageviews itself. Included by default unless `pageviews: false`.
 *
 * @example
 * createAnalytics({ project, key, pageviews: false, plugins: [pageviews()] });
 */
export function pageviews() {
  return definePlugin({
    name: "pageviews",
    setup: (client) => {
      if (typeof window === "undefined") return noop;
      let last = "";
      function visit() {
        const url = pagePath() + location.search;
        if (url === last || client.status().route !== null) return;
        last = url;
        client.page();
      }
      history.pushState = (...args) => {
        History.prototype.pushState.apply(history, args);
        visit();
      };
      history.replaceState = (...args) => {
        History.prototype.replaceState.apply(history, args);
        visit();
      };
      addEventListener("popstate", visit);
      visit();
      return () => {
        Reflect.deleteProperty(history, "pushState");
        Reflect.deleteProperty(history, "replaceState");
        removeEventListener("popstate", visit);
      };
    },
  });
}
