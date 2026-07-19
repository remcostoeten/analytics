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
 * Resolves the richest geo picture available from free sources, in order:
 * edge headers (Vercel/Cloudflare), an optional self-hosted MaxMind MMDB,
 * and finally the client's IANA timezone as a country-level signal.
 */
export async function resolveGeo(
	req: ReqLike,
	ip: string | null,
	clientTimezone: string | null,
): Promise<GeoData> {
	let geo = extractGeoFromRequest(req);

	const incomplete = !geo.country || !geo.city || geo.latitude === null;
	if (incomplete) {
		geo = mergeGeo(geo, await lookupGeoFromMmdb(ip));
	}

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
