import { noop } from "@spoar/shared/noop";

import { definePlugin } from "../core/plugin-host";

// A dataset key such as `spoarPropPlan` or `raPropPlan`, capturing `Plan`.
const propPattern = /^(?:spoar|ra)Prop(.+)$/;

/**
 * @name clicks
 * @description Sends `click` for clicks on elements marked with `data-spoar-click`, with its value
 * as `label` and every `data-spoar-prop-*` attribute as a prop. The older `data-ra-click` and
 * `data-ra-prop-*` attributes work the same.
 *
 * @example
 * // <button data-spoar-click="upgrade" data-spoar-prop-plan="pro">Upgrade</button>
 * createAnalytics({ ...config, plugins: [clicks()] });
 */
export function clicks() {
  return definePlugin({
    name: "clicks",
    setup: (client) => {
      if (typeof document === "undefined") return noop;
      function onClick(event: MouseEvent) {
        const target =
          event.target instanceof Element
            ? event.target.closest("[data-spoar-click],[data-ra-click]")
            : null;
        if (!(target instanceof HTMLElement)) return;
        const { dataset } = target;
        const props: { [key: string]: string } = {
          label: dataset.spoarClick ?? dataset.raClick ?? "",
        };
        for (const [key, value] of Object.entries(dataset)) {
          const prop = propPattern.exec(key)?.[1];
          if (prop && value !== undefined)
            props[prop.charAt(0).toLowerCase() + prop.slice(1)] = value;
        }
        client.track("click", props);
      }
      document.addEventListener("click", onClick, true);
      return () => document.removeEventListener("click", onClick, true);
    },
  });
}
