import { noop } from "@remcostoeten/analytics-shared/noop";

import { definePlugin } from "../core/plugin-host";

/**
 * @name experiments
 * @description Registers each experiment's variant as an `experiment:<id>` prop on every later
 * event, and sends one `experiment_exposure` per experiment and session.
 *
 * @example
 * createAnalytics({ ...config, plugins: [experiments({ hero: "b" })] });
 */
export function experiments(assigned: { [experiment: string]: string }) {
  return definePlugin({
    name: "experiments",
    setup: (client) => {
      const exposed = new Set<string>();
      client.register(
        Object.fromEntries(
          Object.entries(assigned).map(([id, variant]) => [`experiment:${id}`, variant]),
        ),
      );
      for (const [experiment, variant] of Object.entries(assigned)) {
        if (exposed.has(experiment)) continue;
        exposed.add(experiment);
        client.track("experiment_exposure", { experiment, variant });
      }
      return noop;
    },
  });
}
