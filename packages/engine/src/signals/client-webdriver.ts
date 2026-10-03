import { clientSignals } from "@spoar/contract";

import { defineSignal } from "../define";

/**
 * @name clientWebdriver
 * @description `navigator.webdriver` was true in the browser. Reported by the browser SDK in the event's `signals` bits; it can be faked,
 * so it only adds weight.
 *
 * @example
 * createEngine(ports, { ...registry, signals: [clientWebdriver] }, settings);
 */
export const clientWebdriver = defineSignal({
  name: "client_webdriver",
  weight: 60,
  replayable: false,
  detect: (draft) => ((draft.event.signals ?? 0) & clientSignals.webdriver) !== 0,
});
