import { geoLocales } from "@remcostoeten/analytics-contract";
import type { Nullable, Timestamp } from "@remcostoeten/analytics-shared/semantic";
import { Reader } from "mmdb-lib";
import type { AsnResponse, CityResponse } from "mmdb-lib";

import type { GeoLookup, GeoPlace, GeoRecord, PlaceKind, PlaceNames } from "../ports";

type Lookup<Record> = (ip: string) => Nullable<Record>;

type NamedRecord = { geoname_id: number; names: PlaceNames };

export type MaxmindGeo = GeoLookup & { builtAt: Timestamp };

function safely<Record>(lookup: Lookup<Record>): Lookup<Record> {
  return (ip) => {
    try {
      return lookup(ip);
    } catch {
      // mmdb-lib throws on a malformed address, which a forwarded header can carry.
      return null;
    }
  };
}

function placeNames(names: PlaceNames): PlaceNames {
  const found: PlaceNames = {};
  for (const locale of geoLocales) {
    const name = names[locale];
    if (name) found[locale] = name;
  }
  return found;
}

function place(
  kind: PlaceKind,
  country: Nullable<string>,
  record: Nullable<NamedRecord>,
): GeoPlace[] {
  if (!record || !country) return [];
  return [{ id: record.geoname_id, kind, country, names: placeNames(record.names) }];
}

function toRecord(city: Nullable<CityResponse>, asn: Nullable<AsnResponse>): GeoRecord {
  const subdivision = city?.subdivisions?.[0] ?? null;
  const country = city?.country?.iso_code ?? null;
  return {
    geo: {
      country,
      region: subdivision?.iso_code ?? subdivision?.names?.en ?? null,
      regionId: subdivision?.geoname_id ?? null,
      city: city?.city?.names?.en ?? null,
      cityId: city?.city?.geoname_id ?? null,
      postalCode: city?.postal?.code ?? null,
      timezone: city?.location?.time_zone ?? null,
      latitude: city?.location?.latitude ?? null,
      longitude: city?.location?.longitude ?? null,
      accuracyKm: city?.location?.accuracy_radius ?? null,
      continent: city?.continent?.code ?? null,
    },
    network: {
      asn: asn?.autonomous_system_number ?? null,
      asOrg: asn?.autonomous_system_organization ?? null,
    },
    places: [
      ...place("country", country, city?.country ?? null),
      ...place("region", country, subdivision),
      ...place("city", country, city?.city ?? null),
    ],
  };
}

/**
 * @name maxmindGeo
 * @description A `GeoLookup` over MaxMind City and ASN databases. It takes the file contents, not
 * paths, so the engine never touches the file system; the host reads the files. Each record
 * carries the GeoNames ids of the city and region, the accuracy radius of the coordinates, and
 * the names of the country, region and city in every locale the database has. `builtAt` is when MaxMind built the City
 * database. A malformed address gives an empty record.
 *
 * @example
 * const geo = maxmindGeo(readFileSync("GeoLite2-City.mmdb"), readFileSync("GeoLite2-ASN.mmdb"));
 * geo.lookup("81.2.69.160").geo.cityId; // 2643743
 */
export function maxmindGeo(city: Buffer, asn: Nullable<Buffer>): MaxmindGeo {
  const cityReader = new Reader<CityResponse>(city);
  const asnReader = asn ? new Reader<AsnResponse>(asn) : null;
  const findCity = safely((ip) => cityReader.get(ip));
  const findAsn = safely((ip) => asnReader?.get(ip) ?? null);
  return {
    lookup: (ip) => toRecord(findCity(ip), findAsn(ip)),
    builtAt: cityReader.metadata.buildEpoch.toISOString(),
  };
}
