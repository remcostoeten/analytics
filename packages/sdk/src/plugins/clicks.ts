import { noop } from "@spoar/shared/noop";

import { definePlugin } from "../core/plugin-host";

/**
 * @name clicks
 * @description Sends `click` for clicks on elements marked with `data-ra-click`, with its value
 * as `label` and every `data-ra-prop-*` attribute as a prop.
 *
 * @example
 * // <button data-ra-click="upgrade" data-ra-prop-plan="pro">Upgrade</button>
 * createAnalytics({ ...config, plugins: [clicks()] });
 */
export function clicks() {
  return definePlugin({
    name: "clicks",
    setup: (client) => {
      if (typeof document === "undefined") return noop;
      function onClick(event: MouseEvent) {
        const target =
          event.target instanceof Element ? event.target.closest("[data-ra-click]") : null;
        if (!(target instanceof HTMLElement)) return;
        const props: { [key: string]: string } = { label: target.dataset.raClick ?? "" };
        for (const [key, value] of Object.entries(target.dataset)) {
          if (key.startsWith("raProp") && value !== undefined) {
            props[key.slice(6, 7).toLowerCase() + key.slice(7)] = value;
          }
        }
        client.track("click", props);
      }
      document.addEventListener("click", onClick, true);
      return () => document.removeEventListener("click", onClick, true);
    },
  });
}
