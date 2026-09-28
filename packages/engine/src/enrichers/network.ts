import { defineEnricher } from "../define";

/**
 * @name network
 * @description The visitor's autonomous system number and organisation from the ASN database.
 *
 * @example
 * createEngine(ports, { ...registry, enrichers: [forwardedProxy, network] }, settings);
 */
export const network = defineEnricher({
  name: "network",
  enrich: (draft, { ports }) => {
    const ip = draft.enrichment.client.ip;
    return { network: ip ? ports.geo.lookup(ip).network : { asn: null, asOrg: null } };
  },
});
