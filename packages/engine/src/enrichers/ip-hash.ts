import { defineEnricher } from "../define";
import { hashIp } from "../utilities/ip-hash";

/**
 * @name ipHash
 * @description Hashes the client IP with the daily salt of the day the batch was received. Runs
 * after `forwardedProxy` so a forwarded IP is the one hashed.
 *
 * @example
 * createEngine(ports, { ...registry, enrichers: [forwardedProxy, ipHash] }, settings);
 */
export const ipHash = defineEnricher({
  name: "ip-hash",
  enrich: async (draft, { ports, settings }) => {
    const { client } = draft.enrichment;
    return {
      client: {
        ...client,
        ipHash: await hashIp(ports.hasher, settings.ipSecret, client.ip, draft.receivedAt),
      },
    };
  },
});
