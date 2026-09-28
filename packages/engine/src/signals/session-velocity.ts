import { defineSignal } from "../define";

/**
 * @name sessionVelocity
 * @description Set by the session job, not at ingest: more than 30 pageviews a minute, or
 * near-identical gaps between events. The ingest stage never fires it; a rescore keeps it.
 *
 * @example
 * createEngine(ports, { ...registry, signals: [sessionVelocity] }, settings);
 */
export const sessionVelocity = defineSignal({
  name: "session_velocity",
  weight: 50,
  replayable: false,
  detect: () => false,
});
