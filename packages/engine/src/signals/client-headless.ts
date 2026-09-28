import { clientSignals } from "@remcostoeten/analytics-contract";

import { defineSignal } from "../define";

/**
 * @name clientHeadless
 * @description A zero-size outer window, no languages, or a Chrome user agent without `window.chrome`. Reported by the browser SDK in the event's `signals` bits; it can be faked,
 * so it only adds weight.
 *
 * @example
 * createEngine(ports, { ...registry, signals: [clientHeadless] }, settings);
 */
export const clientHeadless = defineSignal({
  name: "client_headless",
  weight: 25,
  replayable: false,
  detect: (draft) => ((draft.event.signals ?? 0) & clientSignals.headless) !== 0,
});
