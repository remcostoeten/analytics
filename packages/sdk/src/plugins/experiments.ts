import { noop } from "@spoar/shared/noop";

import { definePlugin } from "../core/plugin-host";

/**
 * @name experiments
 * @description Registers each experiment's variant as an `experiment:<id>` prop on every later
 * event, and sends one `experiment_exposure` per experiment when the client starts, which is
 * once per page load.
 *
 * @example
 * createAnalytics({ ...config, plugins: [experiments({ hero: "b" })] });
 */
export function experiments(assigned: { [experiment: string]: string }) {
  return definePlugin({
    name: "experiments",
    setup: (client) => {
      client.register(
        Object.fromEntries(
          Object.entries(assigned).map(([id, variant]) => [`experiment:${id}`, variant]),
        ),
      );
      for (const [experiment, variant] of Object.entries(assigned)) {
        client.track("experiment_exposure", { experiment, variant });
      }
      return noop;
    },
  });
}
