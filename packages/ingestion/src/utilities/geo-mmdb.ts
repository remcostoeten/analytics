import { type GeoData, emptyGeo } from "./geo.js";

type CityRecord = import("mmdb-lib").CityResponse;
type AsnRecord = import("mmdb-lib").AsnResponse;

type MmdbReader = {
	get(ip: string): CityRecord | null;
};

type AsnReader = {
	get(ip: string): AsnRecord | null;
};

export type NetworkData = {
	asn: number | null;
	asOrg: string | null;
};

let reader: MmdbReader | null | undefined;
let asnReader: AsnReader | null | undefined;

/**
 * Loads a MaxMind GeoLite2/GeoIP2 City database from GEOIP_MMDB_PATH.
 * Requires the optional `mmdb-lib` dependency; silently disabled when the
 * env var is unset or the module/database is unavailable.
 */
async function getReader(): Promise<MmdbReader | null> {
	if (reader !== undefined) return reader;

	const path = process.env.GEOIP_MMDB_PATH;
	if (!path) {
		reader = null;
		return reader;
	}

	try {
		const [{ Reader }, { readFile }] = await Promise.all([
			import("mmdb-lib"),
			import("node:fs/promises"),
		]);
		reader = new Reader<CityRecord>(await readFile(path));
	} catch (err) {
		console.error("[Geo] Failed to load MMDB database, IP lookup disabled:", err);
		reader = null;
	}

	return reader;
}

/**
 * Loads a MaxMind GeoLite2 ASN database from GEOIP_ASN_MMDB_PATH for
 * network/carrier insights. Same optional semantics as the City database.
 */
async function getAsnReader(): Promise<AsnReader | null> {
	if (asnReader !== undefined) return asnReader;

	const path = process.env.GEOIP_ASN_MMDB_PATH;
	if (!path) {
		asnReader = null;
		return asnReader;
	}

	try {
		const [{ Reader }, { readFile }] = await Promise.all([
			import("mmdb-lib"),
			import("node:fs/promises"),
		]);
		asnReader = new Reader<AsnRecord>(await readFile(path));
	} catch (err) {
		console.error("[Geo] Failed to load ASN MMDB database, ASN lookup disabled:", err);
		asnReader = null;
	}

	return asnReader;
}

export async function lookupNetworkFromMmdb(ip: string | null): Promise<NetworkData> {
	const empty: NetworkData = { asn: null, asOrg: null };
	if (!ip) return empty;

	const db = await getAsnReader();
	if (!db) return empty;

	try {
		const record = db.get(ip);
		if (!record) return empty;
		return {
			asn: record.autonomous_system_number ?? null,
			asOrg: record.autonomous_system_organization ?? null,
		};
	} catch {
		return empty;
	}
}

export async function lookupGeoFromMmdb(ip: string | null): Promise<GeoData> {
	if (!ip) return emptyGeo();

	const db = await getReader();
	if (!db) return emptyGeo();

	try {
		const record = db.get(ip);
		if (!record?.country?.iso_code) return emptyGeo();

		const subdivision = record.subdivisions?.[0];
		return {
			country: record.country.iso_code,
			region: subdivision?.iso_code ?? subdivision?.names?.en ?? null,
			city: record.city?.names?.en ?? null,
			latitude: record.location?.latitude ?? null,
			longitude: record.location?.longitude ?? null,
			timezone: record.location?.time_zone ?? null,
			postalCode: record.postal?.code ?? null,
			continent: record.continent?.code ?? null,
		};
	} catch {
		return emptyGeo();
	}
}
