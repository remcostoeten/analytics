import { defineEnricher } from "../define";
import { edgeLocation, emptyLocation, mergeLocation } from "../utilities/edge-geo";
import { countryFromTimezone } from "../utilities/timezone-country";

/**
 * @name geo
 * @description Resolves the visitor's location. The edge headers Vercel or Cloudflare add win when
 * they name a country, so the host never has to open the MaxMind City database for them; without
 * them the City lookup answers. On a secret-key request the edge headers describe the calling
 * server, so they are skipped. The browser's timezone is the last fallback for the timezone and
 * the country.
 *
 * @example
 * createEngine(ports, { ...registry, enrichers: [forwardedProxy, geo] }, settings);
 */
export const geo = defineEnricher({
  name: "geo",
  enrich: (draft, { ports }) => {
    const ip = draft.enrichment.client.ip;
    const edge = draft.trusted ? emptyLocation : edgeLocation(draft.request.headers);
    const located = edge.country || !ip ? edge : mergeLocation(ports.geo.location(ip), edge);
    const timezone = draft.event.context?.tz ?? null;
    return {
      geo: {
        ...located,
        timezone: located.timezone ?? timezone,
        country: located.country ?? countryFromTimezone(timezone),
      },
    };
  },
});
