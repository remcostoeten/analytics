import { defineSignal } from "../define";
import { hostingProvider } from "../utilities/hosting-asns";

/**
 * @name asnDatacenter
 * @description Requests from hosting-provider networks, which real visitors rarely use.
 *
 * @example
 * createEngine(ports, { ...registry, signals: [asnDatacenter] }, settings);
 */
export const asnDatacenter = defineSignal({
  name: "asn_datacenter",
  weight: 40,
  replayable: true,
  detect: (draft) => hostingProvider(draft.enrichment.network?.asn) !== null,
});
