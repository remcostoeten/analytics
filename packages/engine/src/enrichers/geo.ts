import { defineEnricher } from "../define";
import { edgeLocation, emptyLocation, mergeLocation } from "../utilities/edge-geo";
import { countryFromTimezone } from "../utilities/timezone-country";

/**
 * @name geo
 * @description Resolves the visitor's location. The MaxMind City lookup wins when it finds a city,
 * because edge headers put whole ISP ranges on one hub city; the edge headers fill the gaps. The
 * browser's timezone is the last fallback for the timezone and the country.
 *
 * @example
 * createEngine(ports, { ...registry, enrichers: [forwardedProxy, geo] }, settings);
 */
export const geo = defineEnricher({
  name: "geo",
  enrich: (draft, { ports }) => {
    const ip = draft.enrichment.client.ip;
    const lookedUp = ip ? ports.geo.lookup(ip).geo : emptyLocation;
    const edge = edgeLocation(draft.request.headers);
    const merged = lookedUp.city ? mergeLocation(lookedUp, edge) : mergeLocation(edge, lookedUp);
    const timezone = draft.event.context?.tz ?? null;
    return {
      geo: {
        ...merged,
        timezone: merged.timezone ?? timezone,
        country: merged.country ?? countryFromTimezone(timezone),
      },
    };
  },
});
