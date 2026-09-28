import { clientSignals } from "@remcostoeten/analytics-contract";

import { defineSignal } from "../define";

/**
 * @name clientNoInput
 * @description No pointer, key, touch or scroll input before the event, on a page that was never visible. Reported by the browser SDK in the event's `signals` bits; it can be faked,
 * so it only adds weight.
 *
 * @example
 * createEngine(ports, { ...registry, signals: [clientNoInput] }, settings);
 */
export const clientNoInput = defineSignal({
  name: "client_no_input",
  weight: 20,
  replayable: false,
  detect: (draft) => ((draft.event.signals ?? 0) & clientSignals.noInput) !== 0,
});
