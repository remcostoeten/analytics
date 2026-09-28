import { ok } from "@remcostoeten/analytics-shared/result";

import { defineStage } from "../define";

/**
 * @name enrichStage
 * @description Runs every registered enricher in order and merges the fields each returns into
 * the draft's enrichment; a later enricher can override an earlier one.
 *
 * @example
 * createEngine(ports, { stages: [enrichStage], signals: [], enrichers: [geoEnricher], dimensions: [] });
 */
export const enrichStage = defineStage({
  name: "enrich",
  rescores: false,
  run: async (draft, context) => {
    let enrichment = draft.enrichment;
    for (const enricher of context.registry.enrichers) {
      enrichment = {
        ...enrichment,
        ...(await enricher.enrich({ ...draft, enrichment }, context)),
      };
    }
    return ok({ ...draft, enrichment });
  },
});
