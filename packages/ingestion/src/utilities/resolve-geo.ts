import { type GeoData, extractGeoFromRequest } from "./geo.js";
import { lookupGeoFromMmdb } from "./geo-mmdb.js";
import { countryFromTimezone } from "./timezone-country.js";

type ReqLike = Parameters<typeof extractGeoFromRequest>[0];

function mergeGeo(base: GeoData, fallback: GeoData): GeoData {
	return {
		country: base.country ?? fallback.country,
		region: base.region ?? fallback.region,
		city: base.city ?? fallback.city,
		latitude: base.latitude ?? fallback.latitude,
		longitude: base.longitude ?? fallback.longitude,
		timezone: base.timezone ?? fallback.timezone,
		postalCode: base.postalCode ?? fallback.postalCode,
		continent: base.continent ?? fallback.continent,
	};
}

/**
 * Resolves the richest geo picture available from free sources. The MaxMind
 * City MMDB takes precedence when it resolves a city: edge headers (Vercel/
 * Cloudflare) collapse many ISP ranges onto a single hub city (e.g. all of
 * NL onto Amsterdam), while the MMDB resolves the actual municipality. Edge
 * headers fill whatever the MMDB left empty, and the client's IANA timezone
 * remains the last-resort country-level signal.
 */
export async function resolveGeo(
	req: ReqLike,
	ip: string | null,
	clientTimezone: string | null,
): Promise<GeoData> {
	const headerGeo = extractGeoFromRequest(req);
	const mmdbGeo = await lookupGeoFromMmdb(ip);

	let geo = mmdbGeo.city ? mergeGeo(mmdbGeo, headerGeo) : mergeGeo(headerGeo, mmdbGeo);

	if (!geo.timezone && clientTimezone) geo = { ...geo, timezone: clientTimezone };

	if (!geo.country) {
		const tzCountry = countryFromTimezone(clientTimezone);
		if (tzCountry) geo = { ...geo, country: tzCountry };
	}

	return geo;
}

export function extractClientTimezone(meta: unknown): string | null {
	if (!meta || typeof meta !== "object") return null;
	const timezone = (meta as Record<string, unknown>).timezone;
	return typeof timezone === "string" && timezone.length > 0 ? timezone : null;
}
