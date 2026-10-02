import { defineEnricher } from "../define";
import type { GeoPlace, Location } from "../ports";
import { edgeLocation, emptyLocation, mergeLocation } from "../utilities/edge-geo";
import { countryFromTimezone } from "../utilities/timezone-country";

function describedPlaces(places: GeoPlace[], location: Location) {
  const ids = new Set([location.cityId, location.regionId]);
  return places.filter((place) =>
    place.kind === "country" ? place.country === location.country : ids.has(place.id),
  );
}

/**
 * @name geo
 * @description Resolves the visitor's location. The MaxMind City lookup wins when it finds a city,
 * because edge headers put whole ISP ranges on one hub city; the edge headers fill the gaps. On a
 * secret-key request the edge headers describe the calling server, so they are skipped. The
 * browser's timezone is the last fallback for the timezone and the country. The names of the
 * MaxMind country, region and city the location ends up with go into `places`.
 *
 * @example
 * createEngine(ports, { ...registry, enrichers: [forwardedProxy, geo] }, settings);
 */
export const geo = defineEnricher({
  name: "geo",
  enrich: (draft, { ports }) => {
    const ip = draft.enrichment.client.ip;
    const record = ip ? ports.geo.lookup(ip) : null;
    const lookedUp = record?.geo ?? emptyLocation;
    const edge = draft.trusted ? emptyLocation : edgeLocation(draft.request.headers);
    const merged = lookedUp.city ? mergeLocation(lookedUp, edge) : mergeLocation(edge, lookedUp);
    const timezone = draft.event.context?.tz ?? null;
    return {
      geo: {
        ...merged,
        timezone: merged.timezone ?? timezone,
        country: merged.country ?? countryFromTimezone(timezone),
      },
      places: describedPlaces(record?.places ?? [], merged),
    };
  },
});
