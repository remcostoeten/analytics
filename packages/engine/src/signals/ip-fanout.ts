import { defineSignal } from "../define";

/**
 * @name ipFanout
 * @description Set by the session job, not at ingest: more than 20 visitor ids from one IP hash
 * in a day. The ingest stage never fires it; a rescore keeps it.
 *
 * @example
 * createEngine(ports, { ...registry, signals: [ipFanout] }, settings);
 */
export const ipFanout = defineSignal({
  name: "ip_fanout",
  weight: 40,
  replayable: false,
  detect: () => false,
});
