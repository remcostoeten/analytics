import { noop } from "@spoar/shared/noop";

import { definePlugin } from "../core/plugin-host";

/**
 * @name ignoreSelf
 * @description Lets you exclude your own browser: opening any tracked page with `?spoar=ignore`
 * opts this browser out, `?spoar=track` opts it back in. `?spoar=debug` and `?spoar=nodebug` are
 * handled by the core. The older `?ra=` spelling works the same.
 *
 * @example
 * createAnalytics({ ...config, plugins: [ignoreSelf()] });
 */
export function ignoreSelf() {
  return definePlugin({
    name: "ignore-self",
    setup: (client) => {
      if (typeof location === "undefined") return noop;
      const query = new URLSearchParams(location.search);
      const flag = query.get("spoar") ?? query.get("ra");
      if (flag === "ignore") client.optOut();
      if (flag === "track") client.optIn();
      return noop;
    },
  });
}
