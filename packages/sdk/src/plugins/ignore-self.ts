import { noop } from "@spoar/shared/noop";

import { definePlugin } from "../core/plugin-host";

/**
 * @name ignoreSelf
 * @description Lets you exclude your own browser: opening any tracked page with `?ra=ignore`
 * opts this browser out, `?ra=track` opts it back in. `?ra=debug` and `?ra=nodebug` are handled by
 * the core.
 *
 * @example
 * createAnalytics({ ...config, plugins: [ignoreSelf()] });
 */
export function ignoreSelf() {
  return definePlugin({
    name: "ignore-self",
    setup: (client) => {
      if (typeof location === "undefined") return noop;
      const flag = new URLSearchParams(location.search).get("ra");
      if (flag === "ignore") client.optOut();
      if (flag === "track") client.optIn();
      return noop;
    },
  });
}
