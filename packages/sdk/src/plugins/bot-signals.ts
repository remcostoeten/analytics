import { clientSignals } from "@remcostoeten/analytics-contract/signals";
import { noop } from "@remcostoeten/analytics-shared/noop";

import { definePlugin } from "../core/plugin-host";

type ChromeWindow = Window & { chrome?: unknown };

function headless() {
  const chromeAgent =
    /Chrome\//.test(navigator.userAgent) && !/Edg\/|OPR\//.test(navigator.userAgent);
  return (
    outerWidth === 0 ||
    outerHeight === 0 ||
    navigator.languages.length === 0 ||
    (chromeAgent && (window as ChromeWindow).chrome === undefined)
  );
}

/**
 * @name botSignals
 * @description Adds the client bot hints to every event's `signals` bits: `navigator.webdriver`,
 * headless hints (a zero-size window, no languages, or a Chrome user agent without
 * `window.chrome`), and no pointer, key, touch or scroll input on a page that was never visible.
 * They only add weight on the server; they never clear an event.
 *
 * @example
 * createAnalytics({ ...config, plugins: [botSignals()] });
 */
export function botSignals() {
  return definePlugin({
    name: "bot-signals",
    setup: (client) => {
      if (typeof navigator === "undefined") return noop;
      const inputs = ["pointerdown", "keydown", "touchstart", "scroll"];
      let active = false;
      let seen = document.visibilityState === "visible";
      function markActive() {
        active = true;
      }
      function markSeen() {
        if (document.visibilityState === "visible") seen = true;
      }
      for (const name of inputs)
        addEventListener(name, markActive, { passive: true, capture: true });
      document.addEventListener("visibilitychange", markSeen);
      const fixed =
        (navigator.webdriver ? clientSignals.webdriver : 0) |
        (headless() ? clientSignals.headless : 0);
      const remove = client.beforeSend((event) => ({
        ...event,
        signals: (event.signals ?? 0) | fixed | (active || seen ? 0 : clientSignals.noInput),
      }));
      return () => {
        for (const name of inputs) removeEventListener(name, markActive, { capture: true });
        document.removeEventListener("visibilitychange", markSeen);
        remove();
      };
    },
  });
}
